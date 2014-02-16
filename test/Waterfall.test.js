var Waterfall = require('../lib/Waterfall')
var assert = require('assert')

describe('Waterfall', function () {

	var waterfall

	before(function () {

		var count = 0
		function fnWork(callback) {
			callback(null, ++count)
		}

		waterfall = new Waterfall([  fnWork, fnWork, fnWork ])
	})


	it('executes a series of functions', function (done) {

		waterfall.run(function(err, results) {
			if (err) return done (err)

			assert.deepEqual(results, [1, 2, 3])
			done()
		})
	})
})