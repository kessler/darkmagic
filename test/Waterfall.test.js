var Waterfall = require('../lib/Waterfall')
var assert = require('assert')

describe('Waterfall', function () {

	var waterfall

	beforeEach(function () {

		var count = 0
		function fnWork(callback) {
			callback(null, ++count)
		}

		waterfall = new Waterfall([ 0, fnWork, 2, fnWork, fnWork ])
	})


	it('executes functions in predefined positions in an array', function (done) {
		waterfall.run([1, 3, 4], function(err, results) {
			if (err) return done (err)

			assert.deepEqual(results, [ 0, 1, 2, 2, 3 ])
			done()
		})
	})
})