var debug = require('debug')('Dependency')
var path = require('path')
var Module = require('module')

module.exports = Dependency

function Dependency(name) {
	this.name = name
	this.requireId = undefined
	this.isLocal = false
	this.isFactory = false
	this.isOptional = name.length > 0 && name[name.length - 1] === '_'
}

var EMPTY = []

Dependency.prototype.load = function (realModule, searchPaths) {
	if (this.requireId)
		return realModule.require(this.requireId)

	searchPaths = searchPaths || EMPTY

	var artifact
	var name = this.name

	try {
		var dashedName = this._dashify(name)
		debug('trying require(\'%s\') ', name)
		// first try naive require
		artifact = realModule.require(dashedName)
		this.requireId = dashedName
		debug('loaded %s using require(\'%s\')', name, dashedName)

	} catch (e) {

		if (e.code !== 'MODULE_NOT_FOUND')
			throw e

		// try search paths
		for (var x = 0; x < searchPaths.length; x++) {

			var dir = searchPaths[x]

			var depPath = path.resolve(dir, name)

			debug('trying require(\'%s\')', depPath)

			try {
				this.requireId = Module._resolveFilename(depPath, realModule)
				artifact = realModule.require(this.requireId)
				this.isLocal = true

				debug('loaded %s using require(\'%s\')', name, this.requireId)
				break

			} catch (e) {

				if (e.code !== 'MODULE_NOT_FOUND')
					throw e
			}
		}
	}

	this.isFactory = typeof artifact === 'function'

	return artifact
}

// Dependency.prototype._transform = function(name) {
// 	if (name.length > 0) {

// 		if (name[0] === name[0].toUpperCase()) {
// 			debug('need to implement, but for now, do nothing, everything should still function properly...')
// 		} else {
// 			return this._dashify(name)
// 		}
// 	}
// }

Dependency.prototype._dashify = function(name) {
	if (name.length === 0) return name

	var result = name[0]

	for (var i = 1; i < name.length; i++) {

		if (name[i] === name[i].toUpperCase()) {
			result += '-' + name[i].toLowerCase()
		} else {
			result += name[i]
		}
	}

	return result
}