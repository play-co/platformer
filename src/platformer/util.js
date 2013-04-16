exports = {
	randFloat: function (low, high) {
		return low + ((high - low) * Math.random());
	},
	
	randInt: function (low, high) {
		return exports.randFloat(low, high) | 0;
	},
	
	choice: function (arr) {
		return arr[arr.length * Math.random() | 0];
	},
	
}