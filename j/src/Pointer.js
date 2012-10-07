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

		buildEtList: function (e) {

			var pointersList = TipTap._getEvent(e).getPointerList();

			for (var i = 0, l = pointersList.length; i < l; i++) {

				var pointer = pointersList[i];

				// adds timestamp to each pointer
				pointer.timeStamp = e.timeStamp;

				this._addTarget(pointer, pointer);

			}

			return pointersList;

		},

		onStart: function (eventTouch) {

			this.mouseDown = true;

		},

		onDrag: function (eventTouch) {
		},

		onEnd: function (eventTouch) {

		},

		onCancel:   function (eventTouch) {

			this.onEnd(eventTouch);

		},

		// todo: base Device class with these jQuery-related methods
		// will be set to either saveTargetNojQuery or saveTargetjQuery, depending.
		_addTarget: function (dest, src) {

		},

		_addTargetjQuery: function (dest, src) {

			// add jQuery object wrapper for the DOM
			dest.$target = $(src.target);

		},

		usejQuery: function () {

			this._addTarget = this._addTargetjQuery;

		},

		shouldCaptureDrag: function (e) {

			// todo: get info from Pointer
			return true;

		},

	};

}(window.TipTap, _, window.jQuery));
