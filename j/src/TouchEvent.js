/**
 * User: marcbourlon
 * Date: 11/10/12
 * Time: 18:46
 */
(function (TipTap, $) {

		// namespaces the thing
	var TouchEvent = function (touch, event) {

		this.identifier = touch.identifier;

		this.pageX = touch.pageX;

		this.pageY = touch.pageY;

		// preallocating both to null might help optimizers / JIT
		this.target = null;
		this.$target = null;
		this._setTarget(touch);

		// adds timestamp to each touch
		this.timeStamp = event.timeStamp;

	};

	TouchEvent.prototype = {

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget: function (touch) {

			this.target = touch.target;

		},

		_set$Target: function (touch) {

			// add jQuery object wrapper for the DOM
			this.$target = $(touch.target);

		},

	};

	TouchEvent.use$ = function () {

		this.prototype.getTarget = this.prototype.get$Target;

		this.prototype._setTarget = this.prototype._set$Target;

	};

	TipTap.TouchEvent = TouchEvent;

}(window.TipTap, window.jQuery));
