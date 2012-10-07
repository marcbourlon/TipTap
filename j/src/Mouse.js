(function (TipTap, _, $) {
	// TODO: management of two buttons. click, clack, unclick, clickl, clickr, clackl, clackr

	// namespaces the thing
	TipTap.Mouse = {

		debugMe: true,

		START_EVENT_NAME:  'mousedown',
		DRAG_EVENT_NAME:   'mousemove',
		END_EVENT_NAME:    'mouseup',
		CANCEL_EVENT_NAME: 'mousecancel', // doesn't exist, but needed for 		getStartEventName: 'mousedown' + ((TipTap.settings.usejQuery)?'.TipTap':''),

		mouseDown: false,

		identifier: 0,

		buildEtList: function (e) {
			// if not left click, don't consider event
			// todo: without jQuery :'(
			if (e.button !== 0) {

				return [];

			}

			e.identifier = this.identifier;

			this._addTarget(e, e);

			return [e];

		},

		_generateIdentifier: function () {

			if (!this.identifier) {

				return Math.pow(2, 32) * Math.random();

			}

			return this.identifier + 1;

		},

		onStart: function (eventTouch) {

			this.mouseDown = true;

		},

		onDrag: function (eventTouch) {
		},

		onEnd: function (eventTouch) {

			//md("Mouse up:" + e.timeStamp, debugMe);
			this.mouseDown = false;

			// generates another random identifier
			this.identifier = this._generateIdentifier();

		},

		onCancel:   function (eventTouch) {

			this.onEnd(eventTouch);

		},

		// todo: create a base Device class with these jQuery-related methods
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
			// whether or not a move event should be captured (we deal with dragging only for now)
			return this.mouseDown;

		},

	};

	TipTap.Mouse.identifier = TipTap.Mouse._generateIdentifier();

}(window.TipTap, _, window.jQuery));
