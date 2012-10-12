/**
 * User: marcbourlon
 * Date: 30/09/12
 * Time: 18:23
 */
(function (TipTap, _, $) {

	// namespaces the thing
	TipTap.Pointer = {

		debugMe: true,

		identifier: 0,

		START_EVENT_NAME:  'pointerdown',
		DRAG_EVENT_NAME:   'pointermove',
		END_EVENT_NAME:    'pointerup',
		CANCEL_EVENT_NAME: 'pointercancel',

		// todo: base Device class with these jQuery-related methods
		// will be set to either saveTargetNojQuery or saveTargetjQuery, depending.
		_addTarget:        function (dest, src) {

			// nothing to do, target already exists

		},

		_addTargetjQuery: function (dest, src) {

			// add jQuery object wrapper for the DOM
			dest.$target = $(src.target);

		},

		buildEventList: function (e) {

			// when using pointers lib, event contains this method
			var pointersList = this._getEvent(e).getPointerList();

			for (var i = 0, l = pointersList.length; i < l; i++) {

				var pointer = pointersList[i];

				// adds timestamp to each pointer
				pointer.timeStamp = e.timeStamp;

				this._addTarget(pointer, pointer);

			}

			return pointersList;

		},

		_getOriginalEvent: function (e) {

			return e;

		},

		_getOriginalEvent$: function (e) {

			return e.originalEvent;

		},

		onStart: function (eventTouch) {

			this.mouseDown = true;

		},

		onDrag: function (eventTouch) {
		},

		onEnd: function (eventTouch) {

		},

		onCancel: function (eventTouch) {

			this.onEnd(eventTouch);

		},

		use$: function () {

			this._addTarget = this._addTargetjQuery;

			this._getEvent = this._getOriginalEvent$;

		},

		shouldCaptureDrag: function (e) {

			// todo: get info from Pointer
			return true;

		},

	};

}(window.TipTap, _, window.jQuery));
