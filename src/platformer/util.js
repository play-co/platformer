import device;
import ui.View;

/**
 * Returns a random float between `low` and `high`, high exclusive, or
 * between 0 and `low` if no `high` was passed.
 * @method randFloat
 * @return {float}
 */
exports.randFloat = function (low, high) {
	if (high == null) {
		high = low;
		low = 0;
	}
	return low + ((high - low) * Math.random());
}

/**
 * Returns a random int between `low` and `high`, high exclusive, or
 * between 0 and `low` if no `high` was passed.
 * @method randInt
 * @return {int}
 */
exports.randInt = function (low, high) {
	return exports.randFloat(low, high) | 0;
}

/**
 * Given an array, returns a random element from the array.
 * @method choice
 * @param {Array} arr
 * @returns random element
 */
exports.choice = function (arr) {
	return arr[arr.length * Math.random() | 0];
}

/**
 * Scales the root view of the DevKit application so that it has a
 * size of W x H but always fits within the main window, letterboxing
 * the view if necessary. A typical size is 1024x576, for fitting in
 * most phones reasonably well. You should call this function before
 * adding any other views to the app.
 * @method scaleRootView
 * @param {GC.Application} app
 * @param W desired main view width
 * @param H desired main view height
 */
exports.scaleRootView = function (app, W, H) {
	var view = app.view;
	var scale = Math.min(view.style.width / W, view.style.height / H);
	var width = view.style.width * scale;
	var height = view.style.height * scale;
	
	app.view = new ui.View({
		superview: view,
		scale: scale,
		width: W, 
		height: H, 
		x: (device.screen.width - W * scale) / 2,
		y: (device.screen.height - H * scale) / 2,
		clip: true,
	});		
}

