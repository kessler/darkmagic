var debug = require('debug')('darkmagic_dummyCallbackAsync');
module.exports = function(callback) {
	debug('here');
	process.nextTick(function () {
		callback(null, 4);
	});
};