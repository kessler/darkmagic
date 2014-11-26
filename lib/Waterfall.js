module.exports = Waterfall
function Waterfall(work) {
	this.work = work
}

Waterfall.prototype.run = function(order, done) {

	var self = this

	var index = 0
	var len = order.length
	
	function callback(err, result) {

		if (err) {
			return done(err)
		}
		
		self.work[order[index]] = result

		if (++index < len) {
			self.work[order[index]].call(null, callback)
		} else {
			done(null, self.work)
		}
	}

	if (len > 0)
		this.work[order[index]].call(null, callback)
	else
		done(null, self.work)
}
