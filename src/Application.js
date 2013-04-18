import ui.View;
import ui.ImageView;
import ui.SpriteView;
import ui.ImageScaleView;

import animate;
import ui.resource.loader as loader;
import math.geom.Rect as Rect;
import math.geom.Point as Point;

import src.platformer.ParallaxView as ParallaxView;
import src.platformer.GestureView as GestureView;
import src.platformer.Physics as Physics;
import src.platformer.ScoreView as ScoreView;
import src.platformer.util as util;
import src.starGrids as starGrids;


exports = Class(GC.Application, function () {

	const GRAVITY = 1400;
	const HOLD_GRAVITY = GRAVITY / 2;
	const JUMP_VELOCITY = 500;
	const ROLL_VELOCITY = 1000;
	const PLAYER_INITIAL_SPEED = 400;
	const WORLD_ACCELERATION = 10;
	const REBOUND_PERCENTAGE = 0.3;
	const SCORE_STAR_VALUE = 100;
	const SCORE_TIME_VALUE = 1;
	
	this.initUI = function () {
		loader.preload("resources/images/level");

		util.scaleRootView(this, 1024, 576);

		this.resetState();
		this.setupParallaxView();
		this.setupInput();
		this.setupPlayer();
		this.setupUILayer();
		this.startGame();
	}

	this.setupParallaxView = function() {
		
		this.parallaxView = new ParallaxView({
			superview: this.view,
		 	width: this.view.style.width,
		 	height: this.view.style.height,
		});
		
		this.parallaxView.addBackgroundView(new ui.ImageScaleView({
			scaleMethod: 'cover',
			image: "resources/images/level/backgroundSky.png",
		}));
						
		this.parallaxView.addLayer({
			distance: 20,
			populate: function (x, width) {
				var v = this.obtainView(ui.ImageView, {
					superview: this,
					image: "resources/images/level/fargroundBrush.png",
					x: x,
					y: this.style.height - 250,
					opacity: 0.5,
					width: 1024,
					height: 212
				});
				return v.style.width;
			}
		});

		this.parallaxView.addLayer({
			distance: 20,
			populate: function (x, width) {
				var v = this.obtainView(ui.ImageView, {
					superview: this,
					image: "resources/images/level/fargroundBrush.png",
					x: x,
					y: this.style.height - 250,
					opacity: 0.5,
					width: 1024,
					height: 212
				});
				return v.style.width;
			}
		});
		
		this.parallaxView.addLayer({
			distance: 10,
			populate: function (x, width) {
				var v = this.obtainView(ui.ImageView, {
					superview: this,
					image: "resources/images/level/midgroundBrush.png",
					x: x,
					y: this.style.height - 200,
					width: 1024,
					height: 212
				});
				return v.style.width;
			}
		});		

		this.gameLayer = this.parallaxView.addLayer({
			distance: 7,
			populate: function (x, width, layer) {
				return this.populateGameLayer(x, width, layer);
			}.bind(this)
		});
		
		this.parallaxView.addLayer({
			distance: 5,
			populate: function (offsetX, width) {
				var size = util.choice([1,2,3,4,5]);
				var v = this.obtainView(ui.ImageView, {
					superview: this,
					image: "resources/images/level/cloud" + size + ".png",
					x: offsetX,
					y: this.style.height - util.randInt(100, 300),
					opacity: Math.random(),
					autoSize: true
				});
				return util.randInt(200, 500);
			}
		});

		this.parallaxView.addLayer({
			distance: 4,
			populate: function (offsetX, width) {
				var v = this.obtainView(ui.ImageView, {
					superview: this,
					image: "resources/images/level/waterFast.png",
					x: offsetX,
					y: this.style.height - 50,
					width: 1024,
					height: 111
				});
				return v.style.width;
			}
		});

	}
	
	this.setupInput = function () {
		this.gestureView = new GestureView({
			superview: this.view,
			width: this.view.style.width,
			height: this.view.style.height,
			zIndex: 10000
		});
		
		this.gestureView.on("InputSelect", function (e) {
			if (this.isFinished) {
				this.startGame();
			} else {
				if (this.player.jumping) {
					this.player.startAnimation("float", {
						loop: true
					});
				}
			}
		}.bind(this));
		
		this.gestureView.on("InputStart", function (e) {
			if (!this.isFinished) {
				this.doJump(1);
			}
		}.bind(this));
		
		this.gestureView.on("Drag", function (e) {
			if (Math.abs(e.dx) > 100) {
				return;
			}
			if (e.dy > 100 && e.duration < 500) {
				// swipe down
				if (!this.player.rolling) {
					this.player.rolling = true;
					this.player.velocity.y = ROLL_VELOCITY;
				}
				this.player.startAnimation("roll", {
					loop: true
				});
				animate(this.player).now({r: Math.PI * 2}, 500, animate.linear);
				e.cancel();
			}

		}.bind(this));

	}
	
	this.doJump = function (power) {
		if (!this.player.jumping) {
			this.player.jumping = true;
			this.player.velocity.y = -1 * JUMP_VELOCITY * Math.max(0.3, power);
			this.player.startAnimation("jump", {
				callback: function () {
					this.player.startAnimation("glider", {loop: true});
				}.bind(this)
			});
		}


	}
	
	this.setupPlayer = function () {
		this.player = new ui.SpriteView({
			zIndex: 1,
			x: 0,
			y: 0,
			anchorX: 50,
			anchorY: 50,
			autoSize: true,
			url: 'resources/images/avatarKiwiAce/kiwiAce',
			defaultAnimation: 'run',
			autoStart: true,
		});
		Physics.enable(this.player, {groups: ["player"]});
	}
	
	this.setupUILayer = function () {
		this.scoreView = new ScoreView({
			superview: this.view,
			zIndex: 10000,
			x: 0,
			y: 10,
			width: this.view.style.width,
			height: 70,
			charWidth: 50,
			charHeight: 70,
			text: "0",
			url: 'resources/images/numbers/char-{}.png',
		});
	}
	
	this.populateGameLayer = function (x, width, layer) {
		var size = util.choice([256, 512, 768, 1024]);
		var halfh = layer.style.height / 2;
		var v = layer.obtainView(ui.ImageView, {
			superview: layer,
			image: "resources/images/level/platform" + size + ".png",
			x: x,
			y: halfh + halfh / 2 * Math.random() | 0,
			width: size,
			autoSize: true
		});

		Physics.enable(v, {groups: ["ground"]});
		
		// Add some stars to the platform
		var starHeight = util.randInt(50, 200);
		var starSize = 50;
		var numStars = size / starSize - 2;
		
		var maxPerRow = v.style.width / starSize | 0;
		
		var grid = util.choice(starGrids);
		var initX = util.randInt(0, Math.max(0, maxPerRow - grid[0].length)) * starSize;
		for (var gridY = 0; gridY < grid.length; gridY++) {
			var row = grid[gridY];
			var rowCount = Math.min(row.length, maxPerRow);
			for (var gridX = 0; gridX < rowCount; gridX++) {
				if (grid[gridY][gridX] == 0) { continue; }
				var star = layer.obtainView(ui.ImageView, "star", {
					superview: layer,
					image: "resources/images/star.png",
					x: x + initX + gridX * starSize,
					y: v.style.y - starHeight - starSize * gridY,
					anchorX: starSize/2,
					anchorY: starSize/2,
					width: starSize,
					height: starSize,
					scale: 1
				}, 40);
				Physics.enable(star, {groups: ["star"]});
			}
		}
		
		var secondsElapsed = 0;
		var spaceBetweenPlatforms = util.randInt(100, secondsElapsed * 12);
		
		return v.style.width + spaceBetweenPlatforms | 0;

	}

	this.resetState = function () {
		this.t = 0;
		this.isFinished = false;
		this.score = 0;
	}
	
	this.startGame = function() {
		this.resetState();
		this.parallaxView.scrollTo(0, 0);
		this.parallaxView.clear();
		this.gameLayer.addSubview(this.player);
		this.player
			.setPosition(50, 50)
			.setVelocity(PLAYER_INITIAL_SPEED, 0)
			.setAcceleration(WORLD_ACCELERATION, GRAVITY);
	};
	
	this.finishGame = function() {
		if (!this.isFinished) {
			console.log("Game Finished.");
			this.player.acceleration.x = -200;
			this.isFinished = true;
		}
	}

	this.tick = function (dtMS) {
		var dt = Math.min(dtMS / 1000, 1/30);
		this.t += dt;
		
		if (this.isFinished) {
			if (this.player.velocity.x < 0) {
				this.player.stopAllMovement();
			}
		} else {
			if (this.gestureView.isPressed()) {
				this.player.acceleration.y = HOLD_GRAVITY;
			} else {
				this.player.acceleration.y = GRAVITY;
			}
		}
		
		
		
		this.scoreView.setText(this.score | 0);
		Physics.tick(dt);
		
		this.score += SCORE_TIME_VALUE * dtMS;

		this.gameLayer.scrollTo(this.player.getLeft() - 50, 
								Math.min(0, this.player.getTop() - this.gameLayer.style.height / 2) / 2);
		
		var hits = this.player.getCollisions("ground");
		for (var i = 0; i < hits.length; i++) {
			var hit = hits[i];
			if (this.player.getPrevBottom() <= hit.view.getTop()) {
				if (this.player.jumping || this.player.rolling) {
					this.player.jumping = false;
					this.player.rolling = false;
					animate(this.player).clear();
					this.player.setRotation(0);
					this.player.resetAnimation();
				}
				this.player.position.y -= hit.intersection.height;
				this.player.velocity.y = Math.abs(this.player.velocity.y) * -1 * REBOUND_PERCENTAGE;
			}
		}

		var hits = this.player.getCollisions("star");
		for (var i = 0; i < hits.length; i++) {
			var hit = hits[i];
			var star = hit.view;
			this.score += SCORE_STAR_VALUE;
			animate(star).now({
				scale: 0,
				dx: util.randInt(-100, 100),
				dy: util.randInt(-100, 100),
			}, 200).then(function () {star.removeFromSuperview()});
		}

		
		if (this.player.getY() >= this.gameLayer.style.height) {
			this.finishGame();
		}
	}
	
	this.launchUI = function () {};
});

