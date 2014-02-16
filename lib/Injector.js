var debug = require('debug')('Injector')
var Waterfall = require('./Waterfall.js')
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

	var injectorDependency = new Dependency('$injector')
	injectorDependency._injector = this

	injectorDependency.load = function () {
		return this._injector;
	}

	this.add(injectorDependency)
}

Injector.prototype.inject = function(target, context) {

	if (typeof target !== 'function')
		throw new Error('can only inject functions')

	this._inject(target, module.parent || require.main, new Dependency(target.name || 'anonymous'), [])
}

Injector.prototype._inject = function(target, realModule, targetDependency, ancestors, callback) {

	if (typeof target !== 'function')
		throw new Error('can only inject functions')

	var params = this._getFunctionParameters(target)

	debug('injecting %s [%s] with %d params', targetDependency.name, typeof target, params.length)

	// if there are no parameters take the short path
	if (params.length === 0) {
		//process.nextTick(invokeTarget(this, target, context, false, callback))

		invokeTarget(this, target, context, targetDependency, false, callback)()
		return
	}

	var _hasCallbackParam = hasCallbackParam(params)

	if (_hasCallbackParam)
		params.pop()

	var waterfall = new Waterfall()

	// resolve params
	for (var i = 0; i < params.length; i++) {
		var dependencyName = params[i].name;
		var dependency = this._registry[dependencyName]
		var isNewDependency = dependency === undefined

		if (isNewDependency) {
			dependency = new Dependency(dependencyName)
		}

		waterfall.work.push(injectFunctor(this, realModule, ancestors, dependency, targetDependency))
	}

	waterfall.run(invokeTarget(this, target, context, targetDependency, _hasCallbackParam, callback))
}

function injectFunctor(injector, realModule, ancestors, dependency, parentDependency) {
	return function (callback) {
		var dependencyName = dependency.name

		var artifact = dependency.load(realModule, injector._searchPaths)

		if (!artifact) {
			if (dependency.isOptional) callback()
			else callback(new Error('missing dependency ' + dependencyName))

			return
		}

		var exists = injector._registry[dependencyName] !== undefined

		if (exists) {
			debug('dependency %s exists', dependencyName)
		} else {
			debug('dependency %s is new', dependencyName)
		}

		if (dependency.isFactory) {
			debug('dependency %s is a factory', dependencyName)

			if (ancestors && ancestors.indexOf(dependencyName) > -1) {
				throw new Error(
					util.format('circular dependency detected between %s and %s, dependency chain was: %s',
						dependencyName, parentDependency.name, util.inspect(ancestors)))
			} else {
				ancestors = ancestors || []
				ancestors.push(dependencyName)
			}

			injector._inject(artifact, realModule, dependency, ancestors, callback)
		} else {
			callback(null, artifact)
		}
	}
}

function invokeTarget(injector, target, context, dependency, hasCallbackParam, callback) {
	return function invokeTargetFunctor(err, results) {
		debug('invoking %s, callbackParam: %s', dependency.name, hasCallbackParam)

		var resolve = resolveDependencyCallback(injector, dependency, callback || noopWithError)

		if (hasCallbackParam) {
			results.push(resolve)
			target.apply(context, results)
		} else {
			resolve(null, target.apply(context, results))
		}
	}
}

function resolveDependencyCallback(injector, dependency, next) {
	return function resolveFunctor(err, result) {
		debug('resolved %s', dependency.name)
		// not sure this is the right thing to do ...
		if (err) {
			return next(err)
		}

		if (dependency.isFactory && result) {
			// this dependency is a factory that resolved successfully,
			// save the results of the invocation for next time.
			dependency.isFactory = false
			require.cache[dependency.requireId] = { exports: result }
			injector._registry[dependency.name] = dependency
		}

		next(null, result)
	}
}

function hasCallbackParam(params) {
	return params[params.length - 1].name === 'callback'
}

Injector.prototype.add = function (dependency) {
	this._registry[dependency.name] = dependency;
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

function noopWithError(err, results) {
	if (err) throw err
}
