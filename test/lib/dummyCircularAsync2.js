var debug = require('debug')('dummyCircularAsync2')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircularAsync1, callback) {
	callback(null, 82)
}