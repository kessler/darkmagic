var Dependency = module.exports.Dependency = require('./lib/Dependency.js')
var Injector = module.exports.Injector = require('./lib/Injector.js');
module.exports.inject = inject
module.exports.injector = injector

function inject(file, overrides) {
	var injector = injector(overrides)

	if (typeof file === 'string')
		file = require(file);
	else if (typeof file !== 'function')
		throw new Error('invalid parameter, must provide a filename or a function');

	injector.inject(file);

	return injector;
};

function injector(overrides) {
	var injector = new Injector()

	for (var name in overrides) {
		var dep = new Dependency(name)
		dep.requireId = overrides[name]
		injector.add(dep)
	}

	return injector
}