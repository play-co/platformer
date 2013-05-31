import ui.ImageView;
import ui.View;
import ui.ViewPool;
import animate;

var MAX_ZINDEX = 1000000;

/**
 * Provides a simple way to create and manage layers in a scrolling
 * parallax view. Create an instance of this class, and then call
 * `.addLayer(layer)` with two options: the distance of the layer, and
 * a `populate(x, width)` function.
 * 
 * In an infinitely-scrolling world, you can't prepopulate each layer
 * all the way to the end, because you don't know ahead of time how
 * long each layer will be. Even in a finite world, for performance
 * reasons, you should only add views to the game that are going to be
 * imminently visible. In the case of a side-scrolling game, for
 * instance, you should only add views to the screen that are located
 * in the screen, or directly to the right of the screen (so that when
 * you scroll, they show up instantly).
 * 
 * The `ParallaxView` manages this computation for you. As you scroll
 * the parallax view using `scrollTo` or `scrollBy`, each layer will
 * call its `populate(layer, x)` function, indicating that you should
 * populate the layer starting at the given `x` coordinate. You must
 * return a number from your `populate` function representing the width of
 * how far you've prepopulated, so that the layer knows that it can
 * consider that much of the screen to be prepopulated. The layer will
 * continue to call your `populate` function as needed, automatically.
 * 
 * The layer will remove views from your game automatically when they
 * pass beyond the visible screen area (to the left).
 * 
 * ## Layers
 * 
 * **To prevent lag in your game from garbage collection, take note:
 * You should not allocate new views in your `populate` function.**
 * Instead, each layer provides a convenient wrapper for a
 * `ui.ViewPool`, which allows you to create and reuse a finite pool
 * of views. As old views are scrolled off the screen, they're
 * automatically added back into the pool. Example:
 * 
 *     // BAD, DON'T do this:
 *     var view = new ImageView({x: x, image: "..."});
 * 
 *     // GOOD, DO THIS:
 *     var view = layer.obtainView(ImageView, {x: x, image: "..."}, {poolSize: 10});
 * 
 * You can call `.scrollTo` or `.scrollBy` on either the ParallaxView
 * or the individual layers; if you scroll an individual layer, it
 * will automatically scroll the rest of the layers proportionally.
 * 
 * Typically, you'll want to select one layer as your "game layer",
 * which you would then use throughout your game for scrolling and
 * game mechanics.
 * 
 * You can also add a background view below all other views (e.g. for
 * the sky) using `.setBackgroundView()`.
 * 
 * Remember, this isn't magic! Each layer is just another ui.View. If
 * you need to do something advanced, you probably can.
 * 
 * @class ParallaxView
 */
var ParallaxView = exports = Class(ui.View, function (supr) {
	var defaults = {
		
	};
	
	/**
	 * Inititalizes the ParallaxView. There are currently no
	 * configurable options other than the default ui.View options.
	 * @method init
	 */
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		this.layers = [];
		this._x = 0;
		this._y = 0;
		supr(this, 'init', arguments);
	}
	
	/**
	 * Adds the given view to the back of the ParallaxView.
	 * You can add multiple background views, which will each be
	 * resized to fit the ParallaxView. These views will not
	 * scroll; this is typically used for a sky.
	 * @method addBackgroundView
	 * @param {View} view
	 */
	this.addBackgroundView = function (view) {
		view.style.width = this.style.width;
		view.style.height = this.style.height;
		this.addSubview(view);
	}
	
	/**
	 * Adds a new parallax layer to the view, with the given distance,
	 * populated dynamically by the given `populate` function.
	 * For advanced uses, you can subclass the ParallaxView.Layer class
	 * and pass in an instance of that instead. This returns the created layer.
	 * @method addLayer
	 * @param {Object|ParallaxView.Layer} layer
	 * @param {Number} layer.distance
	 * @param {function(layer, x)} layer.populate
	 * @return {ParallaxView.Layer} the layer
	 */
	this.addLayer = function (layer) {
		if (layer._distance < 1) {
			throw new Exception("Layer distance must be >= 1.");
		}
		
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
	
	/**
	 * Removes all subviews from all layers and repopulates them.
	 * @method clear
	 */
	this.clear = function () {
		for (var i = 0; i < this.layers.length; i++) {
			this.layers[i].clear();
		}
	}
	
	/**
	 * Scrolls all layers proportionally by the given amount.
	 * @method scrollBy
	 * @param x
	 * @param y
	 */
	this.scrollBy = function (x, y, relativeToDistance) {
		if (x == null) { x = 0; }
		if (y == null) { y = 0; }
		relativeToDistance = relativeToDistance || 1;
		x *= relativeToDistance;
		y *= relativeToDistance;
		
		this.scrollTo(x != null ? this._x + x : null, 
					  y != null ? this._y + y : null);
	}

	/**
	 * Scrolls all layers proportionally to the given position.
	 * @method scrollTo
	 * @param x
	 * @param y
	 */
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


/**
 * The ParallaxView.Layer class wraps a layer in the parallax view. It
 * provides a way to scroll the view (and simultaneously the parent
 * view), as well as handling efficient view rendering.
 * 
 * Normally you won't need to use this class directly, instead passing
 * distance and populate functions directly to `ParallaxView.addLayer`.
 * 
 * See the main ParallaxView class for more detail.
 * @class ParallaxView.Layer
 */
ParallaxView.Layer = Class(ui.View, function (supr) {
	var defaults = {
		distance: 1
	};
	
	/**
	 * Initialized the view with the given distance.
	 * @param {Number} opts.distance
	 */
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		supr(this, 'init', arguments);
		this._distance = opts.distance || 1;
		this._pools = {};		
		this._populatedX = -this.style.x;
		this.setHandleEvents(false, false);
	}
	
	//****************************************************************
	// Public API
	
	/**
	 * Scrolls the view to the given offset, scrolling the other
	 * layers proportionally.
	 * @method scrollTo
	 * @param {Number} x
	 * @param {Number} y
	 */
	this.scrollTo = function (x, y) {
		this._parallaxView.scrollTo(x, y, this._distance);
	}
	
	/**
	 * Scrolls the view by the given offset, scrolling the other
	 * layers proportionally.
	 * @method scrollBy
	 * @param {Number} x
	 * @param {Number} y
	 */
	this.scrollBy = function (dx, dy) {
		this._parallaxView.scrollBy(dx, dy, this._distance);
	}
	
	/**
	 * Sets the distance for this layer. Note: This may not properly
	 * update after the view has been initialized already.
	 * @method setDistance
	 */
	this.setDistance = function (n) {
		this._distance = n;
	}
	
	/**
	 * Removes all subviews and repopulates the view anew, from the
	 * current scroll position. Useful when restarting a game.
	 * @method clear
	 */
	this.clear = function () {
		var subviews = this.getSubviews();
		while (subviews.length) {
			subviews.pop().removeFromSuperview();
		}
		this._populatedX = -this.style.x;
		this._populate();
	}

	/**
	 * Obtains a view from a ViewPool which will automatically
	 * be released to the pool when it scrolls off the screen.
	 * You can specify a `group` to use a different pool for different
	 * types of objects. See the ParallaxView docs for more info.
	 * @method obtainView
	 * @param ctor the view's class
	 * @param viewOpts params to be passed to the view's constructor
	 * @param opts.poolSize the size of the viewPool
	 * @param opts.group Each distinct group will be pulled from a separate pool.
	 * @return {ctor} an instance of ctor(viewOpts)
	 */
	this.obtainView = function(ctor, viewOpts, opts) {
		opts = opts || {};
		var poolKey = ctor.name + (opts.group || "");
		
		var pool;
		if (!(pool = this._pools[poolKey])) { 
			pool = this._pools[poolKey] = new ui.ViewPool({
				ctor: ctor,
				initOpts: viewOpts,
				initCount: opts.poolSize || 15
			});
		}
		
		var v = pool.obtainView();
		v.updateOpts(viewOpts);
		v.style.visible = true;
		
		// hack for imageview:
		if ((v instanceof ui.ImageView) && 'image' in viewOpts) {
			v.setImage(viewOpts.image, viewOpts);
		}
		if (!v._pool) {
			v._pool = pool;
			v.on("ViewRemoved", function () {
				if (v._pool) {
					v._pool.releaseView(v);
				}
			}.bind(this));
		}

		return v;
	}
	
	/**
	 * Override this function (or pass `populate` in opts) to populate the view
	 * when necessary. The Layer class will automatically call this function
	 * for you when it needs to populate the view; you should place objects
	 * at the given `x` coordinate, and populate about a screenful width.
	 * 
	 * IMPORTANT: You must return the total WIDTH that you populated. For instance,
	 * if you place a platform at `x` and want 100px between platforms,
	 * return `x + platform.style.width + 100`.
	 * 
	 * @method populate
	 * @param {Number} x the first coordinate to populate
	 * @return {Number} the width of the area you populated.
	 */
	this.populate = function (x) {
		if (this._opts.populate) {
			return this._opts.populate.call(this, this, x);
		}
		// override this and place objects in the view.
		// if you return a value less than width, we'll keep
		// calling populate for you.
	}
	
	//****************************************************************
	// Private API
	
	this._scrollTo = function (x, y) {
		this.style.x = -x|0;
		this.style.y = -y|0;
	
		this._populate();
	}
	
	this._populate = function () {
		var start = this._populatedX;
		var end = -this.style.x + this.getSuperview().style.width;
		while (start < end) {
			var width = this.populate(start);
			if (!width || isNaN(width)) {
				break;
			}
			start += width;
		}
		this._populatedX = Math.max(start, end);

		for (var i = 0, children = this.getSubviews(), 
		     len = children.length; i < len; i++) {
			var v = children[i];
			if (v.style.x + v.style.width < -this.style.x) {
				v.removeFromSuperview();
			}
		}
	}
	
});

