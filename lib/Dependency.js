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

var path = require('path')

Dependency.prototype.load = function (realModule, parentDependency) {

	debug('loading "%s"', this.name)

	var artifact

	if (this.object) {
		debug('"%s" is a custom dependency', this.name)
		return this.object
	}

	if (this.requireId) {
		debug('"%s" is loaded with requireId "%s"', this.name, this.requireId)
		artifact = realModule.require(this.requireId)

		if (!artifact) {
			throw new Error('this module has a requireId but it was not loaded properly')			
		}

		return artifact
	}

	var searchResults = this._init(realModule)
	
	debug('found %d possible dependencies', searchResults.length)

	if (searchResults.length === 0) {
		if (this.isOptional) {
			return
		} else {
			throw new Error(util.format('"%s%s" is Missing dependency "%s"', parentDependency.name, parentDependency.isFactory ? '(...)' : '', this.name))
		}
	}

	if (searchResults.length > 1) {
		throw new Error(util.format('multiple dependencies found for %s: %s, name collision must be resolved', this._name, pluck(searchResults, 'name')))
	}
	
	artifact = searchResults[0].artifact

	this.requireId = searchResults[0].name
	this.isLocal = searchResults[0].isLocal

	if (artifact && artifact.$darkmagic) {
		artifact.$darkmagic.dependency(this, parentDependency);
	} else {
		this.isFactory = typeof artifact === 'function'
		
		// TODO isInjectable refactor point
		if (this.isFactory && artifact.name) {
			if (require.cache.hasOwnProperty(this.requireId) && require.cache[this.requireId].darkmagic) {
				this.isFactory = false				
			} else if (artifact.name.substr(0, 6) === 'inject') {
				this.autoInject = true
			} else if (artifact.name.substr(0, 10) === 'dontInject') {
				this.isFactory = false
			} else if (artifact.name[0] === artifact.name[0].toUpperCase() && isNaN(artifact.name[0])) {
				debug('"%s" exports a class named "%s"', this.name, artifact.name)
				this.isClass = true
			}
		}
	}

	return artifact
}

Dependency.prototype._init = function (realModule) {

	var artifacts = []

	var artifact = this._loadExternal(realModule)

	if (artifact) {
		artifacts.push(artifact)
	}

	var searchPaths = this._searchPaths

	debug('trying %d local search paths', searchPaths.length)

	// try search paths
	for (var x = 0; x < searchPaths.length; x++) {

		var dir = searchPaths[x]

		var depPath = path.resolve(dir, this.name)

		artifact = this._loadLocal(realModule, depPath)

		if (artifact) {
			artifacts.push(artifact)
		}
	}

	return artifacts
}

Dependency.prototype._loadExternal = function (realModule) {
	
	var name = this.name
	var dashedName = this._dashify(name)
	var label = dashedName === name ? name : dashedName + ' [' + name + ']'

	try {

		debug('try require(\'%s\')', label)
		// first try naive require
		var artifact = realModule.require(dashedName)

		debug('OK require(\'%s\')', label)

		return  {
			name: dashedName,
			artifact: artifact,
			isLocal: false
		}

	} catch (e) {
		// catch module not found exceptions but only for the module we are try to load
		if (e.code === 'MODULE_NOT_FOUND' && this._isModuleSpecificError(dashedName, e)) {
			debug('fail require(\'%s\')', dashedName)
		} else {
			debug('an error has occurred while trying to load "%s"', dashedName)
			throw e
		}
	}
}

Dependency.prototype._loadLocal = function (realModule, depPath) {
	
	debug('try require(\'%s\')', depPath)

	try {
		var name = Module._resolveFilename(depPath, realModule)

		var artifact = realModule.require(name)
		
		debug('OK require(\'%s\')', name)
		
		return {
			artifact: artifact,
			name: name,
			isLocal: true
		}

	} catch (e) {

		if (e.code === 'MODULE_NOT_FOUND' && this._isModuleSpecificError(depPath, e)) {
			debug('fail require(\'%s\')', depPath)
		} else {
			debug('an error has occurred while trying to load "%s"', depPath)
			throw e
		}
	}
}

//TODO need to refactor this, its spread here and in injectFunctor.
// there is ambiguity as to who decides what: injector has a policy
// but it should be overridable at dependency level if injector
// permits such behavior, this is terrible!
Dependency.prototype.isInjectable = function () {
	debug('isInjectable()')
	if (this.autoInject) return true;

	debug('this.isClass=%s this.isFactory=%s (this.isLocal && this.autoInjectLocalFactories)=%s (!this.isLocal && this.autoInjectExternalFactories)=%s'
		, this.isClass, this.isFactory, this.isLocal && this.autoInjectLocalFactories, !this.isLocal && this.autoInjectExternalFactories)

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


function pluck (arr, property) {
	var results = []

	for (var x = 0; x < arr.length; x++) {
		results.push (arr[x][property])
	}

	return results
}