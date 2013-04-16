//Import the `device` module and `ui.View` class
import device as device;
import ui.View as View;

//## Class: TileView
var TileView = exports = Class(View, function(supr) {
	this.init = function(opts) {
		supr(this, "init", [opts]);

		this._renderTileCB = opts.renderTileCB;

		this._offsetX = 0;
		this._offsetY = 0;
		this._tileX = 0;
		this._tileY = 0;
		this._sX = 0;
		this._sY = 0;
		this._width = opts.width;
		this._height = opts.height;
		this._mTX = opts.sizeX;
		this._mTY = opts.sizeY;
		this._tX1 = Math.ceil(this._width  / this._mTX);
		this._tY1 = Math.ceil(this._height / this._mTY);
		this._tX2 = this._tX1 + 1;
		this._tY2 = this._tY1 + 1;
		this._bufferSizeX = this._tX2 * this._mTX;
		this._bufferSizeY = this._tY2 * this._mTY;
		this._currentX = 0;
		this._currentY = 0;

		var Canvas = device.get("Canvas");
		this._canvasBuffer = new Canvas({width: this._bufferSizeX, height: this._bufferSizeY});
		this._contextBuffer = this._canvasBuffer.getContext('2d');

		this._renderTilesToBuffer(0, 0, this._tX1, this._tY1, 0, 0);
	};

	this._renderTilesToBuffer = function(startX, startY, endX, endY, offsetX, offsetY) {
		var a, b, x, y;

		if ((offsetX < 0) || (offsetY < 0)) { return; }

		b = 0;
		for (y = startY; y <= endY; y++) {
			a = 0;
			for (x = startX; x <= endX; x++) {
				this._renderTileCB(this._contextBuffer, a + offsetX, b + offsetY, x * this._mTX, y * this._mTY);
				a++;
			}
			b++;
		}
	};
	
	this.redrawBuffer = function () {
		this._renderTilesToBuffer(0, 0, this._tX1, this._tY1, 0, 0);
	}

	this._copyBuffer = function(ctx, sx, sy, sw, sh, dx, dy) {
		if ((sw <= 0) || (sh <= 0)) { return; }
		ctx.drawImage(this._canvasBuffer, sx, sy, sw, sh, dx, dy, sw, sh);
	};

	this._copyScreen = function(ctx) {
		var sizeX = this._sX * this._mTX,
			sizeY = this._sY * this._mTY,
			sx = 0,
			sy = 0,
			sw = this._width,
			sh = this._height,
			dx = 0,
			dy = 0;

		if ((this._sX === 0) && (this._sY === 0)) {
			this._copyBuffer(ctx, this._offsetX, this._offsetY, sw, sh, dx, dy);
		} else if (this._sY === 0) {
			sx = this._offsetX + sizeX;
			sy = this._offsetY;
			sw = this._bufferSizeX - this._offsetX - sizeX;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);

			sx = 0;
			sy = this._offsetY;
			sw = sizeX + this._offsetX - this._mTX;

			dx = this._bufferSizeX - this._offsetX - sizeX;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);
		} else if (this._sX === 0) {
			sx = this._offsetX;
			sy = this._offsetY + sizeY;
			sh = this._bufferSizeY - this._offsetY - sizeY;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);

			sx = this._offsetX;
			sy = 0;
			sh = sizeY + this._offsetY - this._mTY;

			dy = this._bufferSizeY - this._offsetY - sizeY;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);
		} else {
			// Copy right bottom to left top...
			sx = this._offsetX + sizeX;
			sy = this._offsetY + sizeY;
			sw = this._bufferSizeX - this._offsetX - sizeX;
			sh = this._bufferSizeY - this._offsetY - sizeY;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);

			// Copy left top to right bottom...
			sx = 0;
			sy = 0;
			sw = this._offsetX + sizeX - this._mTX;
			sh = this._offsetY + sizeY - this._mTY;

			dx = this._bufferSizeX - this._offsetX - sizeX;
			dy = this._bufferSizeY - this._offsetY - sizeY;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);

			// Copy right top to left bottom...
			sx = this._offsetX + sizeX;
			sy = 0;
			sw = this._bufferSizeX - this._offsetX - sizeX;
			sh = this._offsetY + sizeY - this._mTY;

			dx = 0;
			dy = this._bufferSizeY - this._offsetY - sizeY;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);

			// Copy right top to left bottom...
			sx = 0;
			sy = this._offsetY + sizeY;
			sw = this._offsetX + sizeX - this._mTX;
			sh = this._bufferSizeY - this._offsetY - sizeY;

			dx = this._bufferSizeX - this._offsetX - sizeX;
			dy = 0;

			this._copyBuffer(ctx, sx, sy, sw, sh, dx, dy);
		}
	};
	
	this.getX = function () {
		return this._currentX;
	}
	this.getY = function () {
		return this._currentY;
	}

	this.scrollTo = function (x, y) {
		this.scrollHorizontal(x - this._currentX);
		this.scrollVertical(y - this._currentY);
		this._currentX = x;
		this._currentY = y;
	}
	
	this.scrollVertical = function(value) {
		this._offsetY += value;
		while (this._offsetY < 0) {
			if (this._tileY > 0) {
				this._offsetY += this._mTY;
				this._sY--;
				this._tileY--;
				if (this._sY < 0) { this._sY += this._tY2; }
			} else {
				this._offsetY = 0;
				break;
			}

			this._renderTilesToBuffer(0, this._sY, this._sX, this._sY, this._tileX + this._tX2 - this._sX, this._tileY);
			this._renderTilesToBuffer(this._sX, this._sY, this._tX1, this._sY, this._tileX, this._tileY);
		}

		while (this._offsetY >= this._mTY) {
			this._renderTilesToBuffer(0, this._sY, this._sX, this._sY, this._tileX + this._tX2 - this._sX, this._tY2 + this._tileY);
			this._renderTilesToBuffer(this._sX, this._sY, this._tX1, this._sY, this._tileX, this._tY2 + this._tileY);

			this._offsetY -= this._mTY;
			this._sY++;
			this._tileY++;
			if (this._sY >= this._tY2) { this._sY -= this._tY2; }
		}
	};

	this.scrollHorizontal = function(value) {
		this._offsetX += value;
		while (this._offsetX < 0) {
			if (this._tileX > 0) {
				this._offsetX += this._mTX;
				this._sX--;
				this._tileX--;
				if (this._sX < 0) { this._sX += this._tX2; }
			} else {
				this._offsetX = 0;
				break;
			}

			this._renderTilesToBuffer(this._sX, 0, this._sX, this._tY1, this._tileX, this._tileY + this._tY2 - this._sY);
			this._renderTilesToBuffer(this._sX, this._sY, this._sX, this._tY1, this._tileX, this._tileY);
		}

		while (this._offsetX >= this._mTX) {
			this._renderTilesToBuffer(this._sX, 0, this._sX, this._sY, this._tX2 + this._tileX, this._tileY + this._tY2 - this._sY);
			this._renderTilesToBuffer(this._sX, this._sY, this._sX, this._tY1, this._tX2 + this._tileX, this._tileY);

			this._offsetX -= this._mTX;
			this._sX++;
			this._tileX++;
			if (this._sX >= this._tX2) { this._sX -= this._tX2; }
		}
	};

	this.render = function(ctx) {
		this._copyScreen(ctx);
	};

});
