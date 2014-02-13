module.exports.Container = require('./lib/Container.js');
module.exports.inject = function(file) {
	var container = new Container();
	var main = require(file);
	container.inject(main);
};