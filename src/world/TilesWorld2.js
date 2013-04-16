import ui.ScrollView;
import ui.View;
import ui.ImageView;
import ui.resource.Image as Image;
import .testWorldData;

var TiledWorld = exports = Class(ui.ScrollView, function (supr) {
	var defaults = {
		drag: false,
		bounce: false,
		inertia: false,
		useLayoutBounds: false
	};
	
	this.init = function (opts) {
		opts = merge(opts, defaults);
		supr(this, 'init', arguments);
		
		this.getContentView().style.x = 0;
		this.getContentView().style.y = 0;
		
		var data = opts.data || testWorldData;
		this.style.scale = 1;
		this._tilesetImages = [];
		this.loadJsonData(data);
	}
	
	this.getWidth = function () { return this._width; }
	this.getHeight = function () { return this._height; }
	
	/** Loads Tiled-formatted JSON data. */
	this.loadJsonData = function(data) {
		// set the global world size
		this._width = data.width * data.tilewidth | 0;
		this._height = data.height * data.tileheight | 0;
		this.setScrollBounds({
			minX: 0,
			maxX: this._width,
			minY: 0,
			maxY: this._height
		});
		
		// this.tilesetImages = [];
		
		// this.loadTilesets(data);
		for (var i = 0; i < data.layers.length; i++) {
			this.loadLayer(data, data.layers[i]);
		}
	}
	
	// this.loadTilesets = function (data) {
	// 	for (var i = 0; i < data.tilesets.length; i++) {
	// 		var tileset = data.tilesets[i];
	// 		this.tilesetImages[i] = new Image({
	// 			url: tileset.image,
	// 			width: tileset.imagewidth,
	// 			height: tileset.imageheight,
	// 		});
	// 	}
	// }
	
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
		var layerView = new ui.View({
			superview: this,
			width: layer.width * data.tilewidth | 0,
			height: layer.height * data.tileheight | 0,
		});
		for (var layerY = 0; layerY < layer.height; layerY++) {
			for (var layerX = 0; layerX < layer.width; layerX++) {
				var x = layerX + layer.x;
				var y = layerY + layer.y;
				var imageId = layer.data[layerY * layer.width + layerX];
				// position a new tile here
				var tileView = new ui.ImageView({
					canHandleEvents: false,
					superview: layerView,
					x: x * data.tilewidth,
					y: y * data.tileheight,
					width: data.tilewidth,
					height: data.tileheight,
					image: resolveImageFromData(data, imageId)
				});
			}
		}
	}
	
});