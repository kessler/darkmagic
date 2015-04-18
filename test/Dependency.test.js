var Dependency = require('../lib/Dependency.js')
var assert = require('assert')
var path = require('path')

var libPath = path.join(__dirname, 'lib')

var parent = new Dependency('parent')

describe('Dependency', function () {

	describe('loads', function () {
		it('from core modules', function () {
			var dep = new Dependency('http').load(module, parent)
			assert.strictEqual(dep, require('http'))
		})

		it('from node (npm) modules', function () {
			var dep = new Dependency('eyes').load(module, parent)
			assert.strictEqual(dep, require('eyes'))
		})

		it('from fs paths', function () {
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

	describe('throws', function () {
		it('an error if an artifact is not found', function () {
			assert.throws(function () {
				new Dependency('moomoopiepie').load(module, parent)
			})
		})

		it('nothing if an artifact is not found but is marked optional', function () {

			assert.doesNotThrow(function () {
				new Dependency('moomoopiepie_').load(module, parent)
			})
		})
	})

	describe('can dashify names (internal api)', function () {

		it('takes a camelCase string and dashify it to camel-case', function () {
			assert.strictEqual(Dependency.prototype._dashify('dbStuff'), 'db-stuff')
		})

		it('doesnt change the string if no upper case letters are found', function () {
			assert.strictEqual(Dependency.prototype._dashify('dbs_tuff'), 'dbs_tuff')
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

	it('will load an object if it has one', function () {
		var dep = new Dependency('object')
		dep.object = 1

		assert.strictEqual(dep.load(), 1)
	})

	it('will throw an error if more than one dependency can be loaded with provided name', function () {
		assert.throws(function () {
			var dependency = new Dependency('util')
			dependency.searchPaths.push(path.join(__dirname, 'lib'))
			dependency.load(module, parent)
		})
	})
})