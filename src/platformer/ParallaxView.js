import ui.ImageView;
import ui.View;

var MAX_ZINDEX = 1000000;

var ParallaxView = exports = Class(ui.View, function (supr) {
	var defaults = {
		
	};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		this.layers = [];
		this._x = 0;
		this._y = 0;
		supr(this, 'init', arguments);
	}
	
	this.addParallaxLayer = function (layer, distance) {
		layer._parallaxView = this;
		layer._distance = distance;
		this.addSubview(layer);
		this.layers.push(layer);
		layer.style.height = this.style.height;
		layer.style.zIndex = MAX_ZINDEX - distance;
		layer.repopulate();
	}
	
	this.focus = function (view, dy) {
		this.scrollTo(view.style.x - 50, dy);
	}
	
	// this.scrollTo = function (x, y) {
	// }
	
	this.scrollBy = function (x, y, relativeToDistance) {
		if (x == null) { x = 0; }
		if (y == null) { y = 0; }
		relativeToDistance = relativeToDistance || 1;
		x *= relativeToDistance;
		y *= relativeToDistance;

		this._x += x;
		this._y += y;
		for (var i = 0; i < this.layers.length; i++) {
			var layer = this.layers[i];
			layer._scrollBy(x / (layer._distance || 1), y / (layer._distance || 1));
		}
	}

	this.scrollTo = function (x, y, relativeToDistance) {
		if (x == null) { x = 0; }
		if (y == null) { y = 0; }
		relativeToDistance = relativeToDistance || 1;
		x *= relativeToDistance;
		y *= relativeToDistance;

		this.scrollBy(x != null ? x - this._x : null,
					  y != null ? y - this._y : null);
	}
});

import ui.ViewPool;

// A parallax layer has a ran
exports.ParallaxLayer = Class(ui.View, function (supr) {
	var defaults = {

	};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		supr(this, 'init', arguments);
		
		this.pools = {};		
		this.populatedRange = [0, 0];
		this.setHandleEvents(false, false);
	}

	this.focus = function (view, y) {
		this._parallaxView.scrollTo(view.style.x * this._distance - 50, y * this._distance);
	}
	
	this.scrollTo = function (x, y) {
		this._parallaxView.scrollTo(x, y, this._distance);
	}
	
	this.scrollBy = function (dx, dy) {
		this._parallaxView.scrollBy(dx, dy, this._distance);
	}
	
	this._scrollBy = function (dx, dy) {
		this.style.x -= dx|0;
		this.style.y -= dy|0;
	
		this.repopulate();
	}
	
	this.repopulate = function () {
		var start = this.populatedRange[1];
		var end = -this.style.x + this.getSuperview().style.width;
		while (start < end) {
			start = this.populate(start, end);
			if (start === undefined) {
				break;
			}
		}
		this.populatedRange[1] = Math.max(start, end);

		for (var i = 0, children = this.getSubviews(), 
		     len = children.length; i < len; i++) {
			var v = children[i];
			if (v.style.x + v.style.width < -this.style.x) {
				this.removeView(v);
			}
		}
	}
	
	this.obtainView = function(ctor, opts) {
		var pool;
		if (!(pool = this.pools[ctor.name])) { 
			pool = this.pools[ctor.name] = new ui.ViewPool({
				ctor: ctor,
				initOpts: opts,
				initCount: 15
			});
			console.log("NEW POOL");
		}
		var v = pool.obtainView(opts);
		v._pool = pool;
		return v;
	}
	
	this.removeView = function (v) {
		if (v._pool) {
			v._pool.releaseView(v);
		} else {
			v.removeFromSuperview();
		}
	}
	
	this.populate = function (x1, x2) {
		if (this._opts.populate) {
			return this._opts.populate.call(this, x1, x2);
		}
		// override this and place objects in the view.
		// if you return a value less than x2, we'll keep
		// calling populate for you.
	}
});

