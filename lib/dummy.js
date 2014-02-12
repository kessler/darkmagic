var debug = require('debug')('dummy');

// used in tests, but sadly must reside here
module.exports = function () {
	debug(1);
	return 2;
};