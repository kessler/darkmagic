var debug = require('debug')('dummy2');

// used in tests, but sadly must reside here
module.exports = function (dummy) {
	debug(1);

	return 1;
};