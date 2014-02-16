var debug = require('debug')('dummyCircular3')

// used in tests, but sadly must reside here
module.exports = function dc1(dummyCircular4) {
	debug('here')
	return 91;
};