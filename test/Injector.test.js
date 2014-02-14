var Injector = require('../lib/Injector.js');
var assert = require('assert');
var util = require('util');



describe('Dependency Injector', function () {
	var injector;

	before(function () {

		injector = new Injector();
		injector.addSearchPath('./lib');
	})

	describe('inject', function () {
		it('injects dependencies from core modules', function (done) {
			injector.inject(function coreModules(http, net) {
				assert.strictEqual(http, require('http'));
				assert.strictEqual(net, require('net'));
				done();
			});
		});

		it('injects dependencies from node modules', function (done) {

			injector.inject(function nodeModules(eyes, esprima) {
				assert.strictEqual(eyes, require('eyes'));
				assert.strictEqual(esprima, require('esprima'));
				done();
			});
		});

		it('injects dependencies from search paths', function (done) {
			injector.inject(function searchPaths(dummy, dummy2) {

				assert.strictEqual(dummy, 2);
				assert.strictEqual(dummy2, 1);
				done();
			});
		});

		it('injects dependencies from all over the place', function (done) {

			injector.inject(function (http, eyes, dummy) {
				assert.strictEqual(dummy, 2);
				assert.strictEqual(http, require('http'));
				assert.strictEqual(eyes, require('eyes'));
				done();
			});
		});

		it('inject recursively', function (done) {

			injector.inject(function (dummy2, dummy) {
				assert.strictEqual(dummy2, 1);
				assert.strictEqual(dummy, 2);
				done();
			});
		});

		it('injects with no dependencies and no return values', function (done) {

			injector.inject(function noDeps(dummyNoReturn) {
				done();
			});
		});

		it('invoking', function (done) {

			injector.inject(function invoking() {
				done();
			});
		});


		// check sync and async
		describe('a dependency via a callback if dependency is a factory and has a last parameter called "callback"', function () {

			it('synchronously with single param', function (done) {
				injector.inject(function sync(dummyCallbackSync) {
					assert.strictEqual(dummyCallbackSync, 3);
					done();
				});
			});

			it('synchronously with multiple params', function (done) {
				injector.inject(function sync(dummyCallbackSyncMulti) {
					assert.strictEqual(dummyCallbackSyncMulti, 9);
					done();
				});
			});

			it('asynchronously with a single param', function (done) {

				injector.inject(function async(dummyCallbackAsync) {
					assert.strictEqual(dummyCallbackAsync, 4);
					done();
				});
			});

			it('asynchronously with multiple params', function (done) {

				injector.inject(function async(dummyCallbackAsyncMulti) {
					assert.strictEqual(dummyCallbackAsyncMulti, 10);
					done();
				});
			});
		});
	});

	describe('injector.prototype._getFunctionParameters', function () {
		it('extracts the parameters from a function\'s signature', function () {
			function f(a, b, c) {
			}

			var actual = Injector.prototype._getFunctionParameters(f);
			var expected = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ];

			assert.strictEqual(actual.length, 3);

			for (var i = 0; i < actual.length; i++) {
				assert.strictEqual(actual[i].name, expected[i].name);
			}
		});

		it('throws an error if argument is not a function', function () {
			assert.throws(function () {
				Injector.prototype._getFunctionParameters({});
			});
		});

		it('parses anonymous functions', function () {
			var actual = Injector.prototype._getFunctionParameters(function(a, b, c) {});

			var expected = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ];

			assert.strictEqual(actual.length, 3);

			for (var i = 0; i < actual.length; i++) {
				assert.strictEqual(actual[i].name, expected[i].name);
			}
		});

		it('returns an empty array if function has no parameters', function () {
			function f() {}

			var actual = Injector.prototype._getFunctionParameters(f);

			assert.deepEqual(actual, []);
		});
	});
});