import ui.View;
import ui.ImageView;
import animate;
// import src.world.TiledWorld as TiledWorld;
// import src.world.Camera as Camera;
// import src.world.DPad as DPad;
//import src.world.CraftyAdapter;
import src.platformer.ParallaxView as ParallaxView;
import src.platformer.GestureView as GestureView;
import src.platformer.Collision as Collision;
import src.platformer.util as util;
import ui.SpriteView;
import ui.resource.loader as loader;

exports = Class(GC.Application, function () {

	this.initUI = function () {
		
		var view = new ParallaxView({
			superview: this.view,
		 	width: this.view.style.width,
		 	height: this.view.style.height,
		});
		
		
		// debugging:
		window.v = view;
		this.parallaxView = view;
		
		this.gestureView = new GestureView({
			superview: this.view,
			width: this.view.style.width,
			height: this.view.style.height,
			zIndex: 1000
		});
		
		loader.preload("resources/images/level");

		// view.addParallaxLayer(new ParallaxView.ParallaxLayer({
		// 	populate: function (x1, x2) {
		// 		var v = this.obtainView(ui.ImageView, {
		// 			superview: this,
		// 			image: "resources/images/level/fargroundBrush.png",
		// 			x: x1,
		// 			y: this.style.height - 250,
		// 			opacity: 0.5,
		// 			width: 1024,
		// 			height: 212
		// 		});
		// 		return x1 + v.style.width;
		// 	}
		// }), 20);
		
		// view.addParallaxLayer(new ParallaxView.ParallaxLayer({
		// 	populate: function (x1, x2) {
		// 		var v = this.obtainView(ui.ImageView, {
		// 			superview: this,
		// 			image: "resources/images/level/midgroundBrush.png",
		// 			x: x1,
		// 			y: this.style.height - 200,
		// 			width: 1024,
		// 			height: 212
		// 		});
		// 		return x1 + v.style.width;
		// 	}
		// }), 10);

		var gameLayer;

		view.addParallaxLayer(gameLayer = new ParallaxView.ParallaxLayer({
			populate: function (x1, x2) {
				var size = util.choice([256, 512, 768, 1024]);
				var halfh = this.style.height / 2;
				var v = this.obtainView(ui.ImageView, {
					superview: this,
					image: "resources/images/level/platform" + size + ".png",
					x: x1,
					y: halfh + halfh / 2 * Math.random() | 0,
					width: size,
					autoSize: true
				});
//				Collision.addViewToGroup(v, "ground", [[0,0], [size, 0], [size, 1], [0, 1]]);
				
				return x1 + v.style.width + Math.random() * 100 | 0;
			}
		}), 7);

		// view.addParallaxLayer(new ParallaxView.ParallaxLayer({
		// 	populate: function (x1, x2) {
		// 		var v = this.obtainView(ui.ImageView, {
		// 			superview: this,
		// 			image: "resources/images/level/fargroundBrush.png",
		// 			x: x1,
		// 			y: this.style.height - 250,
		// 			opacity: 0.5,
		// 			width: 1024,
		// 			height: 212
		// 		});
		// 		return x1 + v.style.width;
		// 	}
		// }), 20);

		this.gameLayer = gameLayer;
		var player = this.player = new ui.SpriteView({
			superview: gameLayer,
			x: 50,
			y: 50,
			autoSize: true,
			url: 'resources/images/avatarKiwiReindeer/kiwiReindeer',
			defaultAnimation: 'run',
			autoStart: true,
		});

		// //Collision.addViewToGroup(player, "player");
		// view.addParallaxLayer(new ParallaxView.ParallaxLayer({
		// 	populate: function (x1, x2) {
		// 		var size = util.choice([1,2,3,4,5]);
		// 		var v = this.obtainView(ui.ImageView, {
		// 			superview: this,
		// 			image: "resources/images/level/cloud" + size + ".png",
		// 			x: x1,
		// 			y: this.style.height - util.randInt(100, 300),
		// 			opacity: Math.random(),
		// 			autoSize: true
		// 		});
		// 		return x1 + util.randInt(200, 500);
		// 	}
		// }), 5);

		// view.addParallaxLayer(new ParallaxView.ParallaxLayer({
		// 	populate: function (x1, x2) {
		// 		var v = this.obtainView(ui.ImageView, {
		// 			superview: this,
		// 			image: "resources/images/level/waterFast.png",
		// 			x: x1,
		// 			y: this.style.height - 50,
		// 			width: 1024,
		// 			height: 111
		// 		});
		// 		return x1 + v.style.width;
		// 	}
		// }), 4);

		// window.dpad = new DPad({
		// 	superview: this.view,
		// 	zIndex: 1,
		// 	width: 200,
		// 	height: 200,
		// 	y: this.view.style.height - 200
		// });
		
		player.vx = 200;
		player.vy = 0;
		player.ax = 0;
		player.ay = 0;
		this.t = 0;
	};
	

	function applyPhysics(obj, dt) {
		obj.vx += obj.ax * dt;
		obj.vy += obj.ay * dt;
		obj.style.x += obj.vx * dt;
		obj.style.y += obj.vy * dt;
	}
	
	this.tick = function (dtMS) {
//		console.log("DT", dtMS);
		var dt = Math.min(dtMS / 1000, 1/30);
		this.t += dt;
		
		//this.player.ay = 200;
		this.player.ax = 20;
		
		// update
		applyPhysics(this.player, dt);
		
		
		this.gameLayer.focus(this.player, Math.min(0, this.player.style.y - this.gameLayer.style.height / 2) / 2);
		
		// Collision.tick(dt);
		
		// var hits = Collision.hit(this.player, "ground");
		// if (hits) {
		// 	for (var i = 0; i < hits.length; i++) {
		// 		var hit = hits[i];
		// 		if (hit.normal.x == 0 && hit.normal.y == -1 &&
		// 			hit.overlap < 0 && hit.overlap >= -10) {

		// 			this.player.style.y += hit.overlap;
		// 			this.player.vy = -200;
		// 		}
		// 	}
		// }
	}
	
	this.launchUI = function () {};
});
