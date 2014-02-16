var debug = require('debug')('dummyCircular4')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircular5) {
	debug('here')
	return 93;
};