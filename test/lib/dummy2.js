var debug = require('debug')('darkmagic_dummy2')

// used in tests, but sadly must reside here
module.exports = function dummy2(dummy) {
	debug('here')

	return 1
};