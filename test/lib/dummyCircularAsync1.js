var debug = require('debug')('darkmagic_dummyCircularAsync1')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircularAsync2, callback) {
	callback(null, 81)
}