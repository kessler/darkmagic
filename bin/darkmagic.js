#!/usr/bin/env node
var darkmagic = require('../index.js')
var path = require('path')

var main = process.argv[2]

if (!main) {
	console.error('missing main file')
	process.exit(1)
}

darkmagic.inject(require(path.resolve(process.cwd(), main)))
