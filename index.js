var Dependency = module.exports.Dependency = require('./lib/Dependency.js')
var Injector = module.exports.Injector = require('./lib/Injector.js');
var packageJson = require('./package.json')
var debug = require('debug')('darkmagic')
var inspect = require('util').inspect

var injector

module.exports.Injector = Injector
module.exports.inject = inject
module.exports.version = packageJson.version

function inject(target, overrides, callback) {

	if (typeof overrides === 'function') {	
		callback = overrides
		overrides = undefined
	}

	if (!injector) {
		injector = newInjector(overrides, callback)
	}

	if (typeof target === 'string')
		target = require(target)
	else if (typeof target !== 'function')
		throw new Error('invalid parameter, must provide a filename or a function')

	injector.inject(target, callback)

	return injector
}

function newInjector(overrides, callback) {
	var injector = new Injector()

	try {
		injector.addOverrides(overrides)
	} catch (e) {
		if (callback) return callback(e)
		throw e
	}

	return injector
}
