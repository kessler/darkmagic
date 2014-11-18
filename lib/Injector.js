var debug = require('debug')('darkmagic_Injector')
var Waterfall = require('./Waterfall.js')
var Dependency = require('./Dependency.js')
var path = require('path')
var fs = require('fs')
var esprima = require('esprima')
var util = require('util')
var assert = require('assert')
var EventEmitter = require('events').EventEmitter

module.exports = Injector

/* words that cannot be used as parameters */
var ILLEGAL = [ 'toString' ]

util.inherits(Injector, EventEmitter)
function Injector(options) {
	EventEmitter.call(this)

	options = options || {}
	this._registry = {}

	var realModule
	
	if (module.parent && module.parent.parent) {
		realModule = module.parent.parent
		debug('using module.parent.parent')
	} else {
		realModule = require.main
		debug('using require.main')
	}

	this._initSearchPaths(path.dirname(realModule.filename))

	var injectorDependency = new Dependency('$injector')
	injectorDependency._injector = this

	injectorDependency.load = function () {
		return this._injector
	}

	this.add(injectorDependency)

	this.explicitRealModule = options.explicitRealModule

	this.autoInjectLocalFactories = options.autoInjectLocalFactories === undefined ? true : options.autoInjectLocalFactories
	this.autoInjectExternalFactories = options.autoInjectExternalFactories === undefined ? false: options.autoInjectExternalFactories
}

Injector.prototype.inject = function(target, context) {

	if (typeof target !== 'function')
		throw new Error('can only inject functions')

	var realModule

	// use the thing that required darkmagic
	if (this.explicitRealModule) {
		realModule = this.explicitRealModule
		debug('using explicitRealModule')
	} else if (module.parent && module.parent.parent) {
		realModule = module.parent.parent
		debug('using module.parent.parent')
	} else {
		realModule = require.main
		debug('using require.main')
	}

	this._inject(target, context, realModule, new Dependency(target.name || 'anonymous'), [])
}

Injector.prototype._inject = function(target, context, realModule, targetDependency, ancestors, callback) {

	debug('_inject [%s] (%s)', targetDependency.name, typeof target)

	if (typeof target !== 'function')
		throw new Error('can only inject functions')

	var params = this._getFunctionParameters(target)

	debug('%s has %d params', targetDependency.name, params.length)

	// if there are no parameters take the short path
	if (params.length === 0) {
		invokeTarget(this, target, context, targetDependency, false, callback)()
		return
	}

	var _hasCallbackParam = hasCallbackParam(params)

	if (_hasCallbackParam)
		params.pop()

	var waterfall = new Waterfall()

	// resolve params
	for (var i = 0; i < params.length; i++) {

		var dependencyName = params[i].name

		if (ILLEGAL.indexOf(dependencyName) > -1)
			throw new Error('illegal parameter name ' + dependency)

		var dependency = this._registry[dependencyName]
		var isNewDependency = dependency === undefined

		if (isNewDependency) {
			dependency = this.newDependency(dependencyName)
		}

		// context only works for top level dependencies
		waterfall.work.push(injectFunctor(this, null, realModule, ancestors, dependency, targetDependency))
	}

	waterfall.run(invokeTarget(this, target, context, targetDependency, _hasCallbackParam, callback))
}

function injectFunctor(injector, context, realModule, ancestors, dependency, parentDependency) {
	return function (callback) {

		var dependencyName = dependency.name

		debug('injectFunctor(%s => %s)', dependencyName, parentDependency.name)

		var artifact = dependency.load(realModule, parentDependency)

		if (!artifact) {
			if (dependency.isOptional) callback()
			else callback(
				new Error(
					util.format('[%s%s] is Missing dependency [%s]',
						parentDependency.name,
						parentDependency.isFactory ? '(...)' : '', dependencyName)))

			return
		}

		var exists = injector._registry[dependencyName] !== undefined

		if (exists) {
			debug('dependency %s exists', dependencyName)
		} else {
			debug('dependency %s is new', dependencyName)
			injector.emit('new dependency', dependency, artifact)
		}

		if (dependency.isInjectable()) {
			debug('dependency %s is injectable', dependencyName)

			// circular dependency
			if (ancestors && ancestors.indexOf(dependencyName) > -1) {
				throw new Error(
					util.format('circular dependency detected between %s and %s, dependency chain was: %s',
						dependencyName, parentDependency.name, util.inspect(ancestors)))
			} else {
				ancestors = ancestors || []
				ancestors.push(dependencyName)
			}

			injector._inject(artifact, context, realModule, dependency, ancestors, callback)
		} else {
			debug('dependency %s not injectable', dependencyName)
			callback(null, artifact)
		}
	}
}

function invokeTarget(injector, target, context, dependency, hasCallbackParam, callback) {
	return function invokeTargetFunctor(err, results) {
		debug('invoking %s, callbackParam: %s', dependency.name, hasCallbackParam)

		var resolve = resolveDependencyCallback(injector, dependency, callback || noopWithError)

		if (err)
			return resolve(err);

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

		if (dependency.isInjectable() && result) {
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

Injector.prototype.addSearchPath = function (p) {
	debug('adding search path %s', p)
	this._searchPaths.unshift(p)
}

Injector.prototype.newDependency = function (name) {
	var dependency = new Dependency(name)
	dependency.autoInjectLocalFactories = this.autoInjectLocalFactories
	dependency.autoInjectExternalFactories = this.autoInjectExternalFactories
	dependency.searchPaths(this._searchPaths)

	return dependency
}

Injector.prototype._getFunctionParameters = function (f) {

	var parsed = esprima.parse('__f__f(' + f.toString() + ')')

	var parsedFunction = parsed.body[0].expression.arguments[0]

	if (parsedFunction && parsedFunction.params && parsedFunction.params.length > 0)
		return parsedFunction.params

	return []
}

Injector.prototype._initSearchPaths = function (rootDir) {
	this._searchPaths = []

	var lib1 = path.resolve(rootDir, 'lib')

	// TODO: dont remember why I did this, looks redundant or otherwise obsolete...
	var lib2 = path.resolve(rootDir, '..', 'lib')
	
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
