var EventEmitter = require('events').EventEmitter;
var util = require('util');

module.exports = CountingSignaller;

util.inherits(CountingSignaller, EventEmitter);
function CountingSignaller(initial) {
	EventEmitter.call(this);
	this.initial = initial;
	this.count = initial;
}

CountingSignaller.prototype.countDown = function() {
	if (--this.count === 0) this._signal();
};

CountingSignaller.prototype.countUp = function () {
	if (++this.count === 0) this._signal();
};

CountingSignaller.prototype._signal = function () {
	this.count = this.initial;
	this.emit('signal');
};