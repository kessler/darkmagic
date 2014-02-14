var debug = require('debug')('dummyCallbackAsync');
module.exports = function(dummy, callback) {
	debug('here');
	process.nextTick(function () {
		callback(null, 10);
	});
};