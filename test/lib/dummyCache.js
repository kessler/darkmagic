var debug = require('debug')('darkmagic_dummyCache');

var calls = 0;

// used in tests, but sadly must reside here
module.exports = function () {
	calls++;
	debug('here');

	return function callsAccessor() {
		return calls;
	};
};