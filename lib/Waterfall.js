module.exports = Waterfall
function Waterfall(work, context) {
	this.work = work || []
	this.context = context
}

Waterfall.prototype.run = function(done) {

	var self = this

	var index = 0
	var len = self.work.length - 1

	function callback(err, result) {

		if (err) {
			return done(err)
		}

		self.work[index] = result

		if (index < len) {
			self.work[++index].call(self.context, callback)
		} else {
			done(null, self.work)
		}
	}

	if (this.work.length > 0)
		this.work[index].call(this.context, callback)
	else
		done(null, self.work)
}
