(function (TipTap, _, $) {

	// TODO: management of two buttons. click, clack, unclick, clickl, clickr, clackl, clackr
	var Mouse = function () {
		this.debugMe = true;

		this.mouseDown = false;

		// initialize with a random identifier. Why not 0, btw? Hmm...
		this.identifier = this.generateIdentifier();

		this.START_EVENT = 'mousedown';

		this.DRAG_EVENT = 'mousemove';

		this.END_EVENT = 'mouseup';

		this.CANCEL_EVENT = 'mousecancel'; // doesn't exist, but needed for common "Facade" pattern with Touch

	}

	Mouse.prototype = {
		buildEtList: function (e) {
			// if not left click, don't consider event
			// todo: without jQuery :'(
			if (e.button !== 0) {

				return [];

			}
			e.identifier = this.identifier;
			e.$target = $(e.target);
			return [e];
		},

		generateIdentifier: function () {
			if (!this.identifier) {
				return Math.pow(2, 32) * Math.random();
			}
			return this.identifier + 1;
		},

		onStart: function (eventTouch) {
			this.mouseDown = true;
		},

		onDrag: function (e) {
		},

		onEnd: function (eventTouch) {
			//md("Mouse up:" + e.timeStamp, debugMe);
			this.mouseDown = false;

			// generates another random identifier
			this.identifier = this.generateIdentifier();
		},

		onCancel: function (eventTouch) {  // this should never be called, the event simply doesn't exist for Mouse
			this.onEnd(eventTouch);
		},

		shouldCaptureDrag: function (e) {
			// whether or not a move event should be captured (we deal with dragging only for now)
			return this.mouseDown;
		}
	};

	// namespaces the thing
	TipTap.Mouse = Mouse;

}(window.TipTap, _, window.jQuery));
