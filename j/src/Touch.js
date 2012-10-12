(function (TipTap) {

	// namespacing
	Touch = {
		debugMe: true,

		START_EVENT_NAME:  'touchstart',
		DRAG_EVENT_NAME:   'touchmove',
		END_EVENT_NAME:    'touchend',
		CANCEL_EVENT_NAME: 'touchcancel',

		buildEventList: function (event) {

			var touchesList = this._getTouches(event);

			var pointersList = [];

			for (var i = 0, l = touchesList.length; i < l; i++) {

				var pointer = touchesList[i];

				pointersList.push(new TipTap.TouchEvent(pointer, event));

			}

			return pointersList;

		},

		_getTouches: function (e) {

			return e.changedTouches;

		},

		_getTouches$: function (e) {

			return e.originalEvent.changedTouches;

		},

		onStart: function (eventTouch) {
		},

		onDrag: function (eventTouch) {
		},

		onEnd: function (eventTouch) {
		},

		onCancel:   function (eventTouch) {
		},

		use$: function () {

			this._getTouches = this._getTouches$;

			TipTap.TouchEvent.use$();

		},

		shouldCaptureDrag: function (e) {

			return true;

		}

	};

	TipTap.Touch = Touch;

}(window.TipTap));
