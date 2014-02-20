# DarkMagic [![Build Status](https://secure.travis-ci.org/kessler/darkmagic.png?branch=master)](http://travis-ci.org/kessler/darkmagic)

An experimental highly opinionated dependency injection framework that:

* relies on code conventions
* reduce boilerplate code
* resolve dependencies recursively
* promote cleaner code
* promote testability

This di relies heavily on the module system, it does not cache the dependencies you create [**](#**)

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
		connection.query('select * from moo', function(err, results) {
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

## How to

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
### do callbacks
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
### add more search paths for local modules
```javascript
require('darkmagic').inject(function($injector) {
	$injector.addSearchPath('/a/path/to/somewhere') // add this path as first location to search in

	$injector.inject(function(moo, pie, foo, bar) {

	})
})
```


## Dark Magic - Full disclosure
This framework uses a lot of "dark magic" (hence its name) tricks that many will view as dangerous. These people are probably right and you should listen to them!

####This module:
- parses function signature and uses the parameters, literally to load modules, first attempting to require them as they are and then by attaching them to various predefined search paths in your local file system

- Attempt to inject and invoke recursively EVERY module that exports a function and override the module system cache with the result of the invocation for that module, see this [test](https://github.com/kessler/darkmagic/blob/master/test/Injector.test.js#L185) (this behavior can be turned off though)

- dashify camelCase (camel-case) paramters when trying to find non local node modules

- infer that an exported function is async if the last paramter is called "callback"

[back up](#darkmagic-)

####**
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