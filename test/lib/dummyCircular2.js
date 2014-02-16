var debug = require('debug')('dummyCircular2')

// used in tests, but sadly must reside here
module.exports = function dc2(dummyCircular1) {
	debug('here')
	return 98;
};