var Container = require('../lib/Container.js');
var assert = require('assert');
var util = require('util');



describe('Dependency Container', function () {
	var container;

	before(function () {

		container = new Container();
		container.addSearchPath('./lib');
	})

	describe('inject', function () {
		it('injects dependencies from core modules', function (done) {

			container.inject(function (http) {
				assert.strictEqual(http, require('http'));
				done();
			});
		});

		it('injects dependencies from node modules', function (done) {

			container.inject(function (eyes) {
				assert.strictEqual(eyes, require('eyes'));
				done();
			});
		});

		it('injects dependencies from search paths', function (done) {

			container.inject(function (dummy) {
				assert.strictEqual(dummy, 2);
				done();
			});
		});

		it('injects dependencies from all over the place', function (done) {

			container.inject(function (http, eyes, dummy) {
				assert.strictEqual(dummy, 2);
				assert.strictEqual(http, require('http'));
				assert.strictEqual(eyes, require('eyes'));
				done();
			});
		});

		it('inject recursively', function (done) {

			container.inject(function (dummy2) {
				assert.strictEqual(dummy2, 1);
				done();
			});
		});


		// check sync and async
		describe('uses a last parameter named "callback" as actual callback to obtain the injected dependency', function () {

			it('knows how to handle synchronous callbacks', function (done) {

				container.inject(function (dummyCallbackSync) {
					assert.strictEqual(dummyCallbackSync, 3);
					done();
				});
			});

			it('knows how to handle asynchronous callbacks', function (done) {

				container.inject(function (dummyCallbackAsync) {
					assert.strictEqual(dummyCallbackAsync, 4);
					done();
				});
			});

		});

		it('injects with no dependencies and no return values', function (done) {


			container.inject(function (dummyNoReturn) {

				done();
			});
		});
	});

	describe('Container.prototype._getFunctionParameters', function () {
		it('extracts the parameters from a function\'s signature', function () {
			function f(a, b, c) {
			}

			var actual = Container.prototype._getFunctionParameters(f);
			var expected = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ];

			assert.strictEqual(actual.length, 3);

			for (var i = 0; i < actual.length; i++) {
				assert.strictEqual(actual[i].name, expected[i].name);
			}
		});

		it('throws an error if argument is not a function', function () {
			assert.throws(function () {
				Container.prototype._getFunctionParameters({});
			});
		});

		it('parses anonymous functions', function () {
			var actual = Container.prototype._getFunctionParameters(function(a, b, c) {});

			var expected = [ { name: 'a' }, { name: 'b' }, { name: 'c' } ];

			assert.strictEqual(actual.length, 3);

			for (var i = 0; i < actual.length; i++) {
				assert.strictEqual(actual[i].name, expected[i].name);
			}
		});

		it('returns an empty array if function has no parameters', function () {
			function f() {}

			var actual = Container.prototype._getFunctionParameters(f);

			assert.deepEqual(actual, []);
		});
	});
});