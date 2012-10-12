(function (TipTap) {
	// TODO: management of two buttons. click, clack, unclick, clickl, clickr, clackl, clackr

	// namespaces the thing
	Mouse = {

		debugMe: true,

		START_EVENT_NAME:  'mousedown',
		DRAG_EVENT_NAME:   'mousemove',
		END_EVENT_NAME:    'mouseup',
		CANCEL_EVENT_NAME: 'mousecancel', // doesn't exist, but needed for getStartEventName: 'mousedown' + ((TipTap.settings.use$)?'.TipTap':''),

		mouseDown:      false,

		// todo: create a base Device class with these jQuery-related methods
		buildEventList: function (event) {
			// if not left click, don't consider event
			if (event.button !== 0) {

				return [];

			}

			return [new TipTap.MouseEvent(event)];

		},

		onStart: function (tiptapEvent) {

			this.mouseDown = true;

		},

		onDrag: function (tiptapEvent) {
		},

		onEnd: function (tiptapEvent) {

			//md("Mouse up:" + e.timeStamp, debugMe);
			this.mouseDown = false;

		},

		onCancel: function (tiptapEvent) {

			this.onEnd(tiptapEvent);

		},

		shouldCaptureDrag: function () {

			// whether or not a move event should be captured (we deal with dragging only for now)
			return this.mouseDown;

		},

		use$: function () {

			TipTap.MouseEvent.use$();

		},

	};

	TipTap.Mouse = Mouse;

}(window.TipTap));
