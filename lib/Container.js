var util = require('util');
var path = require('path');
var fs = require('fs');
var debug = require('debug')('Container');
var esprima = require('esprima');
var CountingSignaller = require('./CountingSignaller.js');

module.exports = Container;

function Container(deps, searchPaths) {
	// the dependencies are not kept in the registry, we use the module system for that
	// registry is only used to track metadata
	this._registry = {};
	this._initSearchPaths();
	this._autoInjectFunction = 'flameInject';
}



/*
	inject stuff to a target function using its arguments as the names of the dependencies.

	The first attempt to load a dependency is to naively require it by its name,
	if that fails the container will try to look for it in its search paths.

	- dealing with sync vs async injection and initialization
	- resolved dependencies will be auto injected if:
		- module is local and exports a single function or
		- module exports function called flameInject
*/
Container.prototype.inject = function(target, context, realModule, cb) {
	debug('injecting %s, %s, %s, %s', target, context, realModule, cb);

	var self = this;
	var realModule = realModule || module.parent || require.main;

	// dont inject something that is not a function
	if (typeof target !== 'function')
		return cb ? cb (null, value) : value;

	// reuse the same array for the arguments themselves, rename to indicate
	// the real meaning.
	var params = this._getFunctionParameters(target);
	var args = new Array(params.length);

	debug('params: %s', util.inspect(params));

	var callback = params.pop();

	if (callback && callback.name === 'callback') {
		debug('injection has callback');

		// this dependency will return its product via callback.
		// if this inject call is recursive we want to report it back
		// via the main cb, otherwise use a noop throw error callback
		if (cb)
			args[args.length - 1] = cb;
		else
			args[args.length - 1] = noopThrowErrorCB;

	} else if (callback) {
		// its not a callback so return it to params
		params.push(callback);
		callback = undefined;
	}

	var signaller = new CountingSignaller(0);

	// process the requested dependencies and inject if needed
	// this loop updates the array in place (but using a different name)
	for (var i = 0; i < params.length; i++) {

		var name = params[i].name;
		debug('resolving %s', name);

		var metadata = this._registry[name];

		var dependency;

		if (metadata) {

			debug('%s is in registry', name);
			dependency = realModule.require(metadata.requireId);

		} else {

			debug('%s is a new dependency', name);
			this._registry[name] = metadata = new DependencyMetadata(name);
			// _loadDependency will try different ways of loading the code.
			dependency = this._loadDependency(metadata, realModule);
		}

		// dependency not found
		if (!dependency) {
			if (name[name.length - 1] !== '_') {
				throw new Error('missing dependency [' + name + ']');
			} else {
				// optional dependency so replace with undefined
				args[i] = undefined;
				continue;
			}

		// determine if the dependency needs to be injected
		} else if (typeof dependency === 'function') {
			debug('dep %s is a function', name);
			reinject(this, signaller, context, realModule, args, i, dependency);
		} else if (typeof dependency[this._autoInjectFunction] === 'function') {
			debug('dep %s.%s is a function', name, this._autoInjectFunction);
			reinject(this, signaller, context, realModule, args, i, dependency[this._autoInjectFunction]);
		} else {
			debug('dep %s type is %s', name, typeof dependency);
			args[i] = dependency;
		}
	}

	if (signaller.count > 0) {

		signaller.once('signal', function () {
			debug('got signal');
			target.apply(context, args);
		});
	} else {

		return target.apply(context, args);;
	}
};

function reinject(container, signaller, context, realModule, args, index, fn) {
	debug('reinjecting %s', fn.toString());

	// TODO i'm stuck on synchronous callback vs async one....

	args[index] = container.inject(fn, context, realModule, function(err, dep) {

		// throw here?
		if (err)
			throw err;

		args[index] = dep;

		signaller.countDown();
		console.log(util.inspect(signaller))
	});

	if (args[index] === undefined) {
		signaller.countUp();
	}
}

/*
	load a new dependency
*/
Container.prototype._loadDependency = function(metadata, realModule) {
	var dependency;
	var name = metadata.name;

	try {
		debug('trying to require %s', name);
		// first try naive require
		dependency = realModule.require(name);
		metadata.requireId = name;
		debug('dependency %s was require()d directly', name);

	} catch (e) {

		if (e.code !== 'MODULE_NOT_FOUND')
			throw e;

		// try search paths
		for (var x = 0; x < this._searchPaths.length; x++) {

			var dir = this._searchPaths[x];

			var depPath = path.resolve(dir, name);

			debug('trying %s', depPath);

			try {
				dependency = realModule.require(depPath);
				metadata.requireId = depPath;
				metadata.isLocal = true;

				debug('dependency %s require()d using %s', name, depPath);
				break;

			} catch (e) {
				if (e.code !== 'MODULE_NOT_FOUND')
					throw e;
			}
		}
	}

	return dependency;
};


Container.prototype.add = function (name, value) {
	var dep = this._keys[name];

	if (dep) {
		var message = util.format('dependency %s was already to this container, current: [%s] new: [%s]', name, util.inspect(dep), util.inspect(value));
		throw new Error(message);
	}

	this._keys[name] = value;
};

Container.prototype.addSearchPath = function (path) {
	this._searchPaths.push(path);
};

Container.prototype._getFunctionParameters = function (f) {

	if (typeof f !== 'function')
		throw new Error('must provide a function as an argument');

	var parsed = esprima.parse('__f__f(' + f.toString() + ')');

	var parsedFunction = parsed.body[0].expression.arguments[0];

	if (parsedFunction && parsedFunction.params && parsedFunction.params.length > 0)
		return parsedFunction.params;

	return [];
};

Container.prototype._initSearchPaths = function () {

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

Container.prototype._isDirectory = function (dir) {
	return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
};

function DependencyMetadata(name, requireId, local) {
	this.name = name;
	this.requireId = requireId;
	this.isLocal = local;
}

function noopThrowErrorCB(err) {
	if (err)
		throw err;
}