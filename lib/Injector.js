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
	this.explicitRealModule = options.explicitRealModule

	var realModule = this._getRealModule()

	this._initSearchPaths(path.dirname(realModule.filename))

	var injectorDependency = this.newDependencyObject('$injector')
	injectorDependency.requireId = '$darkMagicInjector'
	injectorDependency.object = this

	this._cacheDependency(injectorDependency, this)

	this.autoInjectLocalFactories = options.autoInjectLocalFactories === undefined ? true : options.autoInjectLocalFactories
	this.autoInjectExternalFactories = options.autoInjectExternalFactories === undefined ? false: options.autoInjectExternalFactories
}

Injector.prototype.inject = function(target, callback) {

	if (typeof target !== 'function')
		throw new Error('can only inject functions')

	var realModule = this._getRealModule()

	this._inject(target, realModule, new Dependency(target.name || 'anonymous'), [], this._handleError(callback))
}

Injector.prototype._inject = function(target, realModule, targetDependency, ancestors, callback) {

	debug('_inject [%s] (%s)', targetDependency.name, typeof target)

	if (typeof target !== 'function')
		throw new Error('can only inject functions')

	var params = this._getFunctionParameters(target)

	debug('%s has %d params', targetDependency.name, params.length)

	// if there are no parameters take the short path
	if (params.length === 0) {
		invokeTarget(this, target, targetDependency, false, callback)()
		return
	}

	var _hasCallbackParam = hasCallbackParam(params)

	if (_hasCallbackParam)
		params.pop()
	
	var args = []
	var order = []
	var waterfall = new Waterfall(args)

	// resolve params
	for (var i = 0; i < params.length; i++) {

		var dependencyName = params[i].name

		if (ILLEGAL.indexOf(dependencyName) > -1)
			throw new Error('illegal parameter name ' + dependency)

		var dependency = this.getDependencyByName(dependencyName)

		var exists = dependency !== undefined

		if (exists) {
			var artifact
			
			try {
				artifact = dependency.load(realModule, targetDependency)
			} catch(e) {
				return callback(e)
			}

			args.push(artifact)
			debug('dependency %s exists', dependencyName)
		} else {
			debug('dependency %s is new', dependencyName)			
			dependency = this.newDependencyObject(dependencyName)			
			order.push(i)
			args.push(injectFunctor(this, realModule, ancestors, dependency, targetDependency))
		}
	}

	debug('running waterfall [%s]', order)
	// after all the dependencies have been resolved, invoke the current dependency	
	waterfall.run(order, invokeTarget(this, target, targetDependency, _hasCallbackParam, callback))
}

function injectFunctor(injector, realModule, ancestors, dependency, parentDependency) {
	return function (callback) {

		var dependencyName = dependency.name

		debug('injectFunctor(%s => %s)', dependencyName, parentDependency.name)

		var artifact 

		try {
			artifact = dependency.load(realModule, parentDependency)			
		} catch (e) {			
			return callback(e)
		}
			
		if (!injector.getDependencyByName(dependencyName)) {
			injector.emit('new dependency', dependency, artifact)
		}

		// missing dependency?
		if (!artifact) {
			if (dependency.isOptional) callback()
			else callback(
				new Error(
					util.format('[%s%s] is Missing dependency [%s]',
						parentDependency.name,
						parentDependency.isFactory ? '(...)' : '', dependencyName)))

			return
		}

		if (dependency.isInjectable()) {
			debug('dependency %s is injectable', dependencyName)

			// circular dependencyName
			debug('%s ancestors: [%s]', dependencyName, ancestors)			
			if (ancestors && ancestors.indexOf(dependencyName) > -1) {
				callback(new Error(
					util.format('circular dependency detected between %s and %s, dependency chain was: %s',
						dependencyName, parentDependency.name, util.inspect(ancestors))))
			} else {
				ancestors = ancestors || []
				ancestors.push(dependencyName)
			}

			injector._inject(artifact, realModule, dependency, ancestors, callback)
		} else {
			debug('dependency %s not injectable', dependencyName)
			callback(null, artifact)
		}
	}
}

function invokeTarget(injector, target, dependency, hasCallbackParam, callback) {
	return function invokeTargetFunctor(err, results) {
		debug('invoking %s, callbackParam: %s', dependency.name, hasCallbackParam)

		var resolve = resolveDependencyCallback(injector, dependency, callback)

		if (err)
			return resolve(err);

		// invoke the artifact
		if (hasCallbackParam) {
			results.push(resolve)
			target.apply(null, results)
		} else {
			try {
				var returnValue = target.apply(null, results)
				resolve(null, returnValue)
			} catch (e) {
				resolve(e)
			}
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
			injector._cacheDependency(dependency, result)			
		}

		next(null, result)
	}
}

function hasCallbackParam(params) {
	return params[params.length - 1].name === 'callback'
}

Injector.prototype.addDependency = function (dependency) {
	debug('addDependency() %s', dependency.name)
	this._cacheDependency(dependency, dependency.load(this._getRealModule(), null))
}

Injector.prototype.removeDependency = function (dependency) {
	debug('removeDependency() %s', dependency.name)
	delete require.cache[dependency.requireId]
}

Injector.prototype.getDependencyByName = function(name) {
	var cache = require.cache
	
	for (var requireId in cache) {
		var dependency = cache[requireId].darkmagic
		if (dependency && dependency.name === name) return dependency
	}
}

Injector.prototype.addSearchPath = function (p) {
	debug('adding search path %s', p)
	this._searchPaths.unshift(p)
}

Injector.prototype.newDependencyObject = function (name) {
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

	debug('injector initial search paths: [%s]', this._searchPaths)
}

Injector.prototype._isDirectory = function(dir) {
	return fs.existsSync(dir) && fs.statSync(dir).isDirectory()
}

Injector.prototype._cacheDependency = function (dependency, artifact) {
	debug('caching %s with requireId: %s', dependency.name, dependency.requireId)
	require.cache[dependency.requireId] = { exports: artifact, darkmagic: dependency }
}

Injector.prototype._getRealModule = function () {
	// use the thing that required darkmagic
	if (this.explicitRealModule) {		
		debug('using explicitRealModule')
		return this.explicitRealModule
	} else if (module.parent && module.parent.parent) {		
		debug('using module.parent.parent')
		return module.parent.parent
	} else {		
		debug('using require.main')
		return require.main
	}
}

Injector.prototype._handleError = function (userCallback) {
	var injector = this

	return function handler(err) {	
		if (err) {
			if (userCallback) {
				debug('invoking error callback')
				userCallback(err)
			} else {
				debug('throwing error')			
				throw err
			}	
		}
	}
}
