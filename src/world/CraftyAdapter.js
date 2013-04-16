import ui.View;

// support for timestep:

document = {};
document.createElement = function () {
	return {};
}

import .crafty;

Crafty.c('Solid');

exports.CollidableView = Class(ui.View, function (supr) {
	
	this.init = function () {
		supr(this, 'init', arguments);
	}

});

exports.CollisionDetector = Class(function () {
	this.init = function () {

	}
	
	this.add = function (type, r) {
		var polygon;
		if (r.style) {
			
		} else if (r.x) {
			polygon = new Crafty.polygon([r.x, r.y],
										 [r.x + r.width, r.y],
										 [r.x + r.width, r.y + r.height],
										 [r.x, r.y + r.height]);
		} else {
			polygon = new Crafty.polygon(r);
		}
	}
});