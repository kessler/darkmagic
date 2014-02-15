module.exports = function dummyHierarchy(dummyCallbackAsyncMulti, dummyCallbackSyncMulti, callback) {
	callback(null, {
		dummyCallbackAsyncMulti: dummyCallbackAsyncMulti,
		dummyCallbackSyncMulti: dummyCallbackSyncMulti
	})
}