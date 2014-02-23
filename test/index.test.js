var assert = require('assert')
var index = require('../index')
var packageJson = require('../package.json')

var injector
var toClear

function b4() {
	toClear = []
	injector = new Injector({ explicitRealModule: module })
	injector.addSearchPath(path.join(__dirname, 'lib'))
	injector.on('new dependency', function (dependency) {
		toClear.push(dependency.requireId)
	})
}

function after() {
	for (var i = 0; i < toClear.length; i++) {
		for (var x in require.cache) {
			if (require.cache[x].id === toClear[i].requireId) {
				delete require.cache[x]
			}
		}
	}

	debug('------------------ done ------------------')
}

describe('index', function () {

	it('exposes module version to runtime', function () {
		assert.ok(index.version, packageJson.version)
	})

	it('inject()', function (done) {
		index.inject(function (fs) {
			assert.strictEqual(fs, require('fs'))
			done()
		})
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



