/**
 * User: marcbourlon
 * Date: 11/10/12
 * Time: 18:46
 */
(function (TipTap, $) {

		// namespaces the thing
	MouseEvent = function (event) {

		this.identifier = 1;

		// exists in both original even and in jQuery event (I hope in all browsers/OS/platforms... :-s)
		this.pageX = event.pageX;
		this.pageY = event.pageY;

		// preallocating both to null might help optimizers / JIT
		this.target = null;
		this.$target = null;
		this._setTarget(event);

		this.timeStamp = event.timeStamp;

	};

	MouseEvent.prototype = {

		_setTarget: function (event) {

			this.target = event.target;

		},

		_set$Target: function (event) {

			// add jQuery object wrapper for the DOM
			this.$target = $(event.target);

		},

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

	};

	MouseEvent.use$ = function () {

		this.prototype.getTarget = this.prototype.get$Target;

		this.prototype._setTarget = this.prototype._set$Target;

	};

	TipTap.MouseEvent = MouseEvent;

}(window.TipTap, window.jQuery));
