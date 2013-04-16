import ..world.crafty;

var components = {};

Crafty.c("TimestepView", {
	timestepTick: function (dt) {
		var parent = this.view.getSuperview();
		if (parent && typeof parent.populate === 'function') {
			this.x = this.view.style.x + parent.style.x;
		} else {
			this.x = this.view.style.x;
		}
		this.y = this.view.style.y;
		this.w = this.view.style.width;
		this.h = this.view.style.height;
		this.rotation = this.view.style.r;
	}
});

function attachEntity() {
	if (!this._entity) {
		this._entity = Crafty.e("TimestepView");
		this._entity.view = this;
		for (var group in this._craftyComponents) {
			if (!this._entity.has(group)) {
				this._entity.addComponent(group);
			}
		}
	}
	this._entity.timestepTick(0);
	this._entity.collision(); // update bounding box
}
function detachEntity() {
	if (!this._pool) {
		this._entity.destroy();
		this._entity = null;
	}
}


exports = {
	
	tick: function (dt) {
		Crafty("TimestepView").each(function () {
			this.timestepTick(dt);
		});
	},
	
	addViewToGroup: function (view, group) {
		if (!components[group]) {
			// register the crafty component
			components[group] = Crafty.c(group, {
				init: function() {
					this.requires("2D,Collision");
				},
			});
		}
		
		if (!view._craftyComponents) {
			view._craftyComponents = {};
			view._craftyComponents[group] = true;
			if (view.__root) {
				attachEntity.call(view);
			}
			view.on('ViewAdded', attachEntity.bind(view));
			view.on('ViewRemoved', detachEntity.bind(view));
		}
	},
	
	hit: function (view, group) {
		return view._entity.hit(group);
	}
};