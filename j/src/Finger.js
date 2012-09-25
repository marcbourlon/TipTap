(function (TipTap, _) {

	var Finger = function (eventTouch) {
		this.debugMe = true;

		var debugMe = true && TipTap.settings.debug && this.debugMe;

		// to store the list of "pointer" informations for this Finger during its life
		this.listOfPositions = [];

		this.identifier = eventTouch.identifier;

		// important to keep $target to force it to new Pointers (fast moves can make mouse go out of initial $target)
		this.$target = eventTouch.$target;

		this.direction = Finger._DIR_NONE;

		// used to store details about the absolute drag: distance (x, y, total), speed (x, y, total), duration
		this.absDrag = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// used to store details about the relative drag (between two last positions)
		this.relDrag = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// reference to the timer used to switch from tap to tip, allows to kill it when Finger up early
		this.pressedToTippedTimer = 0;

		// the Signals to send to watchers
		this.createSignals();

		// we store all positions
		this.storePosition(eventTouch);

		md(this + ".new()", debugMe)
	};

	/* "stateless" finite state machine, shared by all Fingers. Stateless means that each Finger's state is stored in
	 the Finger itself. Advantage: ONE FSM for all Fingers => don't recreate the SAME FSM for each Finger, EACH TIME
	 a new Finger is created, which wastes some CPU time, and means more GC in the end.
	 */
	Finger.fsm = new TipTap.Fsm(TipTap.Fsm.DONT_SAVE_STATE);

	// todo: factor similar actions in functions (tip-startDragging-drag and startDragging-drag for example)
	// todo: dragStopped ?
	// in this FSM, all callbacks' "this" refers to the Finger calling.
	Finger.fsm.init(
		[
			{
				from:        "start",
				isStart:     true,
				transitions: [
					{
						signal: "pressed",
						to:     "pressing",
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;
							var position = this.getPosition();

							// start the timer which after the time limit transforms the press (potential tap) to a sure tip
							this.startPressedToTippedTimer();

							// let's tell the world we pressed !
							this.pressed.dispatch(this);

							md(this + "-fsm(start-pressed-pressing),(" + position.pageX + "px, " + position.pageY + "px)", debugMe)

						}
					}
				]
			},
			{
				from:        "pressing",
				transitions: [
					{
						signal: "pressedToTipped",
						to:     "tipping",
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							md(this + "-fsm(pressing-pressedToTipped-tipping)", debugMe)

							this.tipped.dispatch(this);

						}
					},
					{
						signal: "dragged",
						to:     TipTap.Fsm._CALC,
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;
							var state;

							// if not really dragged, move away without doing anything
							if (!this.wasReallyDragged()) {
								return TipTap.Fsm._SELF;
							}

							md(this + "-fsm(pressing-dragged-1)", debugMe);

							// because we moved for good, we cancel the planned change of state
							this.cancelPressedToTippedTimer();

							// detects if the move is a swipe
							state = this.isSwipingOrDragging();

							md(this + "-fsm(pressing-dragged-2)", debugMe);

							// if we detect a swipe, we must go to the corresponding state
							if (state === "swiping") {
								return state;
							}

							md(this + "-fsm(pressing-dragged-3)", debugMe);

							// tell the world we started a drag :-)
							this.dragStarted.dispatch(this);

							// and that we dragged
							this.dragged.dispatch(this);

							return "dragging";
						}
					},
					{
						signal: ["ended", "cancelled"],
						to:     "end",
						action: function () {

							var debugMe = true && TipTap.settings.debug && this.debugMe;

							this.cancelPressedToTippedTimer();

							md(this + "-fsm(pressing-ended-end)", debugMe)

							this.tapped.dispatch(this);

							this.released.dispatch(this);

						}
					}
				]
			},
			{
				from:        "tipping",
				transitions: [
					{
						signal: "dragged",
						to:     TipTap.Fsm._CALC,
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							// if not really dragged, move away without doing anything
							if (!this.wasReallyDragged()) {
								return TipTap.Fsm._SELF;
							}

							md(this + "-fsm(tipping-dragged-1)", debugMe);

							this.dragStarted.dispatch(this);

							// and that we dragged
							this.dragged.dispatch(this);

							md(this + "-fsm(tipping-dragged-2)", debugMe);

							return "dragging";
						}
					},
					{
						signal: ["ended", "cancelled"],
						to:     "end",
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							md(this + "-fsm(tipping-ended)", debugMe)

							this.untipped.dispatch(this);

							this.released.dispatch(this);

						}
					}
				]
			},
			{
				from:        "dragging",
				transitions: [
					{
						signal: "dragged",
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							md(this + "-fsm(dragging-dragged-1)", debugMe)

							this.dragged.dispatch(this);

						}
					},
					{
						signal: ["ended", "cancelled"],
						to:     "end",
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							this.dragStopped.dispatch(this);

							md(this + "-fsm(dragging-ended-1)", debugMe)

							this.untipped.dispatch(this);

							this.released.dispatch(this);

						}
					}
				]
			},
			{
				from:        "swiping",
				transitions: [
					{
						signal: "dragged",
						to:     TipTap.Fsm._CALC,
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							// if the movement is too much for being a swipe, convert it down to a normal drag
							if (!this.notSwipingAnymore()) {

								return TipTap.Fsm._SELF;

							}

							this.dragStarted.dispatch(this);

							md(this + "-fsm(swiping-dragged-1)", debugMe);

							this.dragged.dispatch(this);

							return "dragging";
						}

					},
					{
						signal: ["ended", "cancelled"],
						to:     "end",
						action: function () {
							var debugMe = true && TipTap.settings.debug && this.debugMe;

							md(this + "-fsm(swiping-ended-1)", debugMe)

							this.swiped.dispatch(this);

							this.released.dispatch(this);

						}
					}
				]
			}
		]
	);

	Finger._DIR_NONE = 0;
	Finger._DIR_TOP = 1;
	Finger._DIR_RIGHT = 2;
	Finger._DIR_BOTTOM = 4;
	Finger._DIR_LEFT = 8;

	Finger.prototype = {
		addPosition: function (pointer) {
			this.listOfPositions.push(pointer);
		},

		cancelPressedToTippedTimer: function () {

			var debugMe = true && TipTap.settings.debug && this.debugMe;

			md(this + ".cancelPressedToTippedTimer-1", debugMe);

			if (this.pressedToTippedTimer) {

				md(this + ".cancelPressedToTippedTimer-2", debugMe);

				clearTimeout(this.pressedToTippedTimer);

				this.pressedToTippedTimer = 0;

			}

		},

		_computeMove: function (index1, index2) {
			var ei1 = this.listOfPositions[index1],
				ei2 = this.listOfPositions[index2],
				dx = ei2.pageX - ei1.pageX,
				dy = ei2.pageY - ei1.pageY,
				d = Math.sqrt(dx * dx + dy * dy),
				duration_ms = ei2.timeStamp - ei1.timeStamp,
				spx = dx / duration_ms,
				spy = dy / duration_ms,
				spd = d / duration_ms;
			return { dx: dx, dy: dy, d: d, spx: spx, spy: spy, spd: spd, duration_ms: duration_ms };
		},

		computeAbsMove: function () {

			return this._computeMove(0, this.listOfPositions.length - 1);

		},

		computeRelMove: function () {

			return this._computeMove(
				this.listOfPositions.length - 2,
				this.listOfPositions.length - 1
			);

		},

		createSignals: function () {
			// Miller Medeiros' Signals lib
			var Signal = signals.Signal;

			this.pressed = new Signal();
			this.tapped = new Signal();
			this.tipped = new Signal();
			this.untipped = new Signal();
			this.swiped = new Signal();
			this.dragStarted = new Signal();
			this.dragged = new Signal();
			this.dragStopped = new Signal();
			this.released = new Signal();
		},

		getDirection: function () {

			return this.direction;

		},

		getInitialPosition: function () {

			return this.listOfPositions[0];

		},

		getPosition: function () {

			return this.listOfPositions[this.listOfPositions.length - 1];

		},

		getState: function () {

			return this.state;

		},

		isSwipingOrDragging: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			var settings = TipTap.settings;
			var dx, dy, adx, ady;

			// if this.isMoving is not set, it's the first drag event. Calculate displacement from start position
			dx = this.relDrag.dx;
			adx = Math.abs(dx);
			dy = this.relDrag.dy;
			ady = Math.abs(dy);

			md(this + ".isSwipingOrDragging-1: " + this.absDrag.duration_ms + "px", debugMe)

			// Swipe is defined by: 'dragged "a lot" and just after "start" '
			if (this.absDrag.duration_ms <= settings.SWIPE_START_DELAY_ms) {

				md(this + ".isSwipingOrDragging-2", debugMe)
				if (adx >= ady) {
					if (adx >= settings.SWIPE_MIN_DISPLACEMENT_px) {
						if (dx > 0) {
							md(this + ".isSwipingOrDragging > swipe-r", debugMe)
							this.direction = Finger._DIR_RIGHT;
						} else {
							md(this + ".isSwipingOrDragging > swipe-l", debugMe)
							this.direction = Finger._DIR_LEFT;
						}
					}
				} else {
					if (ady >= settings.SWIPE_MIN_DISPLACEMENT_px) {
						if (dy > 0) {
							md(this + ".isSwipingOrDragging > swipe-b", debugMe)
							this.direction = Finger._DIR_BOTTOM;
						} else {
							md(this + ".isSwipingOrDragging > swipe-t", debugMe)
							this.direction = Finger._DIR_TOP;
						}
					}
				}
				return "swiping";
			}
			return "tipping";
		},

		notSwipingAnymore: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;
			var settings = TipTap.settings;

			md(this + ".notSwipingAnymore: " + this.absDrag.duration_ms + "ms, " + this.absDrag.d + "px", debugMe)

			return (this.absDrag.duration_ms > settings.SWIPE_DURATION_ms) ||
				(this.absDrag.d > settings.SWIPE_MAX_DISTANCE_px);
		},

		onDrag: function (eventTouch) {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			this.storePosition(eventTouch);

			// computes all the important movement values: distance, speed, duration_ms...
			this.absDrag = this.computeAbsMove();
			this.relDrag = this.computeRelMove();

			Finger.fsm.dragged.call(this);
		},

		onEnd: function (eventTouch) {

			this.storePosition(eventTouch);

			Finger.fsm.ended.call(this);

		},

		onStart: function () {
			Finger.fsm.pressed.call(this);
		},

		pressedToTipped: function () {

			Finger.fsm.pressedToTipped.call(this);

		},

		startPressedToTippedTimer: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			md(this + ".startPressedToTippedTimer-1", debugMe);

			if (!this.pressedToTippedTimer) {

				md(this + ".startPressedToTippedTimer-2", debugMe);

				// start the timer
				this.pressedToTippedTimer = setTimeout(_.bind(this.pressedToTipped, this),
				                                       TipTap.settings.TAP_MAX_DURATION_ms);

			}
		},

		storePosition: function (eventTouch) {
			this.addPosition(new TipTap.Position(eventTouch));
		},

		toString: function () {
			return "---F#" + this.identifier;
		},

		wasReallyDragged: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			var settings = TipTap.settings;

			md(this + ".wasReallyDragged", debugMe);

			return ((Math.abs(this.absDrag.dx) > settings.MOVE_THRESHOLD_px) ||
				(Math.abs(this.absDrag.dy) > settings.MOVE_THRESHOLD_px));
		}
	};

	// namespacing
	TipTap.Finger = Finger;

}(window.TipTap, _));
