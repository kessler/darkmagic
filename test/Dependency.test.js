process.env.DEBUG = 'dummy*,Dependency'

var Dependency = require('../lib/Dependency.js')
var assert = require('assert')
var path = require('path')

var libPath = path.join(__dirname, 'lib')

var parent = new Dependency('parent')

describe('Dependency', function () {

	describe('tries to load a dependency', function () {
		it('loads from core modules', function () {
			var dep = new Dependency('http').load(module, parent)
			assert.strictEqual(dep, require('http'))
		})

		it('loads from node (npm) modules', function () {
			var dep = new Dependency('eyes').load(module, parent)
			assert.strictEqual(dep, require('eyes'))
		})

		it('loads from fs paths', function () {
			var dep = new Dependency('dummy')

			dep.searchPaths([ libPath ])
			var result = dep.load(require.main)
			assert.strictEqual(result, require('./lib/dummy'))
		})

		it('modules with train-case names are specified using a camelCased version of their name (trainCase)', function () {
			var dep = new Dependency('findPort').load(module, parent)
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

	it('marks dependencies as optional if they end with', function () {
		var dep = new Dependency('http_')
		assert.ok(dep.isOptional)
		assert.strictEqual(dep.name, 'http')
	})

	it('can be customized from inside the loading module if it exports a magic interface', function () {
		var dep = new Dependency('dummyMagicExport')

		dep.searchPaths([ libPath ])

		assert.ok(!dep.visited)

		dep.load(module, parent)

		assert.ok(dep.visited)
	})
})