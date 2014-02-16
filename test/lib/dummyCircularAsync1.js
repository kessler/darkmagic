var debug = require('debug')('dummyCircularAsync1')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircularAsync2, callback) {
	callback(null, 81)
}