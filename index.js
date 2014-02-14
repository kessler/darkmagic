var Injector = module.exports.Injector = require('./lib/Injector.js');
module.exports.inject = function(file) {
	var injector = new Injector();

	if (typeof file === 'string')
		file = require(file);
	else if (typeof file !== 'function')
		throw new Error('invalid parameter, must provide a filename or a function');

	injector.inject(file);
};