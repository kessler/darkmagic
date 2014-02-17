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

	this.autoInjectLocalFactories = true
	this.autoInjectExternalFactories = true
	this._searchPaths = []
}

Dependency.prototype.load = function (realModule, parentDependency) {

	debug('loading [%s]', this.name)

	if (this.requireId)
		return realModule.require(this.requireId)

	var artifact
	var name = this.name

	try {
		var dashedName = this._dashify(name)

		debug('try require(\'%s\') ', name)
		// first try naive require
		artifact = realModule.require(dashedName)
		this.requireId = dashedName
		debug('OK require(\'%s\')', name, dashedName)

	} catch (e) {

		if (e.code !== 'MODULE_NOT_FOUND')
			throw e

		debug('fail require(\'%s\')', dashedName)

		var notFoundErrors = 0

		// try search paths
		for (var x = 0; x < this._searchPaths.length; x++) {

			var dir = this._searchPaths[x]

			var depPath = path.resolve(dir, name)

			debug('try require(\'%s\')', depPath)

			try {
				this.requireId = Module._resolveFilename(depPath, realModule)
				artifact = realModule.require(this.requireId)
				this.isLocal = true

				debug('OK require(\'%s\')', this.requireId)
				break

			} catch (e) {

				if (e.code !== 'MODULE_NOT_FOUND') {
					throw e
				} else {
					debug('fail require(\'%s\')', depPath)
					notFoundErrors++
				}
			}
		}

		if (notFoundErrors > 0 && notFoundErrors === this.searchPaths.length)
			throw new Error(util.format('[%s%s] is Missing dependency [%s]', parentDependency.name, parent.isFactory ? '(...)' : '', this.name))
	}

	this.isFactory = typeof artifact === 'function'

	if (this.isFactory && artifact.name && artifact.name[0] === artifact.name[0].toUpperCase() && isNaN(artifact.name[0])) {
		debug('[%s] exports a class named [%s]', this.name, artifact.name)
		this.isClass = true
	}

	return artifact
}

Dependency.prototype.isInjectable = function () {
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

		if (name[i] === name[i].toUpperCase() && isNaN(name[i])) {
			result += '-' + name[i].toLowerCase()
		} else {
			result += name[i]
		}
	}

	return result
}