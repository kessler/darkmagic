process.env.DEBUG = 'Injector,dummy*,DependencyMetadata'

var path = require('path')
var Injector = require('../lib/Injector.js')
var assert = require('assert')
var util = require('util')
var Module = require('module')

describe('Dependency Injector', function () {
	var injector

	before(function () {

		injector = new Injector()
		injector.addSearchPath(path.join(__dirname, 'lib'))
	})

	it('invokes', function (done) {
		injector.inject(function invoking() {
			done()
		})
	})

	describe('injects', function () {
		it('dependencies from core modules', function (done) {
			injector.inject(function coreModules(http, net) {
				assert.strictEqual(http, require('http'))
				assert.strictEqual(net, require('net'))
				done()
			})
		})

		it('dependencies from node modules', function (done) {

			injector.inject(function nodeModules(eyes, esprima) {
				assert.strictEqual(eyes, require('eyes'))
				assert.strictEqual(esprima, require('esprima'))
				done()
			})
		})

		it('dependencies from search paths', function (done) {
			injector.inject(function searchPaths(dummy, dummy2) {
				assert.strictEqual(dummy, 2)
				assert.strictEqual(dummy2, 1)
				done()
			})
		})

		it('dependencies from all over the place', function (done) {

			injector.inject(function (http, eyes, dummy, dummyCallbackAsync) {
				assert.strictEqual(dummy, 2)
				assert.strictEqual(http, require('http'))
				assert.strictEqual(eyes, require('eyes'))
				assert.strictEqual(dummyCallbackAsync, 4)
				done()
			})
		})

		it('recursively', function (done) {

			injector.inject(function (dummy2, dummy) {
				assert.strictEqual(dummy2, 1)
				assert.strictEqual(dummy, 2)
				done()
			})
		})

		it('with no dependencies and no return values (dependency invoke only)', function (done) {
			injector.inject(function noDeps(dummyNoReturn) {
				done()
			})
		})

		// check sync and async
		describe('a dependency via a callback if dependency is a factory and has a last parameter called "callback"', function () {

			it('synchronously with single param', function (done) {
				injector.inject(function sync(dummyCallbackSync) {
					assert.strictEqual(dummyCallbackSync, 3)
					done()
				})
			})

			it('synchronously with multiple params', function (done) {
				injector.inject(function sync(dummyCallbackSyncMulti) {
					assert.strictEqual(dummyCallbackSyncMulti, 9)
					done()
				})
			})

			it('asynchronously with a single param', function (done) {

				injector.inject(function async(dummyCallbackAsync) {
					assert.strictEqual(dummyCallbackAsync, 4)
					done()
				})
			})

			it('asynchronously with multiple params', function (done) {
				injector.inject(function async(dummyCallbackAsyncMulti) {
					assert.strictEqual(dummyCallbackAsyncMulti, 10)
					done()
				})
			})

			it('resolves a hierarchy of callbacks', function () {
				injector.inject(function hierarchy(dummyHierarchy) {
					assert.strictEqual(dummyHierarchy.dummyCallbackAsyncMulti, require('./lib/dummyCallbackAsyncMulti'))
					assert.strictEqual(dummyHierarchy.dummyCallbackAsyncMulti, 10)

					assert.strictEqual(dummyHierarchy.dummyCallbackSyncMulti, require('./lib/dummyCallbackSyncMulti'))
					assert.strictEqual(dummyHierarchy.dummyCallbackSyncMulti, 9)
				})
			})
		})
	})

	describe('use the module system', function () {
		it('factory invocation are only executed once, subsequent injections do not invoke the factory again', function (done) {
			// dummy cache is a module that returns a function
			// that function gives the test access to module internal
			// calls counter.
			// each invocation of require('dummyCache') will increament
			// the calls counter, thus if the result cache would have
			// broken, dummyCache() would return something higher than 1
			injector.inject(function noDeps(dummyCache) {
				var calls = dummyCache()
				assert.strictEqual(calls, 1)

				injector.inject(function noDeps1(dummyCache) {
					var calls = dummyCache()
					assert.strictEqual(calls, 1)

					injector.inject(function noDeps2(dummyCache) {
						var calls = dummyCache()
						assert.strictEqual(calls, 1)
						done()
					})
				})
			})
		})

		it('makes subsequent require() calls return the result of the factory, rather than the exported factory function', function (done) {
			injector.inject(function noDeps(dummyCache) {
				var actual = require('./lib/dummyCache')
				assert.strictEqual(actual, dummyCache)
				done()
			})
		})
	})

	describe('provides api to manually add and remove dependencies', function () {
		it('using a remove method', function () {
			injector.inject(function remove(dummy) {
				var metadata = injector.getMetadata('dummy')
				assert.ok(metadata)

				injector.remove('dummy')

				assert.strictEqual(require.cache[metadata.requireId], undefined)
				assert.strictEqual(injector.getMetadata('dummy'), undefined)
			})
		})
	})

	describe('injector.prototype._getFunctionParameters', function () {
		it('extracts the parameters from a function\'s signature', function () {
			function f(a, b, c) {
			}

			var actual = Injector.prototype._getFunctionParameters(f)
			var expected = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ]

			assert.strictEqual(actual.length, 3)

			for (var i = 0; i < actual.length; i++) {
				assert.strictEqual(actual[i].name, expected[i].name)
			}
		})

		it('throws an error if argument is not a function', function () {
			assert.throws(function () {
				Injector.prototype._getFunctionParameters({})
			})
		})

		it('parses anonymous functions', function () {
			var actual = Injector.prototype._getFunctionParameters(function(a, b, c) {})

			var expected = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ]

			assert.strictEqual(actual.length, 3)

			for (var i = 0; i < actual.length; i++) {
				assert.strictEqual(actual[i].name, expected[i].name)
			}
		})

		it('returns an empty array if function has no parameters', function () {
			function f() {}

			var actual = Injector.prototype._getFunctionParameters(f)

			assert.deepEqual(actual, [])
		})
	})
})