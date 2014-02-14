var debug = require('debug')('dummyCallbackSync');
var util = require('util');

// used in tests, but sadly must reside here
module.exports = function (callback) {
	debug('here');
	callback(null, 3);
};