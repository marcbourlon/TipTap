// TODO: Pointer currently NOT WORKING AT ALL
/**
 * User: marcbourlon
 * Date: 30/09/12
 * Time: 18:23
 */
(function (TipTap, _, $) {

	// namespaces the thing
	UnifiedPointer = {

		debug: true,

		identifier: 0,

		START_EVENT_NAME:  'pointerdown',
		DRAG_EVENT_NAME:   'pointermove',
		END_EVENT_NAME:    'pointerup',
		CANCEL_EVENT_NAME: 'pointercancel',

		// todo: base Device class with these jQuery-related methods
		// will be set to either saveTargetNojQuery or saveTargetjQuery, depending.
		_addTarget$:       null,

		_addTarget: function (dest, src) {

			// nothing to do, target already exists

		},

		_add$Target: function (dest, src) {

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

		_getOriginalEvent$: null,

		_getOriginalEvent: function (e) {

			return e;

		},

		_getOriginal$Event: function (e) {

			return e.originalEvent;

		},

		onStart: function (tiptapEvent) {

			this.mouseDown = true;

		},

		onDrag: function (tiptapEvent) {
		},

		onEnd: function (tiptapEvent) {

		},

		onCancel: function (tiptapEvent) {

			this.onEnd(tiptapEvent);

		},

		use$: function (use$) {

			if (use$) {

				this._addTarget$ = this._add$Target;

				this._getOriginalEvent$ = this._getOriginal$Event;

			} else {

				this._addTarget$ = this._addTarget;

				this._getOriginalEvent$ = this._getOriginalEvent;

			}

		},

		shouldCaptureDrag: function (e) {

			// todo: get info from Pointer
			return true;

		},

	};

	// namespacing
	TipTap.UnifiedPointer = UnifiedPointer;

}(window.TipTap, _, window.jQuery));
