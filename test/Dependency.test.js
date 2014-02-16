process.env.DEBUG = 'dummy*,Dependency'

var Dependency = require('../lib/Dependency.js')
var assert = require('assert')
var path = require('path')

var libPath = path.join(__dirname, 'lib')

describe('Dependency', function () {

	describe('tries to load a dependency', function () {
		it('loads from core modules', function () {
			var dep = new Dependency('http').load(module)
			assert.strictEqual(dep, require('http'))
		})

		it('loads from node (npm) modules', function () {
			var dep = new Dependency('eyes').load(module)
			assert.strictEqual(dep, require('eyes'))
		})

		it('loads from fs paths', function () {
			var dep = new Dependency('dummy').load(require.main, [ libPath ])
			assert.strictEqual(dep, require('./lib/dummy'))
		})

		it('modules with train-case names are specified using a camelCased version of their name (trainCase)', function () {
			var dep = new Dependency('findPort').load(module)
			assert.strictEqual(dep, require('find-port'))
		})
	})

	describe('can dashify names (internal api)', function () {

		it('takes a camelCase string and dashify it to camel-case', function () {
			assert.strictEqual(Dependency.prototype._dashify('dbStuff'), 'db-stuff')
		})

		it('doesnt change the string if no upper case letters are found', function () {
			assert.strictEqual(Dependency.prototype._dashify('dbstuff'), 'dbstuff')
		})
	})
})