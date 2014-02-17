var debug = require('debug')('darkmagic_dummyCallbackAsync');
module.exports = function(dummy, callback) {
	debug('here');
	process.nextTick(function () {
		callback(null, 10);
	});
};