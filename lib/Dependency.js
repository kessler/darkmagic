var debug = require('debug')('darkmagic_Dependency')
var path = require('path')
var Module = require('module')
var util = require('util')

module.exports = Dependency

function Dependency(name) {
	this.name = name
	this.requireId = undefined
	this.isLocal = false
	this.isFactory = false
	this.isOptional = name.length > 0 && name[name.length - 1] === '_'
	this.isClass = false

	// TODO: potential bug here?
	if (this.isOptional && name.length > 1)
		this.name = name.substr(0, name.length - 1)

	this.autoInject = false
	this.autoInjectLocalFactories = true
	this.autoInjectExternalFactories = true

	// usually a reference to the array of the injector's searchPath
	// this is slightly risky, but its private api
	// on the other hand this is suppose to reduce memory footprint
	// so i'm not really sure if its a good or bad thing
	// just a reminder to myself that pushing to this array will
	// push to searchPath of the injector
	this._searchPaths = []
	this.object = undefined
}

Dependency.prototype.load = function (realModule, parentDependency) {

	debug('loading [%s]', this.name)

	if (this.object) {
		debug('%s is a custom dependency')
		return this.object
	}

	if (this.requireId) {
		debug('%s is loaded with requireId %s', this.name, this.requireId)
		var artifact = realModule.require(this.requireId)

		if (!artifact) {
			throw new Error('this module has a requireId but it was not loaded properly')			
		}

		return artifact
	}

	var artifact
	var name = this.name
	var dashedName = this._dashify(name)

	try {

		debug('try require(\'%s\') ', name)
		// first try naive require
		artifact = realModule.require(dashedName)
		this.requireId = dashedName
		debug('OK require(\'%s\')', name, dashedName)

	} catch (e) {

		if (e.code !== 'MODULE_NOT_FOUND')
			throw e
		else if (!this._isModuleSpecificError(dashedName, e))
			throw e

		debug('fail require(\'%s\')', dashedName)

		var notFoundErrors = 0

		var searchPaths

		if (realModule.filename)
			searchPaths = [path.dirname(realModule.filename)].concat(this._searchPaths)
		else
			searchPaths = this._searchPaths

		// try search paths
		for (var x = 0; x < searchPaths.length; x++) {

			var dir = searchPaths[x]

			var depPath = path.resolve(dir, name)

			debug('try require(\'%s\')', depPath)

			try {
				this.requireId = Module._resolveFilename(depPath, realModule)
				artifact = realModule.require(this.requireId)
				
				this.isLocal = true

				debug('OK require(\'%s\')', this.requireId)
				break

			} catch (e) {

				if (e.code === 'MODULE_NOT_FOUND' && this._isModuleSpecificError(depPath, e)) {
					debug('fail require(\'%s\')', depPath)
					notFoundErrors++
				} else {
					debug('an error has occurred while try to load %s', depPath)
					throw e
				}
			}
		}

		// dep is not optional and we failed to find it in all the search paths
		if (!this.isOptional && notFoundErrors > 0 && notFoundErrors === searchPaths.length)
			throw new Error(util.format('[%s%s] is Missing dependency [%s]', parentDependency.name, parentDependency.isFactory ? '(...)' : '', this.name))
	}

	if (artifact && artifact.$darkmagic) {
		artifact.$darkmagic.dependency(this, parentDependency);
	} else {
		this.isFactory = typeof artifact === 'function'

		// TODO isInjectable refactor point
		if (this.isFactory && artifact.name) {

			if (artifact.name.substr(0, 6) === 'inject') {
				this.autoInject = true
			} else if (artifact.name.substr(0, 10) === 'dontInject') {
				this.isFactory = false
			} else if (artifact.name[0] === artifact.name[0].toUpperCase() && isNaN(artifact.name[0])) {
				debug('[%s] exports a class named [%s]', this.name, artifact.name)
				this.isClass = true
			}
		}
	}

	return artifact
}

//TODO need to refactor this, its spread here and in injectFunctor.
// there is ambiguity as to who decides what: injector has a policy
// but it should be overridable at dependency level if injector
// permits such behavior
Dependency.prototype.isInjectable = function () {
	if (this.autoInject) return true;

	return !this.isClass && this.isFactory &&
		((this.isLocal && this.autoInjectLocalFactories) ||
			(!this.isLocal && this.autoInjectExternalFactories))
}

Dependency.prototype.searchPaths = function(searchPaths) {
	this._searchPaths = searchPaths
}

Dependency.prototype._dashify = function(name) {
	if (name.length === 0) return name

	var result = name[0]

	for (var i = 1; i < name.length; i++) {

		if (name[i] === name[i].toUpperCase() && isNaN(name[i]) && name[i] !== '_') {
			result += '-' + name[i].toLowerCase()
		} else {
			result += name[i]
		}
	}

	return result
}

//TODO: make this check more robust
Dependency.prototype._isModuleSpecificError = function (module, e) {
	return e.toString().indexOf(module) > -1
}