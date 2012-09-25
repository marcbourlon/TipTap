(function (TipTap, _, $) {

	var Touch = function () {
		this.debugMe = true;

		this.START_EVENT = 'touchstart';
		this.DRAG_EVENT = 'touchmove';
		this.END_EVENT = 'touchend';
		this.CANCEL_EVENT = 'touchcancel';
	}

	Touch.prototype = {
		buildEtList:       function (e) {
			var l = TipTap.getEvent(e).changedTouches;
			_.each(l, function (t) {
				// adds timestamp to each touch
				t.timeStamp = e.timeStamp;
				t.$target = $(t.target);  // todo: remove jQuery dependency (use isSameNode instead of is)
			});
			return l;
		},
		onStart:           function (eventTouch) {
		},
		onDrag:            function (e) {
		},
		onEnd:             function (eventTouch) {
		},
		onCancel:          function (eventTouch) {
		},
		shouldCaptureDrag: function (e) {
			return true;
		}
	};

	// namespacing
	TipTap.Touch = Touch;

}(window.TipTap, _, window.jQuery));
