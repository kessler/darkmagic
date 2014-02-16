var debug = require('debug')('Injector')
var CountingSignaller = require('./CountingSignaller.js')
var Dependency = require('./Dependency.js')
var path = require('path')
var fs = require('fs')
var esprima = require('esprima')
var util = require('util')
var assert = require('assert')

module.exports = Injector

function Injector() {
	this._registry = {}
	this._initSearchPaths()
}

Injector.prototype.inject = function(target, context, _realModule /* internal */, depName, _callback /* internal */) {

	var targetName = target.name || depName || 'anonymous'

	if (typeof target !== 'function') {
		debug('injecting %s [%s]', targetName, typeof target)
		return target
	}

	_realModule = _realModule || module.parent || require.main

	var params = this._getFunctionParameters(target)

	debug('injecting %s [%s] with %d params', targetName, typeof target, params.length)

	// if there are no parameters take the short path
	if (params.length === 0) {
		process.nextTick(invokeTarget(target, targetName, context, args, _callback))
		return
	}

	var args = new Array(params.length)

	// the signaller is used by a resolved dependency to
	// signal that it is ready (countDown)
	var signaller = new CountingSignaller(params.length)

	if (hasCallback(params)) {
		params.pop()
		args[args.length - 1] = _callback
		signaller.once('signal', invokeTarget(target, targetName, context, args))

		// at this point if callback is the only parameter then params.length will be zero (since we poped it) and signaller will fire a signal
		signaller.countDown()
	} else {
		signaller.once('signal', invokeTarget(target, targetName, context, args, _callback))
	}

	// resolve params
	for (var i = 0; i < params.length; i++) {
		var name = params[i].name
		var dependency = this._registry[name]
		var isNewDependency = dependency === undefined

		if (isNewDependency) {
			debug('dependency %s is new', name)
			dependency = new Dependency(name)
		} else {
			debug('dependency %s exists', name)
		}

		var artifact = dependency.load(_realModule, this._searchPaths)

		if (!artifact) {
			if (dependency.isOptional) signaller.countDown()
			else throw new Error('missing dependency ' + name)
		}

		var resolveDependencyCallback = resolveDependencyCallbackFactory(this._registry, signaller, args, i, dependency, isNewDependency)

		// existing dependencies were already injected and are ready to use
		if (dependency.isFactory && isNewDependency) {
			this.inject(artifact, null, _realModule, name, resolveDependencyCallback)
		} else {
			resolveDependencyCallback(null, artifact)
		}
	}
}

function invokeTarget(target, targetName, context, args, _callback) {
	return function invokeTargetFunctor() {
		debug('invoking %s', targetName)
		if (_callback)
			_callback(null, target.apply(context, args))
		else
			target.apply(context, args)
	}
}

function resolveDependencyCallbackFactory(registry, signaller, args, index, dependency, isNewDependency) {
	return function resolveFunctor(err, resolved) {
		debug('resolving %s', dependency.name)
		// not sure this is the right thing to do ...
		if (err) {
			throw err
		}

		args[index] = resolved

		if (dependency.isFactory && isNewDependency && resolved) {
			// this dependency is a factory that resolved successfully,
			// save the results of the invocation for next time.
			require.cache[dependency.requireId] = { exports: resolved }
			registry[dependency.name] = dependency
		}

		signaller.countDown()
	}
}

function hasCallback(params) {
	return params[params.length - 1].name === 'callback'
}

Injector.prototype.add = function (name, dependency) {
	this._registry[name] = dependency;
}

Injector.prototype.remove = function (name) {
	var dependency = this._registry[name]
	if (dependency) {
		delete this._registry[name]
		delete require.cache[dependency.requireId]
	}
}

Injector.prototype.getDependency = function(name) {
	return this._registry[name]
}

Injector.prototype.addSearchPath = function (path) {
	this._searchPaths.unshift(path)
}

Injector.prototype._getFunctionParameters = function (f) {

	var parsed = esprima.parse('__f__f(' + f.toString() + ')')

	var parsedFunction = parsed.body[0].expression.arguments[0]

	if (parsedFunction && parsedFunction.params && parsedFunction.params.length > 0)
		return parsedFunction.params

	return []
}

Injector.prototype._initSearchPaths = function () {

	this._searchPaths = []

	if (__dirname) this.addSearchPath(__dirname)

	var rootDir = this._rootDir = path.dirname(require.main.filename)

	var lib1 = path.resolve(rootDir, 'lib')
	var lib2 = path.resolve(rootDir, '../lib')

	if (this._isDirectory(lib1)) {

		this.addSearchPath(lib1)

	} else if (this._isDirectory(lib2)) {

		this.addSearchPath(lib2)
	}
}

Injector.prototype._isDirectory = function(dir) {
	return fs.existsSync(dir) && fs.statSync(dir).isDirectory()
}