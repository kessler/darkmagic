var debug = require('debug')('Injector');
var CountingSignaller = require('./CountingSignaller.js');
var DependencyMetadata = require('./DependencyMetadata.js');
var path = require('path');
var fs = require('fs');
var esprima = require('esprima');
var util = require('util');
var assert = require('assert');

module.exports = Injector;

function Injector() {
	this._metadataRepo = {};
	this._initSearchPaths();
}

Injector.prototype.inject = function(target, context, _realModule /* internal */, depName, _callback /* internal */) {

	var targetName = target.name || depName || 'anonymous';

	if (typeof target !== 'function') {
		debug('injecting %s [%s]', targetName, typeof target);
		return target;
	}

	_realModule = _realModule || module.parent || require.main;

	var params = this._getFunctionParameters(target);

	debug('injecting %s [%s], params: %s', targetName, typeof target, util.inspect(params));

	// if there are no parameters take the short path
	if (params.length === 0) {
		process.nextTick(invokeTarget(target, targetName, context, args, _callback));
		return;
	}

	var args = new Array(params.length);

	// the signaller is used by a resolved dependency to
	// signal that it is ready (countDown)
	var signaller = new CountingSignaller(params.length);

	if (hasCallback(params)) {
		params.pop();
		args[args.length - 1] = _callback;
		signaller.once('signal', invokeTarget(target, targetName, context, args));
		signaller.countDown();
	} else {
		signaller.once('signal', invokeTarget(target, targetName, context, args, _callback));
	}

	// resolve params
	for (var i = 0; i < params.length; i++) {
		var name = params[i].name;
		var metadata = this._metadataRepo[name];
		var isNewDependency = metadata === undefined;
		var dependency;

		if (isNewDependency) {
			debug('dependency %s is new', name);
			metadata = new DependencyMetadata(name);
		} else {
			debug('dependency %s exists', name);
		}

		dependency = metadata.load(_realModule, this._searchPaths);

		if (!dependency) {
			if (metadata.isOptional) signaller.countDown();
			else throw new Error('missing dependency ' + name);
		}

		var resolveDependencyCallback = resolveDependencyCallbackFactory(this._metadataRepo, signaller, args, i, metadata, isNewDependency)

		// existing dependencies were already injected and are ready to use
		if (metadata.isFactory && isNewDependency) {
			this.inject(dependency, null, _realModule, name, resolveDependencyCallback);
		} else {
			resolveDependencyCallback(null, dependency);
		}
	}
};

function invokeTarget(target, targetName, context, args, _callback) {
	return function invokeTargetFunctor() {
		debug('invoking %s', targetName);
		if (_callback)
			_callback(null, target.apply(context, args));
		else
			target.apply(context, args);
	}
}

function resolveDependencyCallbackFactory(metadataRepo, signaller, args, index, metadata, isNewDependency) {
	return function resolveFunctor(err, resolved) {
		debug('resolving %s', metadata.name);
		// not sure this is the right thing to do ...
		if (err) {
			throw err;
		}

		args[index] = resolved;

		if (metadata.isFactory && isNewDependency && resolved) {
			// this dependency is a factory that resolved successfully,
			// save the results of the invocation for next time.
			require.cache[metadata.requireId] = { exports: resolved };
			metadataRepo[metadata.name] = metadata;
		}

		signaller.countDown();
	}
}

function hasCallback(params) {
	return params[params.length - 1].name === 'callback';
}

Injector.prototype._getFunctionParameters = function (f) {

	var parsed = esprima.parse('__f__f(' + f.toString() + ')');

	var parsedFunction = parsed.body[0].expression.arguments[0];

	if (parsedFunction && parsedFunction.params && parsedFunction.params.length > 0)
		return parsedFunction.params;

	return [];
};

Injector.prototype.addSearchPath = function (path) {
	this._searchPaths.unshift(path);
};

Injector.prototype._initSearchPaths = function () {

	this._searchPaths = [];

	if (__dirname) this.addSearchPath(__dirname);

	var rootDir = this._rootDir = path.dirname(require.main.filename);

	var lib1 = path.resolve(rootDir, 'lib');
	var lib2 = path.resolve(rootDir, '../lib');

	if (this._isDirectory(lib1)) {

		this.addSearchPath(lib1);

	} else if (this._isDirectory(lib2)) {

		this.addSearchPath(lib2);
	}
};

Injector.prototype._isDirectory = function(dir) {
	return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
};