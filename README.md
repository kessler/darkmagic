# flame DI  [![Build Status](https://secure.travis-ci.org/kessler/flame-di.png?branch=master)](http://travis-ci.org/kessler/flame-di)

An experimental highly opinionated dependency injection framwork.

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
require('flame-di').inject(function(http, database, config) {
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
however flame di eliminates the need for these declarations by infering the dependencies from the arguments of a function.

TODO:

- complete readme
- maybe publish to npm at some point
- support node modules with dashes (maybe via underscore)
- static analysis of dependencies

