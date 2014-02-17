var debug = require('debug')('darkmagic_dummy');

// used in tests, but sadly must reside here
module.exports = function () {
	debug('here');
	return 2;
};