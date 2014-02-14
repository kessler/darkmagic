var debug = require('debug')('DependencyMetadata');
var path = require('path');
var Module = require('module');

module.exports = DependencyMetadata;

function DependencyMetadata(name) {
	this.name = name;
	this.requireId = undefined;
	this.isLocal = false;
	this.isFactory = false;
	this.isOptional = name.length > 0 && name[name.length - 1] === '_';
}

DependencyMetadata.prototype.load = function (realModule, searchPaths) {
	if (this.requireId)
		return realModule.require(this.requireId);

	var dependency;
	var name = this.name;

	try {
		debug('trying to require %s', name);
		// first try naive require
		dependency = realModule.require(name);
		this.requireId = name;
		debug('dependency %s was require()d directly', name);

	} catch (e) {

		if (e.code !== 'MODULE_NOT_FOUND')
			throw e;

		// try search paths
		for (var x = 0; x < searchPaths.length; x++) {

			var dir = searchPaths[x];

			var depPath = path.resolve(dir, name);

			debug('trying %s', depPath);

			try {
				this.requireId = Module._resolveFilename(depPath, realModule);
				dependency = realModule.require(this.requireId);
				this.isLocal = true;

				debug('dependency %s require()d using %s', name, this.requireId);
				break;

			} catch (e) {
				if (e.code !== 'MODULE_NOT_FOUND')
					throw e;
			}
		}
	}

	this.isFactory = typeof dependency === 'function';

	return dependency;
};

DependencyMetadata.Callback = new DependencyMetadata('dependency callback');