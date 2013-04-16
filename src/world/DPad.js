import ui.View;

var DPad = exports = Class(ui.View, function (supr) {
	var defaults = {};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		supr(this, 'init', arguments);
		
		var directions = [null, 'up', null,
						  'left', null, 'right',
						  null, 'down', null];
		this._buttons = [];
		this._buttonState = {};
		
		directions.forEach(function (dir) {
			var view = null;
			if (dir) {
				view = new ui.View({
					superview: this,
					backgroundColor: "black",
					opacity: 0.2,
				});
				view._direction = dir;
				view.on('InputStart', this._onButtonStart.bind(this));
				view.on('InputSelect', this._onButton.bind(this));
			}
			this._buttons.push(view);
		}, this);

		if (window.document && document.addEventListener) {
			document.addEventListener('keydown', function (evt) {
				switch (evt.keyCode) {
				case 37: this._onButtonStart({target: {_direction: 'left'}}); break;
				case 38: this._onButtonStart({target: {_direction: 'up'}}); break;
				case 39: this._onButtonStart({target: {_direction: 'right'}}); break;
				case 40: this._onButtonStart({target: {_direction: 'down'}}); break;
				}
			}.bind(this));
			document.addEventListener('keyup', function (evt) {
				switch (evt.keyCode) {
				case 37: this._onButton({target: {_direction: 'left'}}); break;
				case 38: this._onButton({target: {_direction: 'up'}}); break;
				case 39: this._onButton({target: {_direction: 'right'}}); break;
				case 40: this._onButton({target: {_direction: 'down'}}); break;
				}
			}.bind(this));
		}

		this.layout();
	}
	
	this._onButtonStart = function (evt) {
		var dir = evt.target._direction;
		console.log("Pressed: ", dir);
		this._buttonState[dir] = true;
		this.emit('Down', dir);
	}

	this._onButton = function (evt) {
		var dir = evt.target._direction;
		console.log("Released: ", dir);
		this._buttonState[dir] = false;
		this.emit('Up', dir);
	}
	
	this.getButtonState = function () {
		return this._buttonState;
	}
	
	this.isPressed = function (dir) {
		return !!this._buttonState[dir];
	}

	this.getDirectionVector = function () {
		var vec = {x: 0, y: 0};
		if (this._buttonState.down) {
			vec.y = 1;
		} else if (this._buttonState.up) {
			vec.y = -1;
		}
		if (this._buttonState.left) {
			vec.x = -1;
		} else if (this._buttonState.right) {
			vec.x = 1;
		}
		return vec;	
	}
	
	this.layout = function () {
		var size = this.style.width / 3;
		for (var i = 0; i < 9; i++) {
			var offset = i * size;
			var x = offset % this.style.width;
			var y = (offset / this.style.width | 0) * size;
			var button = this._buttons[i];
			if (button) {
				button.style.update({
					x: x,
					y: y,
					width: size,
					height: size,
				});
			}
		}
	}
	
});