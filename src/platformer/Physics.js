import math.geom.intersect as intersect;
import math.geom.Rect as Rect;
import math.geom.Point as Point;

var groups = {};
var allPhysicsViews = {};

function addViewToCollisionGroup(group, view) {
	if (!groups[group]) { groups[group] = {}; }
	groups[group][view.uid] = view;
}
function removeViewFromCollisionGroup(group, view) {
	if (groups[group] && groups[group][view.uid]) {
		delete groups[group][view.uid];
	}
}


function setterHelper(obj, args, dx, dy) {
	if (args.length == 2) {
		obj.x = args[0] + (dx || 0);
		obj.y = args[1] + (dy || 0);
	} else {
		obj.x = args[0].x + (dx || 0);
		obj.y = args[0].y + (dy || 0);
	}
}

/**
 * Adds physics and/or collision detection to a `ui.View`.
 * 
 * You can use this class in one of two ways: Either inherit
 * from it using multiple inheritance, as follows:
 * 
 *     var MyClass = Class([ui.View, Physics], ...)
 * 
 * or, you can add Physics after instantiating a view:
 * 
 *     Physics.addToView(myCharacter, {group: "player"});
 * 
 * In your Application code, when you're ready to start the game,
 * enable the physics loop by calling `.start()` (you can later pause it by
 * calling `.stop()`:
 * 
 *     Physics.start();
 * 
 * Then, you can update your view's position, velocity, and acceleration
 * by modifying the corresponding properties:
 * 
 *     view.position.x, view.position.y
 *     view.velocity.x, view.velocity.y
 *     view.acceleration.x, view.acceleration.y
 * 
 * Each of these properties is a `math.geom.Point` instance, which provides
 * helpful utilities for angle, magnitude, etc.
 * 
 * ## Collision Detection
 * 
 * Each view can be added to multiple "collision detection groups".
 * For instance, you might have a "ground" group for platforms,
 * a "star" group for stars your player collects, and a "player" group
 * with just your player inside. Typically, you should set the group
 * when you enable physics on your view; you can also set it at any time
 * using the `setCollisionGroups(group)` method.
 * 
 * Then, you can check for collisions with views from certain groups
 * using the `getCollisions(group)` method:
 * 
 *    var collisions = player.getCollisions("ground");
 *    for (var i = 0; i < collisions.length; i++) {
 *        var collision = collisions[i];
 *        var ground = collision.view;
 *        var intersectionRectangle = collision.intersection;
 *        // do something like this:
 *        player.velocity.y = -1 * Math.abs(player.velocity.y);
 *        player.setBottom(ground.getTop());
 *    }
 * 
 * You can temporarily enable or disable collision detection on a view
 * without removing it from a group by calling `setCollisionEnabled`.
 * Note that these changes only persist until a view is removed and
 * re-added to the view hierarchy. In most cases, that's what you
 * want: if your player collides with a star, you can call
 * `disableCollisions`, and remove the star from your view. When the
 * same star view comes back (becuase you're using a view pool), it
 * will have collision detection enabled again.
 * 
 * ## Position Helper Functions
 * 
 * `Physics` adds a number of functions to a `ui.View` that are
 * helpful when calculating positions of objects:
 * 
 *     setTop, setBottom, setLeft, setRight
 *     getTop, getBottom, getLeft, getRight
 *     setTopLeft, setBottomLeft, setTopRight, setBottomRight
 *     getTopLeft, getBottomLeft, getTopRight, getBottomRight
 *     setCenter, getCenter
 *     getX, getY, getRect, setRect
 *     getPrevTop, getPrevBottom, getPrevLeft, getPrevRight
 *     getPrevTopLeft, getPrevBottomLeft, getPrevTopRight, getPrevBottomRight
 * 
 * @class Physics
 */
var Physics = exports = Class(function () {

	var defaults = {
		physics: true,
		collision: true,
		group: null,
		groups: [],
		hitbox: null
	}

	/**
	 * Initializes physics.
	 * @param opts.group The initial collision group or groups.
	 * 
	 * @method init
	 */
	this.init = function (opts) {
		opts = merge(opts, defaults);
		this._collisionGroups = [];
		this._physicsEnabled = opts.physics;
		this._collisionEnabled = opts.collision;
		this.hitbox = opts.hitbox;

		this.on('ViewAdded', function () {
			allPhysicsViews[this.uid] = this;
			for (var i = 0; i < this._collisionGroups.length; i++) {
				addViewToCollisionGroup(this._collisionGroups[i], this);
			}
		}.bind(this));

		// Remove refrences when the view disappears so that
		// we don't retain references which would leak memory
		this.on('ViewRemoved', function () {
			delete allPhysicsViews[this.uid];
			for (var i = 0; i < this._collisionGroups.length; i++) {
				removeViewFromCollisionGroup(this._collisionGroups[i], this);
			}
		}.bind(this));
		
		this._updatePhysicsOpts(opts);
		
		// Allow position to be used like a point just like
		// velocity and acceleration, while keeping in sync with
		// the view's actual position
		this.position = this.style;
		for (var k in Point.prototype) if (!(k in this.position)) {
			this.position[k] = Point.prototype[k];
		}
		this.velocity = new Point();
		this.acceleration = new Point();
		this.prevPosition = new Point(this.position);

		if (this.__root) { // only if the view is on the view hierarchy
			allPhysicsViews[this.uid] = this;
			for (var i = 0; i < this._collisionGroups.length; i++) {
				addViewToCollisionGroup(this._collisionGroups[i], this);
			}
		}
	}
	
	//****************************************************************
	// Position
	
	// standard rectangle properties
	this.getX = function () { return this.style.x; }
	this.getY = function () { return this.style.y; }
	this.getWidth = function () { return this.style.width; }
	this.getHeight = function () { return this.style.height; }
	this.getRect = function () { return new Rect(this.style); }

	// accessors for positioning based on sides
	this.getTop = function () { return this.style.y; }
	this.getBottom = function () { return this.style.y + this.style.height; }
	this.getLeft = function () { return this.style.x; }
	this.getRight = function () { return this.style.x + this.style.width; }

	this.setWidth = function (n) { this.style.width = n; return this; }
	this.setHeight = function (n) { this.style.height = n; return this; }
	this.setTop = this.setY = function (n) { this.style.y = n; return this; }
	this.setBottom = function (n) { this.style.y = n - this.style.height; return this; }
	this.setLeft = this.setX = function (n) { this.style.x = n; return this; }
	this.setRight = function (n) { this.style.x = n - this.style.width; return this; }
	this.setRect = function (r) { this.style.update(r); return this; }
	
	this.getCenter = function () {
		return Rect.prototype.getCenter.call(this.style);
	}
	this.getTopLeft = function () {
		return new Point(this.style.x, this.style.y);
	}
	this.getTopRight = function () {
		return new Point(this.style.x + this.style.width, this.style.y);
	}
	this.getBottomLeft = function () {
		return new Point(this.style.x, 
					 this.style.y + this.style.height);
	}
	this.getBottomRight = function () {
		return new Point(this.style.x + this.style.width, 
					 this.style.y + this.style.height);
	}

	// For any of the following setters, you can pass (x, y) or a point:
	this.setCenter = function () {
		setterHelper(this.style, arguments,
					 -this.getWidth() / 2, -this.getHeight() / 2);
		return this;
	}
	this.setTopLeft = function () {
		setterHelper(this.style, arguments,
					 0, 0);
		return this;
	}
	this.setTopRight = function () {
		setterHelper(this.style, arguments,
					 -this.style.width, 0);
		return this;
	}
	this.setBottomLeft = function () {
		setterHelper(this.style, arguments, 
					 0, -this.style.height);
		return this;
	}
	this.setBottomRight = function () {
		setterHelper(this.style, arguments, 
					 -this.style.width, -this.style.height);
		return this;
	}
	
	//****************************************************************
	// Rotation
	
	this.setRotation = function (r) {
		this.style.r = r;
		return this;
	}

	this.getRotation = function () {
		return this.style.r;
	}

	this.rotate = function (r) {
		this.style.r += r;
		return this;
	}

	//****************************************************************
	// Previous Position
	
	// This is sometimes useful for detecting where an object came from,
	// rather than doing the velocity calculation yourself.
	this.getPrevPosition = function () { return this.prevPosition; }
	this.getPrevTop = function () { return this.prevPosition.x; }
	this.getPrevBottom = function () { return this.prevPosition.y + this.style.height; }
	this.getPrevLeft = function () { return this.prevPosition.y; }
	this.getPrevRight = function () { return this.prevPosition.x + this.style.width; }
	this.getPrevTopLeft = function () {
		return new Point(this.prevPosition.x, this.prevPosition.y);
	}
	this.getPrevTopRight = function () {
		return new Point(this.prevPosition.x + this.style.width, this.prevPosition.y);
	}
	this.getPrevBottomLeft = function () {
		return new Point(this.prevPosition.x, 
					 this.prevPosition.y + this.style.height);
	}
	this.getPrevBottomRight = function () {
		return new Point(this.prevPosition.x + this.style.width, 
					 this.prevPosition.y + this.style.height);
	}
	
	this.getPrevRect = function () {
		return new Rect({x: this.prevPosition.x, y: this.prevPosition.y,
					 width: this.style.width, height: this.style.height});
	}
	
	//****************************************************************
	// Velocity & Acceleration

	// These are only provided for consistency.
	// Use the .position, .velocity, and .acceleration variables!
	// They are instances of Point() and thus have things like angle, magnitude, etc.
	
	this.setPosition = this.setTopLeft;
	this.setVelocity = function () {
		setterHelper(this.velocity, arguments, 0, 0);
		return this;
	}
	this.setAcceleration = function () {
		setterHelper(this.acceleration, arguments, 0, 0);
		return this;
	}
	
	this.getPosition = this.getTopLeft;
	this.getVelocity = function () { return this.velocity; }
	this.getAcceleration = function () { return this.acceleration; }
	
	this.stopAllMovement = function () {
		this.setVelocity(0, 0);
		this.setAcceleration(0, 0);
	}
	
	//****************************************************************
	// Collision

	/**
	 * Sets collision detection (it's already on by default).
	 * @method setCollisionEnabled
	 */
	this.setPhysicsEnabled = function (on) {
		this._physicsEnabled = on;
	}

	/**
	 * Sets collision detection (it's already on by default).
	 * @method setCollisionEnabled
	 */
	this.setCollisionEnabled = function (on) {
		this._collisionsEnabled = on;
	}

	/**
	 * Sets the groups to which this object belongs for collision detection.
	 * @method setCollisionGroups
	 * @param {Array} groups
	 */
	this.setCollisionGroups = function (groups) {
		if (!groups) { groups = []; }
		else if (!Array.isArray(groups)) { groups = [groups]; }

		for (var i = 0; i < this._collisionGroups.length; i++) {
			removeViewFromCollisionGroup(this._collisionGroups[i], this);
		}

		this._collisionGroups = groups;

		if (this.__root) {
			for (var i = 0; i < this._collisionGroups.length; i++) {
				addViewToCollisionGroup(this._collisionGroups[i], this);
			}
		}
	}

	/**
	 * Returns whether or not this object belongs to the given collision group.
	 * @method inCollisionGroup
	 * @param {String} group
	 * @return {Boolean}
	 */
	this.inCollisionGroup = function (group) {
		return this._collisionGroups.indexOf(group) != -1;
	}
	
	this._computedHitBox = null; // save it for quick reference
	this.getHitBox = function () {
		if (!this._computedHitBox) {
			this._computedHitBox = {};
		}
		this._computedHitBox.x = this.style.x + (this.hitbox ? this.hitbox.x : 0);
		this._computedHitBox.y = this.style.y + (this.hitbox ? this.hitbox.y : 0);
		this._computedHitBox.width = (this.hitbox ? this.hitbox.width : this.style.width);
		this._computedHitBox.height = (this.hitbox ? this.hitbox.height : this.style.height);
		return this._computedHitBox;
	}
	
	/**
	 * Returns an array of collisions between this object and all objects in the
	 * given `group`. This object will always return an array (never null).
	 * @method getCollisions
	 * @param {String} group the group to check collisions against
	 * @return Array of {intersection: Rect, view: View} objects, or empty array
	 */
	this.getCollisions = function (group) {
		var collisions = [];
		if (!this._collisionsEnabled) {
			return collisions;
		}
		var uidmap = groups[group];
		if (uidmap) {
			for (var uid in uidmap) if (uid != this.uid) {
				var view2 = uidmap[uid];
				var intersection = intersect.rectAndRect(this.getHitBox(), view2.getHitBox());
				if (intersection) {
					collisions.push({
						intersection: intersection,
						view: view2
					});
				}
			}
		}
		return collisions;
	}
	
	//****************************************************************

	this._updatePhysicsOpts = function (opts) {
		this.setCollisionGroups(opts.group || opts.groups);
		if (opts.position) {
			this.position.x = opts.position.x;
			this.position.y = opts.position.y;
		}
		if (opts.velocity) {
			this.velocity.x = opts.velocity.x;
			this.velocity.y = opts.velocity.y;
		}
		if (opts.acceleration) {
			this.acceleration.x = opts.acceleration.x;
			this.acceleration.y = opts.acceleration.y;
		}
	}

});


/**
 * Adds the Physics class to the given View (like a mixin).
 * This is safe to call on the same view multiple times; in other words,
 * you should always call it when retrieving a view from a ViewPool if you
 * intend to change the view's collision groups.
 * @method addToView
 * @static
 */
Physics.addToView = function (view, opts) {
	if (!view.__hasPhysics) {
		view.__hasPhysics = true;
		for (var k in Physics.prototype) if (!(k in view)) {
			view[k] = Physics.prototype[k];
		}
		Physics.prototype.init.call(view, opts);
	} else {
		view._updatePhysicsOpts(opts);
	}
	return view;
}

/**
 * Boolean indicating whether or not physics is currently ticking.
 * @property running
 * @static
 */
Physics.running = false;

/**
 * Starts the physics engine (updating objects' positions every tick).
 * @method start
 * @static
 */
Physics.start = function () {
	if (!Physics.running) {
		Physics.running = true;
		GC.app.engine.on('Tick', Physics.tick);
	}
}

/**
 * Stops the engine from ticking.
 * @method stop
 * @static
 */
Physics.stop = function () {
	if (Physics.running) {
		Physics.running = false;
		GC.app.engine.unsubscribe('Tick', Physics.tick);
	}
}

// called automatically by the framework
Physics.tick = function (dt) {
	if (!Physics.running) {
		return;
	}
	
	if (dt > 0) {
		dt = dt / 1000; // Physics expects seconds, not milliseconds.
	}
	for (var k in allPhysicsViews) {
		var view = allPhysicsViews[k];
		if (view._physicsEnabled) {
			view.prevPosition.x = view.position.x;
			view.prevPosition.y = view.position.y;
			view.velocity.x += view.acceleration.x * dt;
			view.velocity.y += view.acceleration.y * dt;
			view.position.x += view.velocity.x * dt;
			view.position.y += view.velocity.y * dt;
		}
	}
}
