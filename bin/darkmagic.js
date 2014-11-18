#!/usr/bin/env node
var darkmagic = require('../index.js')
var path = require('path')

console.log('experimental feature... still not working properly')

var main = process.argv[2]

if (!main) {
	console.error('missing main file')
	process.exit(1)
}

darkmagic.inject(require(path.resolve(process.cwd(), main)))


