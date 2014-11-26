var assert = require('assert')
var index = require('../index')
var packageJson = require('../package.json')

describe('index', function () {
	var injector

	it('exposes module version to runtime', function () {
		assert.ok(index.version, packageJson.version)
	})

	it('inject() with overrides', function (done) {
		index.inject(function (fs) {
			assert.strictEqual(fs, 1)
			done()
		}, {
			fs: 1
		})
	})
})



