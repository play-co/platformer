import ui.ImageView;
import ui.View;
import ui.ViewPool;

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
	
	this.addBackgroundView = function (view) {
		view.style.width = this.style.width;
		view.style.height = this.style.height;
		this.addSubview(view);
	}
	
	this.addLayer = function (layer) {
		if (!(layer instanceof ParallaxView.Layer)) {
			layer = new ParallaxView.Layer(layer);
		}
		layer._parallaxView = this;
		this.addSubview(layer);
		this.layers.push(layer);
		layer.style.height = this.style.height;
		layer.style.zIndex = MAX_ZINDEX - layer._distance;
		layer.scrollTo(this._x / layer._distance, this._y / layer._distance);
		return layer;
	}
	
	this.clear = function () {
		for (var i = 0; i < this.layers.length; i++) {
			this.layers[i].clear();
		}
	}
	
	this.scrollBy = function (x, y, relativeToDistance) {
		if (x == null) { x = 0; }
		if (y == null) { y = 0; }
		relativeToDistance = relativeToDistance || 1;
		x *= relativeToDistance;
		y *= relativeToDistance;
		
		this.scrollTo(x != null ? this._x + x : null, 
					  y != null ? this._y + y : null);
	}

	this.scrollTo = function (x, y, relativeToDistance) {
		if (x == null) { x = 0; }
		if (y == null) { y = 0; }
		relativeToDistance = relativeToDistance || 1;
		x *= relativeToDistance;
		y *= relativeToDistance;

		this._x = x;
		this._y = y;
		for (var i = 0; i < this.layers.length; i++) {
			var layer = this.layers[i];
			layer._scrollTo(x / (layer._distance || 1), y / (layer._distance || 1));
		}
	}
});


// A parallax layer has a ran
ParallaxView.Layer = Class(ui.View, function (supr) {
	var defaults = {
		distance: 1
	};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		supr(this, 'init', arguments);
		this._distance = opts.distance || 1;
		this.pools = {};		
		this.populatedX = 0;
		this.setHandleEvents(false, false);
	}

	this.scrollTo = function (x, y) {
		this._parallaxView.scrollTo(x, y, this._distance);
	}
	
	this.scrollBy = function (dx, dy) {
		this._parallaxView.scrollBy(dx, dy, this._distance);
	}
	
	this._scrollTo = function (x, y) {
		this.style.x = -x|0;
		this.style.y = -y|0;
	
		this._populate();
	}
	
	this.clear = function () {
		var subviews = this.getSubviews();
		while (subviews.length) {
			this.removeView(subviews.pop());
		}
		this.populatedX = -this.style.x;
		this._populate();
	}
	
	this._populate = function () {
		var start = this.populatedX;
		var end = -this.style.x + this.getSuperview().style.width;
		while (start < end) {
			var width = this.populate(start, end, this);
			if (!width || isNaN(width)) {
				break;
			}
			start += width;
		}
		this.populatedX = Math.max(start, end);

		for (var i = 0, children = this.getSubviews(), 
		     len = children.length; i < len; i++) {
			var v = children[i];
			if (v.style.x + v.style.width < -this.style.x) {
				this.removeView(v);
			}
		}
	}
	
	this.obtainView = function(ctor, group, opts, initCount) {
		if (opts === undefined && typeof group == 'object') {
			opts = group;
			group = "";
		}
		var poolKey = ctor.name + group;
		
		var pool;
		if (!(pool = this.pools[poolKey])) { 
			pool = this.pools[poolKey] = new ui.ViewPool({
				ctor: ctor,
				initOpts: opts,
				initCount: initCount || 15
			});
		}
		var v = pool.obtainView(opts);
		// hack for imageview:
		if ((v instanceof ui.ImageView) && 'image' in opts) {
			v.setImage(opts.image, opts);
		}
		v._pool = pool;
		return v;
	}
	
	this.removeView = function (v) {
		if (v._pool) {
			// ui.ViewPool prefers that you don't
			// actually remove views, for performance reasons.
			// ViewPool will set v.style.visible to false.
			v._pool.releaseView(v);
		} else {
			v.removeFromSuperview();
		}
	}
	
	this.populate = function (x, width, layer) {
		if (this._opts.populate) {
			return this._opts.populate.call(this, x, width, layer);
		}
		// override this and place objects in the view.
		// if you return a value less than width, we'll keep
		// calling populate for you.
	}
});

