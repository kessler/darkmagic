var debug = require('debug')('darkmagic_dummyCallbackSync');
var util = require('util');

// used in tests, but sadly must reside here
module.exports = function (callback) {
	debug('here');
	callback(null, 3);
};