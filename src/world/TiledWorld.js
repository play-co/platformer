import ui.ScrollView;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;
import .testWorldData;
import .TileView;
import lib.Callback;

var TiledWorld = exports = Class(ui.View, function (supr) {
	var defaults = {
		drag: false,
		bounce: false,
		inertia: false,
		useLayoutBounds: false,
		sizeX: 64,
		sizeY: 64
	};
	
	this.init = function (opts) {
		this._opts = opts = merge(opts, defaults);
		supr(this, 'init', arguments);

		var data = opts.data || testWorldData;
		this._layers = [];
		this.loadJsonData(data);
		this._contentView = new ui.View({
			parent: this,
			width: this.style.width,
			height: this.style.height,
		});
	}
	
	this.getWidth = function () { return this._width; }
	this.getHeight = function () { return this._height; }
	
	this.getContentView = function () {
		return this._contentView;
	}
	
	this.getViewportRect = function () {
		return {
			x: this._layers[0].getX(),
			y: this._layers[0].getY(),
			width: this.style.width,
			height: this.style.height,
		};
	}
	
	this.scrollTo = function (x, y) {
		for (var i = 0; i < this._layers.length; i++) {
			this._layers[i].scrollTo(x, y);
		}
		this._contentView.style.x = -x;
		this._contentView.style.y = -y;
	}
	
	/** Loads Tiled-formatted JSON data. */
	this.loadJsonData = function(data) {
		// set the global world size
		this._width = data.width * data.tilewidth | 0;
		this._height = data.height * data.tileheight | 0;
		
		for (var i = 0; i < data.layers.length; i++) {
			this.loadLayer(data, data.layers[i]);
		}
	}
	
	function resolveImageFromData(data, tileId) {
		for (var i = data.tilesets.length - 1; i >= 0; --i) {
			var tileset = data.tilesets[i];

			if (tileset.firstgid <= tileId) {
				var idx = tileId - tileset.firstgid;
				var tilesWide = (tileset.imagewidth / tileset.tilewidth) | 0;
				var tilesHigh = (tileset.imageheight / tileset.tileheight) | 0;
				var img = new Image({
					url: tileset.image,
					sourceX: (idx % tilesWide) * tileset.tilewidth,
					sourceY: (idx / tilesWide | 0) * tileset.tileheight,
					sourceW: tileset.tilewidth,
					sourceH: tileset.tileheight,
					width: tileset.imagewidth,
					height: tileset.imageheight,
				});
				return img;
			}
		}
	}
	
	this.loadLayer = function (data, layer) {
		var images = [];
		var sizeX = this._opts.sizeX;
		var sizeY = this._opts.sizeY;
		var cb = new lib.Callback();
		for (var layerY = 0; layerY < layer.height; layerY++) {
			images[layerY] = images[layerY] || [];
			
			for (var layerX = 0; layerX < layer.width; layerX++) {
				var x = layerX + layer.x;
				var y = layerY + layer.y;
				var imageId = layer.data[layerY * layer.width + layerX];
				
				var img = images[layerY][layerX] = resolveImageFromData(data, imageId);
				img.doOnLoad(cb.chain());
			}
		}
		
		
		var layerView = new TileView({
			superview: this,
			width: this.style.width,
			height: this.style.height,
			sizeX: sizeX,
			sizeY: sizeY,
			renderTileCB: function (ctx, offsetX, offsetY, x, y) {
				if (images && images[offsetY] && images[offsetY][offsetX]) {
					ctx.clearRect(x, y, sizeX, sizeY);
					images[offsetY][offsetX].render(ctx, x, y, sizeX, sizeY);
				}
			}
		});
		this._layers.push(layerView);
		
		cb.run(layerView.redrawBuffer.bind(layerView));

	}
	
	
});