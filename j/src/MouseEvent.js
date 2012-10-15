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
		this._setTarget$FromEvent(event);

		this.timeStamp = event.timeStamp;

	};

	MouseEvent.prototype = {

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget$FromEvent: null,

		_setTargetFromEvent: function (event) {

			this.target = event.target;

		},

		_set$TargetFromEvent: function (event) {

			// add jQuery object wrapper for the DOM
			this.$target = $(event.target);

		},

	};

	MouseEvent.use$ = function (use$) {

		if (use$) {
			// replaces methods. I know, I "should" use decorators, but it's a bit heavy for this.
			this.prototype._setTarget$FromEvent = this.prototype._set$TargetFromEvent;
			this.prototype.getTarget$ = this.prototype.get$Target;

		} else {

			this.prototype._setTarget$FromEvent = this.prototype._setTargetFromEvent;
			this.prototype.getTarget$ = this.prototype.getTarget;

		}

	};

	TipTap.MouseEvent = MouseEvent;

}(window.TipTap, window.jQuery));
