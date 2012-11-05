(function (TipTap) {

	// namespacing
	Touch = {
		START_EVENT_NAME:  'touchstart',
		DRAG_EVENT_NAME:   'touchmove',
		END_EVENT_NAME:    'touchend',
		CANCEL_EVENT_NAME: 'touchcancel',

		buildEventList: function (event) {

			var touchesList = this._getTouches$(event);

			var tipTapEventsList = [];

			for (var i = 0, l = touchesList.length; i < l; i++) {

				var touch = touchesList[i];

				tipTapEventsList.push(new TipTap.TouchEvent(touch, event));

			}

			return tipTapEventsList;

		},

		_getTouches$: null,

		_getTouches: function (e) {

			return e.changedTouches;

		},

		_get$Touches: function (e) {

			return e.originalEvent.changedTouches;

		},

		onStart: function (tipTapEvent) {
		},

		onDrag: function (tipTapEvent) {
		},

		onEnd: function (tipTapEvent) {
		},

		onCancel: function (tipTapEvent) {
		},

		use$: function (use$) {

			if (use$) {

				this._getTouches$ = this._get$Touches;

			} else {

				this._getTouches$ = this._getTouches;

			}

			TipTap.TouchEvent.use$(use$);

		},

		shouldCaptureDrag: function (e) {

			return true;

		}

	};

	TipTap.Touch = Touch;

}(window.TipTap));
