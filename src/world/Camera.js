import lib.PubSub;

var Camera = exports = Class(lib.PubSub, function (supr) {
	
	var defaults = {
		world: null,
		padding: 100,
	};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		supr(this, 'init', arguments);
		
		this.world = opts.world;
		this._lastX = this._lastY = 0;
	}
	
	this.focus = function (rectOrView, padding) {
		if (!this.world.style.width) {
			return;
		}
		padding = padding || 0;
		var rect = {
			x: rectOrView.x || rectOrView.style.x,
			y: rectOrView.y || rectOrView.style.y,
			width: rectOrView.width || rectOrView.style.width || 0,
			height: rectOrView.height || rectOrView.style.height || 0,
		};
		
		rect.x -= padding;
		rect.y -= padding;
		rect.width = (rect.width || 0) + padding * 2;
		rect.height += padding * 2;

		var viewport = this.world.getViewportRect();
		var minX = 0, minY = 0, 
	        maxX = this.world.getWidth() - viewport.width, 
	        maxY = this.world.getHeight() - viewport.height;
		var rectX = rect.x, rectY = rect.y, rectMaxX = rect.x + rect.width, rectMaxY = rect.y + rect.height;
		
		// see how far we would need to scroll to fit the rect inside
		
		var scrollX = 0;
		if (rectMaxX > viewport.x + viewport.width) {
			scrollX = rectMaxX - (viewport.x + viewport.width);
		} else if (rectX < viewport.x) {
			scrollX = rectX - viewport.x;
		}

		var scrollY = 0;
		if (rectMaxY > viewport.y + viewport.height) {
			scrollY = rectMaxY - (viewport.y + viewport.height);
		} else if (rectY < viewport.y) {
			scrollY = rectY - viewport.y;
		}
		
		// don't scroll past the world bounds
		var newX = viewport.x + scrollX;
		var newY = viewport.y + scrollY;
		newX = Math.max(minX, Math.min(newX, maxX));
		newY = Math.max(minY, Math.min(newY, maxY));
		
		
		if (newX != viewport.x || newY != viewport.y) {
			//console.log("World scrolling to:", x, y);
			this.world.scrollTo(newX, newY);
			//this.world.scrollBy(scrollX, scrollY);
		}
	}
	
});