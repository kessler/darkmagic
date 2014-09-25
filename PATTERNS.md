
### Perfectly normal module
this module will only run once (and its result will be cached as if it was a normal require)
```
// m.js
module.exports = function (a, b, c) {
	return {
		some: function () {},
		api: '1'
	}	
}
```
so later you can do:
```
module.exports = function(m) {
	
}
```
or even
```
var m = require('./lib/m.js')
```

### Perfectly normal async module
```
module.exports = function (a, b, c, callback) {
	callback(null, {
		some: function () {},
		api: '1'
	})
}
```

### Pitfall module
this module will never be cached and will be run every time it is injected somewhere since it doesn't return anything
(this sucks and I might change that in the future)
```
module.exports = function (a, b, c) {
	
}
```

