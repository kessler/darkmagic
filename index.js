module.exports.Container = require('./lib/Container.js');
module.exports.inject = function(file) {
	var container = new Container();

	var main;

	if (typeof file === 'string')
		main = require(file);
	else if (typeof file !== 'function')
		throw new Error('invalid parameter, must provide a filename or a function');

	container.inject(main);
};