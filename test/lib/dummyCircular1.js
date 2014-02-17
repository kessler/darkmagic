var debug = require('debug')('darkmagic_dummyCircular1')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircular2) {
	debug('here')
	return 99;
};