import ui.View;
import ui.ImageView;
import ui.SpriteView;
import ui.ImageScaleView;
import ui.resource.loader as loader;

import math.geom.Rect as Rect;
import math.geom.Point as Point;

import animate;
import AudioManager;

import src.platformer.ParallaxView as ParallaxView;
import src.platformer.GestureView as GestureView;
import src.platformer.Physics as Physics;
import src.platformer.ScoreView as ScoreView;
import src.platformer.util as util;

import resources.starGrids as starGrids;


exports = Class(GC.Application, function () {
	
	// Game constants, for easy tweaking:
	const GRAVITY = 1400;
	const HOLD_GRAVITY = GRAVITY / 2;
	const JUMP_VELOCITY = 500;
	const ROLL_VELOCITY = 1000;
	const PLAYER_INITIAL_SPEED = 400;
	const WORLD_ACCELERATION = 15;
	const REBOUND_PERCENTAGE = 0.3;
	const SCORE_STAR_VALUE = 100;
	const SCORE_TIME_VALUE = 1;

	// Initialize the application
	this.initUI = function () {
		// Scale the root view to 1024x576, which will fit on most phones.
		// If we didn't do this, we'd have to scale each view differently
		// for different device dimensions. This letterboxes the game, if necessary.
		util.scaleRootView(this, 1024, 576);
		
		// After preloding certain assets...
		loader.preload(["resources/images/level", "resources/audio/effects"], function () {

			// Initialize everything.
			this.resetState();
			this.setupParallaxView();
			this.setupInput();
			this.setupPlayer();
			this.setupUILayer();
			this.loadSound();
			this.startGame();
			
			Physics.start();

			// this flag allows the tick function below to begin stepping.
			this.loaded = true;
		
		}.bind(this));
	}

	// Initialize the ParallaxView, which will serve as a container
	// for most of the layers in our game:
	this.setupParallaxView = function() {
		
		this.parallaxView = new ParallaxView({
			superview: this.view,
		 	width: this.view.style.width,
		 	height: this.view.style.height,
		});
		
		// add a view for the sky
		this.parallaxView.addBackgroundView(new ui.ImageScaleView({
			scaleMethod: 'cover',
			image: "resources/images/level/backgroundSky.png",
		}));
	
		// add some brush, far away
		this.parallaxView.addLayer({
			distance: 20,
			populate: function (layer, x) {
				var v = layer.obtainView(ui.ImageView, {
					superview: layer,
					image: "resources/images/level/fargroundBrush.png",
					x: x,
					y: layer.style.height - 250,
					opacity: 0.5,
					width: 1024,
					height: 212
				});
				return v.style.width;
			}
		});
		
		// add some brush closer to the screen
		this.parallaxView.addLayer({
			distance: 10,
			populate: function (layer, x) {
				var v = layer.obtainView(ui.ImageView, {
					superview: layer,
					image: "resources/images/level/midgroundBrush.png",
					x: x,
					y: layer.style.height - 200,
					width: 1024,
					height: 212
				});
				return v.style.width;
			}
		});		

		// The game layer will contain all of our platforms, the player,
		// and anything else relevant to the main gameplay.
		// Here, we delegate the real work to a separate function for clarity:
		this.gameLayer = this.parallaxView.addLayer({
			distance: 7,
			populate: function (layer, x) {
				return this.populateGameLayer(layer, x);
			}.bind(this)
		});
		
		// Add some low-level fog in front of the platforms:
		this.parallaxView.addLayer({
			distance: 5,
			populate: function (layer, x) {
				var size = util.choice([1,2,3,4,5]);
				var v = layer.obtainView(ui.ImageView, {
					superview: layer,
					image: "resources/images/level/cloud" + size + ".png",
					x: x,
					y: layer.style.height - util.randInt(100, 300),
					opacity: Math.random(),
					autoSize: true
				});
				return util.randInt(200, 500);
			}
		});

		// Add water at the very bottom of the screen, in front:
		this.parallaxView.addLayer({
			distance: 4,
			populate: function (layer, x) {
				var v = layer.obtainView(ui.ImageView, {
					superview: layer,
					image: "resources/images/level/waterFast.png",
					x: x,
					y: layer.style.height - 50,
					width: 1024,
					height: 111
				});
				return v.style.width;
			}
		});
	}

	// We'll handle a couple gestures: swipe down, and tap-and-hold,
	// using a GestureView.
	this.setupInput = function () {
		this.gestureView = new GestureView({
			superview: this.view,
			width: this.view.style.width,
			height: this.view.style.height,
			zIndex: 10000
		});
		
		// When the player taps, try to jump
		this.gestureView.on("InputStart", function (e) {
			if (!this.isFinished) {
				if ((this.player.jumpingLevel == 0 && this.player.velocity.y < 150)
				     || this.player.jumpingLevel == 1) {
					this.player.jumpingLevel++;
					this.player.velocity.y = -1 * JUMP_VELOCITY;
					this.player.startAnimation(this.player.jumpingLevel == 1 ? "jump" : "float", {
						loop: this.player.jumpingLevel == 2,
						callback: function () {
							this.player.startAnimation("glider", {loop: true});
						}.bind(this)
					});
				}
			}
		}.bind(this));
		
		this.gestureView.on("InputSelect", function (e) {
			if (this.isFinished && this.player.velocity.x <= 0) {
				// If the game was over, start a new game
				this.startGame();
			} else {
				// When the player lifts their finger
				// swap out the animation to show that they're
				// falling faster now
				if (this.player.jumpingLevel > 0) {
					this.player.startAnimation("land", {
						loop: true
					});
				}
			}
		}.bind(this));
		
		// When their finger is moving around on the screen, see if it
		// has moved down far and fast enough to be a swipe. If so, make
		// the player fall quickly by rolling.
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
				
				e.cancel(); // stop sending drag events.
			}

		}.bind(this));

	}
	
	// Load the player's sprite. Take a look at the resources directory
	// to see what these images look like and how they fit together to
	// form a SpriteView.
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
		
		// The player can double-jump, so the first jump == 1, second jump == 2
		this.player.jumpingLevel = 1;
		
		// This player needs to be able to move with physics.
		// This function will give the player a bunch of new
		// functionality like velocity, acceleration, and
		// a bunch of positioning helper functions.
		// See the Physics class documentation!
		Physics.addToView(this.player, {
			hitbox: {
				x: 0,
				y: 20,
				width: 80,
				height: 80,
			}
		});
	}
	
	// The UI for this game is pretty simple: just a score view.
	this.setupUILayer = function () {
		this.scoreView = new ScoreView({
			superview: this.view,
			zIndex: 10000,
			x: 0,
			y: 10,
			width: this.view.style.width,
			height: 70,
			anchorX: this.view.style.width / 2,
			anchorY: 35,
			charWidth: 50,
			charHeight: 70,
			text: "0",
			url: 'resources/images/numbers/char-{}.png',
		});
	}
	
	// Sound effects are straightforward:
	this.loadSound = function () {
		this.sound = new AudioManager({
			path: "resources/audio/",
			files: {
				background: { volume: 1, background: true },
				win: { volume: 1, background: true  },
				lose: { volume: 1, path: 'effects' },
				star1: { volume: 0.5, path: 'effects' },
				star2: { volume: 0.5, path: 'effects' },
				star3: { volume: 0.5, path: 'effects' },
				star4: { volume: 0.5, path: 'effects' },
				star5: { volume: 0.5, path: 'effects' },
				star6: { volume: 0.5, path: 'effects' },
				star7: { volume: 0.5, path: 'effects' },
				star8: { volume: 0.5, path: 'effects' },
			}
		});
	}
	
	// Here's where the real work for the game layer takes place. You
	// should read through the documentation for ParallaxView to fully
	// understand this function. In short, this function gets called
	// with an `x` coordinate for the position where we should start
	// adding views to the game layer. As the player scrolls further
	// right in the game, this function will get called to add more
	// platforms and items.
	this.populateGameLayer = function (layer, x) {
		var halfh = layer.style.height / 2;

		if (this.lastPlatformHeight == null) {
			this.lastPlatformHeight = 100;
		}

		// First, select a height for the next platform that's
		// somewhat close to the previous platform
		var platformHeight = Math.min(halfh, Math.max(0, 
													  util.randInt(this.lastPlatformHeight - halfh / 2, 
																   this.lastPlatformHeight + halfh / 2)));
		this.lastPlatformHeight = platformHeight;
		
		// Get a new platform of a random size. (This view comes from
		// a ViewPool automatically, which improves performance.)
		var size = util.choice([256, 512, 768, 1024]);
		var platform = layer.obtainView(ui.ImageView, {
			superview: layer,
			image: "resources/images/level/platform" + size + ".png",
			x: x,
			y: layer.style.height - 100 - platformHeight,
			width: size,
			autoSize: true
		});

		// To detect collisions between the player and any platform,
		// we add Physics to this view with a group of "ground".
		Physics.addToView(platform, {group: "ground"});

		// In our game, we predefined grid arrangements of stars to display in
		// starGrids.js. Here, we'll pull out that information and add some views
		// for those stars for the player to collect:
		var starHeight = util.randInt(50, 200);
		var starSize = 50;
		var numStars = size / starSize - 2;
		var maxPerRow = platform.style.width / starSize | 0;
		var grid = util.choice(starGrids); // choose a random arrangement of stars
		var initX = util.randInt(0, Math.max(0, maxPerRow - grid[0].length)) * starSize;
		
		for (var gridY = 0; gridY < grid.length; gridY++) {
			var row = grid[gridY];
			var rowCount = Math.min(row.length, maxPerRow);
			for (var gridX = 0; gridX < rowCount; gridX++) {
				if (grid[gridY][gridX] == 0) {
					continue;
				}
				var star = layer.obtainView(ui.ImageView, {
					superview: layer,
					image: "resources/images/star.png",
					x: x + initX + gridX * starSize,
					y: platform.style.y - starHeight - starSize * gridY,
					anchorX: starSize/2,
					anchorY: starSize/2,
					width: starSize,
					height: starSize,
					scale: 1
				}, {poolSize: 40, group: "star"}); // note the large pool size, for performance.

				// Again, we group these in a "star" group for easy collision detection processing.
				Physics.addToView(star, {group: "star"});
			}
		}
		
		// We want to create spaces where the player could fall in between,
		// and those spaces should get bigger the longer the player has been running:
		var spaceBetweenPlatforms = 0;
		
		// if they're more than a few seconds in, start spacing out the platforms
		if (this.t > 5) {
			spaceBetweenPlatforms = util.randInt(100, 100 + this.t * 20);
		}
		
		// Should we add an enemy?
		if (Math.random() < 0.5 && this.t > 5 && platform.style.width >= 512) {
			var enemyBee = layer.obtainView(EnemyBeeView, {
				superview: layer,
				x: x + util.randInt(0, platform.style.width - 50),
				y: platform.style.y - util.choice([100, 300]),
				width: 50,
				height: 100,
			}, {poolSize: 5, group: "bee"});
		}
		
		
		// Because we populated the view as far as the platform, plus the extra space,
		// we return the amount of space populated. Then, the ParallaxView knows to only populate
		// the view starting from the last unpopulated x coordinate. In this case, it'll 
		// call this function again to populate once we reach the place where we want to 
		// place the next platform.
		return platform.style.width + spaceBetweenPlatforms | 0;

	}

	// Clear out a few variables before we start any game:
	this.resetState = function () {
		if (this.isFinished) {
			animate(this.scoreView).commit();
			animate(this.parallaxView).commit();
		}
		this.t = 0;
		this.isFinished = false;
		this.score = 0;
	}
	
	// This code actually starts the game.
	this.startGame = function() {
		setTimeout(function () {
			// This is in a setTimeout because some desktop browsers need
			// a moment to prepare the sound (this is probably a bug in DevKit)
			this.sound.play("background");
		}.bind(this), 10);
		
		this.resetState();
		this.parallaxView.scrollTo(0, 0);
		this.parallaxView.clear();
		this.gameLayer.addSubview(this.player);
		this.player.jumpingLevel = 1; // they start in the air
		this.player.setCollisionEnabled(true);
		this.player.startAnimation("land", {
			loop: true
		});
		this.player
			.setPosition(50, 0)
			.setVelocity(PLAYER_INITIAL_SPEED, -400)
			.setAcceleration(WORLD_ACCELERATION, GRAVITY);
	};
	
	// When the player dies...
	this.finishGame = function() {
		if (!this.isFinished) {
			this.isFinished = true;
			this.sound.play("lose");
			this.player.acceleration.x = -200; // slow them down until they stop
			// Fade out the parallax layer
			animate(this.parallaxView)
				.now({opacity: 0.2}, 1000)
				.wait(10000000)
				.then({opacity: 1});
			// animate the scoreView to the middle of the screen
			var origY = this.scoreView.style.y;
			animate(this.scoreView)
				.now({
					dy: (this.view.style.height - this.scoreView.style.height) / 2
				}, 1000, animate.easeIn)
				.then({scale: 2}, 400, animate.easeIn)
				.then({scale: 1.5}, 400, animate.easeOut)
				.wait(10000000)
				.then({y: origY, scale: 1}, 400, animate.easeOut);
			
			// Note that we instruct these animations to wait for a long time.
			// When we call resetState() again, it calls .commit() on these views'
			// animations, which will cause them to move to their final state, which
			// in this case is the position from which they began.
		}
	}

	this.tick = function (dtMS) {
		if (!this.loaded) {
			return;
		}
		// I prefer to handle the tick in seconds. Also, here we limit the DT to
		// prevent large drops, which could cause the player to teleport through platforms:
		var dt = Math.min(dtMS / 1000, 1/30);
		this.t += dt;
		
		if (this.isFinished) {
			// When the player finishes slowing down at the end of a game, play the "win" music.
			if (this.player.velocity.x < 0) {
				this.player.stopAllMovement();
				this.sound.play("win");
			}
		} else {
			// During the game, give the player acceleration depending on whether or not they're
			// dragging on the screen:
			if (this.gestureView.isPressed()) {
				this.player.acceleration.y = HOLD_GRAVITY;
			} else {
				this.player.acceleration.y = GRAVITY;
			}
			// give them some points for surviving based on time
			this.score += SCORE_TIME_VALUE;
		}
		
		// update the score UI
		this.scoreView.setText(this.score | 0);
		
		// Scroll the ParallaxView (relative to the frame of reference of the gameLayer)
		// to always place the player at the left of the screen, with a bit of variance in
		// the ParallaxView's `y` coordinate to raise the gameplay area when the player jumps higher.
		this.gameLayer.scrollTo(this.player.getLeft() - 50, 
								Math.min(0, this.player.getTop() - this.gameLayer.style.height / 4));
		
		// Check for collisions with the ground:
		var hits = this.player.getCollisions("ground");
		for (var i = 0; i < hits.length; i++) {
			var hit = hits[i];
			// If the player is close to the top of a platform, and they're falling (not jumping up),
			// we must make them hit the platform.
			if (this.player.getPrevBottom() <= hit.view.getTop() + 10 && this.player.velocity.y >= 0) {
				if (this.player.jumpingLevel > 0 || this.player.rolling) {
					this.player.jumpingLevel = 0;
					this.player.rolling = false;
					animate(this.player).clear();
					this.player.setRotation(0);
					this.player.resetAnimation();
				}
				// They're currently _colliding_ with the platform; move them up higher so that they
				// only touch the top of the platform instead
				this.player.position.y -= hit.intersection.height;
				this.player.velocity.y = 0;
			}
		}

		// See if they've collided with any stars
		var hits = this.player.getCollisions("star");
		for (var i = 0; i < hits.length; i++) {
			var hit = hits[i];
			// If they've hit a star, give them extra points
			var star = hit.view;
			this.score += SCORE_STAR_VALUE;
			// remove the star from the physics simulation so that we don't
			// collide with it any more
			star.setCollisionEnabled(false);
			// now animate it away.
			animate(star).now({
				scale: 0,
				dx: util.randInt(-100, 100),
				dy: util.randInt(-100, 100),
			}, 200).then(function () {star.removeFromSuperview()});
			// Note that the star view will get recycled in the view pool automatically,
			// because ParallaxView's obtainView function adds a listener to the view's
			// "ViewRemoved" event which handles releasing it back to the pool.
			// 
			// Also note that if a star falls off the front of the screen because the
			// player missed it, the star will still be removed (and added back to the pool)
			// because ParallaxView removes views that have scrolled off the screen to the left.
		}
		
		// If they've collided with any stars, play a collision sound
		if (hits.length) {
			this.sound.play("star" + util.randInt(1,9));
		}

		// If they hit an ememy bee, they die.
		var hits = this.player.getCollisions("bee");
		for (var i = 0; i < hits.length; i++) {
			var hit = hits[i];
			var bee = hit.view;
			bee.setCollisionEnabled(false);
			bee.stopAllMovement();
			bee.velocity.x = this.player.velocity.x;
			bee.acceleration.y = GRAVITY;
			bee.die();
			this.player.setCollisionEnabled(false); // let him fall through the platforms
			animate(this.player).now({
				dr: Math.PI * -2
			}, 2000);
			this.finishGame();
		}

		// If the player fell off the bottom of the screen, game over!
		if (this.player.getY() >= this.gameLayer.style.height) {
			this.finishGame();
		}
	}
});


var EnemyBeeView = new Class([ui.View, Physics], function (supr) {
	this.init = function(opts) {
		opts.group = "bee";
		opts.hitbox = {
			x: 10,
			y: 10,
			width: 30,
			height: 30,
		};
		supr(this, 'init', arguments);
		Physics.prototype.init.apply(this, arguments);
		var sprite = this.sprite = new ui.SpriteView({
			superview: this,
			x: 0,
			y: 0,
			width: 50,
			height: 50,
			url: "resources/images/enemies/bee",
			defaultAnimation: "flying",
			autoStart: true,
		});
		function animateBee() {
			animate(sprite)
				.clear()
				.now({dy: 50}, 400)
				.then({dy: -50}, 400)
				.then(animateBee);
		}
		animateBee();
	}
	
	this.tick = function () {
		this.hitbox.y = this.sprite.style.y + 10;
	}
	
	this.die = function() {
		animate(this.sprite, "rotation").now({r: Math.PI * 1.5}, 1000);
	}
});

