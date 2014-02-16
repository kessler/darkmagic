var debug = require('debug')('dummyCircular5')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircular3) {
	debug('here')
	return 92;
};