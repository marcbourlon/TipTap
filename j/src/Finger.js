(function (TipTap, _) {

	var Finger = function (tiptapEvent) {
		this.debugMe = true;

		var debugMe = true && TipTap.settings.debug && this.debugMe;

		this.direction = Finger._DIR_NONE;

		this.identifier = tiptapEvent.identifier;

		// the flag is set if the Finger has tipped before doing other things. Simplifies FSM logic a lot!!
		this.isTipping = false;

		// to store the list of "pointer" informations for this Finger during its life
		this.listOfPositions = [];

		// used to store details about the absolute drag: distance (x, y, total), speed (x, y, total), duration
		this.dragDetailsAbsolute = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// used to store details about the relative drag (between two last positions)
		this.dragDetailsRelative = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// reference to the timer used to switch from tap to tip, allows to kill it when Finger up early
		this.pressedToTippedTimer = 0;

		// index of the positions list of when the swipe started (to calculate values)
		this.swipeStartPositionIndex = 0;

		// keep a reference to the initial target to force it to new Pointers (fast moves can make mouse move outside of it)
		this.target = null;
		this.$target = null;
		this._setTarget$(tiptapEvent.getTarget$());

		// create the Signals to send to listeners
		this.createSignals();

		// we store all positions
		this.storePosition(tiptapEvent);

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

							/*
							 swipe and dragStop are fully similar and can be done from press or tip. But in the case of coming
							 after a tip, we need to send untip at the end. A flag allows to avoid FSM states duplication
							 */
							this.isTipping = true;

							this.tipped.dispatch(this);

						}
					},
					{
						signal: "dragged",
						to:     TipTap.Fsm._CALC,
						action: function () {

							return this.fsmDraggedTransition();

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

							return this.fsmDraggedTransition();

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

							// usage of this flag simplifies the Fsm
							if (this.isTipping) {

								this.untipped.dispatch(this);

							}

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

							// usage of this flag simplifies the Fsm
							if (this.isTipping) {

								this.untipped.dispatch(this);

							}

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

		addPosition: function (position) {

			this.listOfPositions.push(position);

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

		fsmDraggedTransition: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;
			var state;

			// if not really dragged, move away without doing anything
			if (this.wasAnUncontrolledMove()) {

				return TipTap.Fsm._SELF;

			}

			md(this + "-fsm(pressing-dragged-1)", debugMe);

			// because we moved for good, we cancel the planned change of state. Useless in the case of transiting from TIP
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

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		isSwipingOrDragging: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			var settings = TipTap.settings;
			var dx, dy, adx, ady;

			dx = this.dragDetailsRelative.dx;
			adx = Math.abs(dx);
			dy = this.dragDetailsRelative.dy;
			ady = Math.abs(dy);

			//md(this + ".isSwipingOrDragging-1: " + this.dragDetailsAbsolute.duration_ms + "px", debugMe)

			md(this + ".isSwipingOrDragging-2", debugMe)

			if (adx >= ady) {

				md(this + ".isSwipingOrDragging, adx: " + adx, debugMe, "#0F0")

				if (adx >= settings.swipeMinDisplacement_px) {

					if (dx > 0) {

						md(this + ".isSwipingOrDragging > swipe-r", debugMe)

						this.direction = Finger._DIR_RIGHT;

					} else {

						md(this + ".isSwipingOrDragging > swipe-l", debugMe)

						this.direction = Finger._DIR_LEFT;

					}

					this.swipeStartPositionIndex = this.listOfPositions.length - 1;

					return "swiping";

				}
			} else {

				if (ady >= settings.swipeMinDisplacement_px) {

					if (dy > 0) {

						md(this + ".isSwipingOrDragging > swipe-b", debugMe)

						this.direction = Finger._DIR_BOTTOM;

					} else {

						md(this + ".isSwipingOrDragging > swipe-t", debugMe)

						this.direction = Finger._DIR_TOP;

					}

					this.swipeStartPositionIndex = this.listOfPositions.length - 1;

					return "swiping";

				}

			}

			return "tipping";

		},

		notSwipingAnymore: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;
			var settings = TipTap.settings;

			md(this + ".notSwipingAnymore: " + this.dragDetailsAbsolute.duration_ms + "ms, " + this.dragDetailsAbsolute.d + "px", debugMe)

			return (
				this._computeMove(
					this.swipeStartPositionIndex,
					this.listOfPositions.length - 1).duration_ms >
					settings.swipeDuration_ms
				) || (this.dragDetailsAbsolute.d > settings.swipeMaxDistance_px);
		},

		onDrag: function (eventTouch) {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			this.storePosition(eventTouch);

			// computes all the important movement values: distance, speed, duration_ms...
			this.dragDetailsAbsolute = this.computeAbsMove();
			this.dragDetailsRelative = this.computeRelMove();

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

		_setTarget$: null,

		_setTarget: function (target) {

			this.target = target;

		},

		_set$Target: function ($target) {

			// add jQuery object wrapper for the DOM
			this.$target = $target;

		},

		startPressedToTippedTimer: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			md(this + ".startPressedToTippedTimer-1", debugMe);

			if (!this.pressedToTippedTimer) {

				md(this + ".startPressedToTippedTimer-2", debugMe);

				// start the timer
				this.pressedToTippedTimer = setTimeout(_.bind(this.pressedToTipped, this),
				                                       TipTap.settings.tapMaxDuration_ms);

			}
		},

		storePosition: function (eventTouch) {

			this.addPosition(new TipTap.Position(eventTouch));

		},

		toString: function () {
			return "---F#" + this.identifier;
		},

		wasAnUncontrolledMove: function () {
			var debugMe = true && TipTap.settings.debug && this.debugMe;

			var settings = TipTap.settings;

			md(this + ".wasAnUncontrolledMove(" +
				   Math.abs(this.dragDetailsAbsolute.dx) + "px, " +
				   Math.abs(this.dragDetailsAbsolute.dy) + "px)", debugMe);

			return ((Math.abs(this.dragDetailsAbsolute.dx) <= settings.moveThreshold_px) &&
				(Math.abs(this.dragDetailsAbsolute.dy) <= settings.moveThreshold_px));
		}

	};

	Finger.use$ = function (use$) {

		if (use$) {

			this.prototype.getTarget$ = this.prototype.get$Target;
			this.prototype._setTarget$ = this.prototype._set$Target;

		} else {

			this.prototype.getTarget$ = this.prototype.getTarget;
			this.prototype._setTarget$ = this.prototype._setTarget;

		}


	};


	// namespacing
	TipTap.Finger = Finger;

}(window.TipTap, _));
