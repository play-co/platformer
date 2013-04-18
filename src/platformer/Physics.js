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
	delete groups[group][view.uid];
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

var Physics = exports = Class(function () {

	var defaults = {
		groups: []
	}

	this.init = function (opts) {
		opts = merge(opts, defaults);
		this._collisionGroups = [];
		this.on('ViewAdded', this._enablePhysics.bind(this));
		this.on('ViewRemoved', this._disablePhysics.bind(this));
		this.updatePhysicsOpts(opts);
		
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
	}
	
	this.updatePhysicsOpts = function (opts) {
		this.setCollisionGroups(opts.groups);
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
		return new Point(this.position.x, this.position.y);
	}
	this.getTopRight = function () {
		return new Point(this.position.x + this.style.width, this.position.y);
	}
	this.getBottomLeft = function () {
		return new Point(this.position.x, 
					 this.position.y + this.position.height);
	}
	this.getBottomRight = function () {
		return new Point(this.position.x + this.style.width, 
					 this.position.y + this.position.height);
	}

	// For any of the following setters, you can pass (x, y) or a point:
	this.setCenter = function () {
		setterHelper(this.position, arguments,
					 -this.getWidth() / 2, -this.getHeight() / 2);
		return this;
	}
	this.setTopLeft = function () {
		setterHelper(this.position, arguments,
					 0, 0);
		return this;
	}
	this.setTopRight = function () {
		setterHelper(this.position, arguments,
					 -this.style.width, 0);
		return this;
	}
	this.setBottomLeft = function () {
		setterHelper(this.position, arguments, 
					 0, -this.position.height);
		return this;
	}
	this.setBottomRight = function () {
		setterHelper(this.position, arguments, 
					 -this.style.width, -this.position.height);
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

	this._enablePhysics = function () {
		if (this.__root) { // only if the view is on the view hierarchy
			for (var i = 0; i < this._collisionGroups.length; i++) {
				addViewToCollisionGroup(this._collisionGroups[i], this);
			}
			allPhysicsViews[this.uid] = this;
		}
	}

	this._disablePhysics = function () {
		for (var i = 0; i < this._collisionGroups.length; i++) {
			removeViewFromCollisionGroup(this._collisionGroups[i], this);
		}
		delete allPhysicsViews[this.uid];
	}

	this.setCollisionGroups = function (groups) {
		if (!groups) { groups = []; }
		else if (!Array.isArray(groups)) { groups = [groups]; }
		
		this._disablePhysics();
		this._collisionGroups = groups;
		this._enablePhysics();
	}
	
	this.inCollisionGroup = function (group) {
		return this._collisionGroups.indexOf(group) != -1;
	}
	
	this.getCollisions = function (group) {
		var collisions = [];
		var uidmap = groups[group];
		if (!uidmap) { return null; }
		for (var uid in uidmap) if (uid != this.uid) {
			var view2 = uidmap[uid];
			var intersection = intersect.rectAndRect(this.style, view2.style);
			if (intersection) {
				var r1 = this.getRect();
				var r2 = view2.getRect();
				collisions.push({
					intersection: intersection,
					vector: r2.getCenter().subtract(r1.getCenter()),
					view: view2
				});
			}
		}
		return collisions;
	}
	
	//****************************************************************
	
	this._tickPhysics = function (dt) {
		this.prevPosition.x = this.position.x;
		this.prevPosition.y = this.position.y;

		this.velocity.x += this.acceleration.x * dt;
		this.velocity.y += this.acceleration.y * dt;
		this.position.x += this.velocity.x * dt;
		this.position.y += this.velocity.y * dt;
	}
});

Physics.enable = function (view, opts) {
	if (!view.__hasPhysics) {
		view.__hasPhysics = true;
		for (var k in Physics.prototype) if (!(k in view)) {
			view[k] = Physics.prototype[k];
		}
		Physics.prototype.init.call(view, opts);
	} else {
		view.updatePhysicsOpts(opts);
	}
	return view;
}

Physics.tick = function (dt) {
	if (dt > 1) {
		dt = dt / 1000; // Physics expects seconds, not milliseconds.
	}
	for (var k in allPhysicsViews) {
		allPhysicsViews[k]._tickPhysics(dt);
	}
}