module.exports = function(callback) {

	process.nextTick(function () {
		callback(null, 4);
	});
};