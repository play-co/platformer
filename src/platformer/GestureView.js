import ui.View;

exports = Class(ui.View, function (supr) {
	var defaults = {
		
	};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		
		supr(this, 'init', arguments);
	}
	
	this.isPressed = function () {
		return !!this._startEvent;
	}
	
	this.onInputStart = function (e) {
		this._startEvent = e;
	}
	
	this.onInputMove = function (e2) {
		var e1 = this._startEvent;
		if (!e1) {
			return;
		}
		var event = {
			duration: e2.when - e1.when,
			dx: e2.srcPoint.x - e1.srcPoint.x,
			dy: e2.srcPoint.y - e1.srcPoint.y,
			cancel: function () {
				this._startEvent = null;
			}.bind(this)
		};
		this.emit("Drag", event);
	}
	
	this.onInputSelect = function (e2) {
		var e1 = this._startEvent;
		if (!e1) {
			return;
		}
		this._startEvent = null;
		var event = {
			duration: e2.when - e1.when,
			dx: e2.srcPoint.x - e1.srcPoint.x,
			dy: e2.srcPoint.y - e1.srcPoint.y,
		};
		this.emit("Swipe", event);
	}
	
});