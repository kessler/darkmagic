# DarkMagic [![Build Status](https://secure.travis-ci.org/kessler/darkmagic.png?branch=master)](http://travis-ci.org/kessler/darkmagic) [![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

An experimental dependency injection module that:

* supports "async" modules
* promote testability
* resolve dependencies recursively - detecting circular dependencies
* relies on code conventions
* reduce boilerplate code
* reduce usage of require()

Please read the [origin of the name section](#dark-magic---full-disclosure) before proceeding.

## example
###lib/database.js:
```javascript
module.exports = function (config, db, callback) {
	// init db connection etc
	db.connect(config.connectionString, callback)
}
```
###lib/config.js:
```javascript
module.exports = function(rc) {
	return rc('di-example', { httpPort: 1234, connectionString: 'some://thing' })
}
```
###index.js:
```javascript
require('darkmagic').inject(function(http, database, config) {
	// do application stuff
	http.createServer(function(request, response) {
		database.query('select * from moo', function(err, results) {
			response.end(results)
		})
	}).listen(config.httpPort)
})
```
### where are all the require calls?
index.js would typically look like this:
```javascript
var http = require('http')
var database = require('./lib/database')
var config = require('./lib/config')

database(function(err, connection) {
	http.createServer(function(request, response) {
		connection.query('select * from moo', function(err, results) {
			response.end(results)
		})
	}).listen(config.httpPort)
})
```
The framework eliminates the need for these declarations by infering the dependencies from the parameters of a function (it does that using [esprima](http://esprima.org/))
## how does darkmagic promote testability?
Assuming we want to test a module called _loadData_ that looks like this:
```
var fs = require('fs')

module.exports = function(filename, callback) {
	fs.readFile(filename, callback)
}
```
If we are writing a test that involves this module we are basically stuck with actually writing a test file to the disk. Of course there are several modules and technics out there to solve this problem. Darkmagic's take on this is described below.

Here is a darkmagic version of this module:
```
module.exports = function (fs) {
	return function loadData(filename, callback) {
		fs.readFile(filename, callback)
	}
}
```
looks very similar except that now it is quite easy to inject a mock fs object that will return a result we want in our testing.
Lets add a crypto dependency too:
```
module.exports = function (fs, crypto) {
	return function loadData(filename, callback) {
		fs.readFile(filename, function (err, data) {
			if (err) return callback(err)
			
			// this is not a working example...
			var decipher = crypto.createDecipher('aesFoo', 'shhhhhhh')
			var result = decipher.update(data)
			result += decipher.final()

			callbackk(null, result)
		})
	}
}
```
Now when testing this code we could do this:
```
var mockFs = { readFile: ... }
var loadData = require('../lib/loadData')(mockFs, require('crypto'))
... test code here
```
or we could use darkmagic again, just to replace the fs dependency with a mock:
```
var mockFs = { readFile: ... }
require('darkmagic').inject(function (loadData) {
	.. test code here
}, { fs: mockFs })
```
## How to's

### do simple dependency
####simple.js:
```javascript
module.exports = function (http, fs) {
	http.createServer(function(request, response) {
		fs.createReadStream('moo').pipe(response)
	}).listen(8080)
}
```
####index.js
```javascript
require('darkmagic').inject(function(simple) {
	// simple server is started but we dont know when its ready
})
```
--------------------------------
### do callbacks (async modules)
#### mooFile.js
```javascript
module.exports = function (fs, callback) {
	fs.readFile('moo', callback)
}
```
#### server.js
```javascript
module.exports = function (http, mooFile, callback) {
	var server = http.createServer(function(request, response) {
		response.write(mooFile)
	})

	server.on('listening', function() {
		callback(null, server)
	})

	server.listen(8080)
}
```
#### index.js
```javascript
require('darkmagic').inject(function(http, server) {
	http.get('http://localhost:8080', function(err, response) {
		// response content should be equal to our moo file
	})
})
```
--------------------------------
### return a value
#### config.js
```javascript
module.exports = { port: 8080 }
```
#### index.js
```javascript
require('darkmagic').inject(function(http, config) {
	http.createServer(...).listen(config.port)
})
```
--------------------------------
### specify explicit dependencies
this will not work for local files though

#### index.js
```javascript
var overrides = {
	'fooBar': 'MyCrazyNodeModule__name',
	'barFoo': '/home/moo/lib/1.js'
}
require('darkmagic').inject(function(fooBar, barFoo) {

}, overrides)
```
--------------------------------
### listen for new dependencies

#### index.js
```javascript
var injector = require('darkmagic').inject(function(smurf) {

})

injector.on('new dependency', function (dependency, artifact) {
	// dependency metadata
	// artifact is require('smurf') before injection
})
```
--------------------------------
### inject a dash seperated npm module
this will not work for local files though

#### index.js
```javascript
require('darkmagic').inject(function(findPort) {
	// same as require('find-port')
})
```
--------------------------------
### add more search paths for local modules
```javascript
require('darkmagic').inject(function($injector) {
	$injector.addSearchPath('/a/path/to/somewhere') // add this path as first location to search in

	$injector.inject(function(moo, pie, foo, bar) {

	})
})
```
--------------------------------
### Handling errors
By default errors that occur during the dependency resolution process are simply thrown.
Specifying a second callback to the inject method will prevent that and the error handler will be called instead
```javascript
require('darkmagic').inject(function(foo) {
	
}, function(err) {

})
```

## Dark Magic - Full disclosure
This framework uses a lot of "dark magic" (hence its name) tricks that many will view as dangerous. These people are probably right and you should listen to them!

####This module:
- parses function signature and uses the parameters, literally to load modules, first attempting to require them as they are and then by attaching them to various predefined search paths in your local file system

- Attempt to inject and invoke recursively EVERY module that exports a function and override the module system cache with the result of the invocation for that module. This behavior is customizable and is turned off by default for external modules (core/node_modules)

- dashify camelCase (camel-case) parameters when trying to find non local node modules

- infer that an exported function is async if the last paramter is called "callback"

- relies heavily on the module system, it does not cache the dependencies you create [**](#fine-print) as a result, one injector is use for one process. You can create more injectors but they will share the same underlying require cache.

[back up](#darkmagic-)

####Fine print
if all else fails you can do
```
	require('darkmagic').inject(main, {
		a: {},
		b: {},
		c: {}
	})

	function main(a, b, c) {

	}
```
these dependencies will not be cached using the module system but in the injector

TODO:

- provider class factories - parameters that start with an Upper case char will be resolved be looking for a class factory
- static analysis of dependencies
- implement something that will replace flame di with require()s and initializations (code generator)
- document options and customizations
- callbacks that arent getting called ... timeout ? dont let the process exit in anycase
