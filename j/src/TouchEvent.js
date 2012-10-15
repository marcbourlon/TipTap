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
		this._setTarget$FromTouch(touch);

		// adds timestamp to each touch
		this.timeStamp = event.timeStamp;

	};

	TouchEvent.prototype = {

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget$FromTouch: null,

		_setTargetFromTouch: function (touch) {

			this.target = touch.target;

		},

		_set$TargetFromTouch: function (touch) {

			// add jQuery object wrapper for the DOM
			this.$target = $(touch.target);

		},

	};

	TouchEvent.use$ = function (use$) {

		if (use$) {

			this.prototype._setTarget$FromTouch = this.prototype._set$TargetFromTouch;
			this.prototype.getTarget$ = this.prototype.get$Target;

		} else {

			this.prototype._setTarget$FromTouch = this.prototype._setTargetFromTouch;
			this.prototype.getTarget$ = this.prototype.getTarget;

		}

	};

	TipTap.TouchEvent = TouchEvent;

}(window.TipTap, window.jQuery));
