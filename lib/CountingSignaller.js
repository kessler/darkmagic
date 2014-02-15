module.exports = CountingSignaller

function CountingSignaller(initial) {
	this.initial = initial
	this.count = initial
}

CountingSignaller.prototype.countDown = function() {
	if (--this.count === 0) this._signal()
}

CountingSignaller.prototype.countUp = function () {
	if (++this.count === 0) this._signal()
}

CountingSignaller.prototype.once = function(string, fn) {
	this.fn = fn
}

CountingSignaller.prototype._signal = function () {
	this.count = this.initial

	// always call signal in next tick, to align sync calls to signaller with async ones.
	var self = this

	if (this.fn) {
		var fn = this.fn
		this.fn = undefined
		process.nextTick(fn)
	}
}