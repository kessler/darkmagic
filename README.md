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

## How to

### simple dependency
####simple.js:
```javascript
module.exports = function (http, fs) {
	http.createServer(function(request, response) {
		fs.createReadStream('moo').pipe(response);
	}).listen(8080);
}
```
####index.js
```javascript
require('flame-di').inject(function(simple) {
	// simple server is started but we dont know when its ready
});
```
--------------------------------
### callbacks
#### mooFile.js
```javascript
module.exports = function (fs, callback) {
	fs.readFile('moo', callback);
}
```
#### fooFile.js
```javascript
module.exports = function (fs, callback) {
	fs.readFile('foo', callback);
}
```
#### index.js
```javascript
require('flame-di').inject(function(mooFile, fooFile) {
	// this function will be call with the contents of moo and foo files
});
```
--------------------------------
### returning a value
#### config.js
```javascript
module.exports = function (rc) {
	return rc('myapp', { port: 8080 });
}
```
#### index.js
```javascript
require('flame-di').inject(function(http, config) {
	http.createServer(...).listen(config.port);
});
```


TODO:

- complete readme
- maybe publish to npm at some point
- support node modules with dashes (maybe via underscore)
- static analysis of dependencies
- implement something that will replace flame di with require()s and initializations

