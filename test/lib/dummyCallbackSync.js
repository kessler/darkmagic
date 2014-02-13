var debug = require('debug')('dummyCallback');
var util = require('util');

// used in tests, but sadly must reside here
module.exports = function (dummy, callback) {

	debug(util.inspect(arguments));
	callback(null, 3);
};