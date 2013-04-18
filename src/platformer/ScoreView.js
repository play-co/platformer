import ui.View as View;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;

var emptyFunc = function () {};

/**
 * A class for displaying a series of bitmap characters
 * performantly, such as when displaying an in-game score.
 * This class behaves like a TextView in some respects.
 * 
 * You must provide a URL template which will be used
 * to find bitmaps for any character you want to display:
 * 
 *      this.scoreView = new ScoreView({
 *          superview: this.view,
 *          x: 0, y: 10, width: 200, height: 70,
 *          charWidth: 50,
 *          charHeight: 70,
 *          url: 'resources/images/numbers/char-{}.png',
 *      });
 * 
 *      // in-game:
 *      this.scoreView.setText("23456");
 *
 * If a character cannot be represented in the filename, or you have
 * named a file differently, pass an object `chars` in the constructor
 * to specify a mapping of characters to filename substitutions.
 * 
 */
exports = Class(View, function (supr) {
	
	var defaults = {
		charWidth: 50,
		charHeight: 70,
		chars: {
			'+': 'plus',
			'-' : 'minus',
			'%' : 'percent',
			',' : 'comma',
			'!' : 'exclamation',
			'.' : 'period',
			'?' : 'question'
		},
		url: null
	};

	this.init = function (opts) {
		opts.blockEvents = true;
		opts.canHandleEvents = false;
		supr(this, 'init', arguments);
		
		this._charHeight = opts.charHeight;
		this._charWidth = opts.charWidth;

		this._charImages = {};
		this._chars = opts.chars || {};
		this._url = opts.url;
		
		// Text options
		this.textAlign = opts.textAlign || 'center';
		this.spacing = opts.spacing || 0;

		// Characters that should be rendered
		this._activeCharacters = [];
		this._imageViews = [];

		if (opts.text) {
			this.setText(opts.text);
		}
	};

	/**
	 * Sets the text of the view.
	 * @method setText
	 * @param {String} text
	 */
	this.setText = function (text) {
		text = text + '';

		var textWidth = 0;
		var style = this.style;
		var scale = style.height / this._charHeight;
		var activeCharacters = this._activeCharacters;
		var imageViews = this._imageViews;

		for (var i = 0; i < text.length; i++) {
			var character = text.charAt(i);
			activeCharacters[i] = this._imageForChar(character);
			textWidth += (this._charWidth + this.spacing) * scale;
		}

		if (textWidth > style.width) {
			style.scale = style.width / textWidth;
		}

		var offset;
		if (this.textAlign === 'center') {
			offset = (style.width - textWidth) / 2;
		} else if (this.textAlign === 'right') {
			offset = style.width - textWidth;
		} else {
			offset = 0;
		}

		while (text.length > imageViews.length) {
			var newView = new ImageView({
				superview: this,
				x: 0,
				y: 0,
				width: 1,
				height: 1,
				canHandleEvents: false,
			});
			newView.needsReflow = emptyFunc;
			imageViews.push(newView);
		}

		// Trim excess characters
		activeCharacters.length = text.length;

		var x = offset;
		var y = 0;
		for (i = 0, j = activeCharacters.length; i < j; i++) {
			var data = activeCharacters[i];
			var view = imageViews[i];
			var viewStyle = view.style;
			var w = this._charWidth * scale;

			viewStyle.x = x;
			viewStyle.y = y;
			viewStyle.width = w;
			viewStyle.height = style.height; // All characters should have the same height
			viewStyle.visible = true;
			view.setImage(data);

			x += w + this.spacing * scale;
		}

		while (i < imageViews.length) {
			imageViews[i++].style.visible = false;
		}
	};
	
	this._imageForChar = function (c) {
		if (!this._charImages[c]) {
			this._charImages[c] = new Image({
				url: this._url.replace('{}', this._chars[c] || c)
			});
		}
		return this._charImages[c];
	}

	this.needsReflow = emptyFunc;
});