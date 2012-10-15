(function (TipTap, _) {
	/**
	 * An Action starts from a first start event (mousedown, touchstart) and ends after a small delay after the last
	 * pointer ended (mouseup, touchend). The small delay is here to allow combos of multiple Gestures, like double-tap (the
	 * classical double-clic in a mouse-only world).
	 */
	var Action = function (target$) {

		var debugMe = true && this.debugMe && TipTap.settings.debug;

		this.debugMe = true;

		// function bound with the gesture to use when called. Allows to call it from setTimeout or immediate (untip)
		this.boundEndComboAndMaybeAction = null;

		// store the reference to the timer waiting for a following Gesture. Allow to kill the timer
		this.endComboAndMaybeActionTimer = 0;

		// file of Gestures, to ensure a sequential treatment
		this.fifoOfGestures = [];

		// store here the last gesture before sending to application
		this.gesture = null;

		this.id = Action.id();

		// store the strings created from each Gesture. Combined to create the Combo
		this.listOfFormattedGestures = [];

		// will store the pointer list of pointers of the last gesture
		this.listOfPointers = null;

		// count of Pointers "active" (fingers touching, mouse down...)
		this.pressedPointersCount = 0;

		// "pointer" on the setTimeout of Gesture FIFO processing (scheduler)
		this.processGestureTimer = 0;

		// preallocating both to null might help optimizers / JIT
		this.target = null;
		this.$target = null;
		this._setTarget$(target$);

		md(this + '.new(' + (this.target ? this.target.id : this.$target[0].id) + '")', debugMe);

		// check if the target has already been processed by RotoZoomer
		if (TipTap.settings.rotoZoom) {

			// $target, rotateable, zoomable, autoApply
			this.rotoZoomer = new TipTap.RotoZoomer(target$, true, true, true);

		}

		// create the Signal objects to send
		this.createSignals();

	};

	Action.prototype = {

		addFingerListeners: function (finger) {
			// registers Action as each finger's Signals listener
			// allocateGesture takes two params: status and finger. _.bind attaches "this" and the first param
			finger.pressed.add(_.bind(this.allocateGesture, this, TipTap.Gesture._PRESSED), this);
			finger.tapped.add(_.bind(this.allocateGesture, this, TipTap.Gesture._TAPPED), this);
			finger.tipped.add(_.bind(this.allocateGesture, this, TipTap.Gesture._TIPPED), this);
			finger.untipped.add(_.bind(this.allocateGesture, this, TipTap.Gesture._UNTIPPED), this);
			finger.swiped.add(_.bind(this.allocateGesture, this, TipTap.Gesture._SWIPED), this);
			finger.dragStarted.add(_.bind(this.allocateGesture, this, TipTap.Gesture._DRAG_STARTED), this);
			finger.dragged.add(_.bind(this.allocateGesture, this, TipTap.Gesture._DRAGGED), this);
			finger.dragStopped.add(_.bind(this.allocateGesture, this, TipTap.Gesture._DRAG_STOPPED), this);
			finger.released.add(_.bind(this.allocateGesture, this, TipTap.Gesture._RELEASED), this);
		},

		allocateGesture: function (status, finger) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;
			var gesture;

			md(this + ".allocateGesture-1(" + TipTap.Gesture.statusMatchCode[status].code + ")", debugMe);

			/*
			 CLONE the pointerInfos, because:
			 1) the same can be used for different states (PRESSED and TIPPED or TAPPED)
			 2) to not let Finger alive because of links to living Pointers
			 */
			// copy Finger position, plus some stuff
			var pointerInfos = new TipTap.PointerInfos(finger, status);

			if (TipTap.Gesture._PRESSED === status) {

				// clears any pending Action termination timer
				this.cancelSendComboAndEndActionTimer();

			}

			// is there a Gesture which can accept this pointerInfos?
			gesture = _.find(this.fifoOfGestures, function (g) {

				return g.canThisPointerBeAdded(pointerInfos);

			}, this);

			// if no, create new and add to stack
			if (!gesture) {

				md(this + ".allocateGesture-must create new Gesture", debugMe);

				gesture = new TipTap.Gesture(status, finger.getDirection());

				// store in the FIFO of Gestures
				this.storeGesture(gesture);

			} else {

				// shouldn't happen
				md(this + ".allocateGesture-using gesture " + gesture, debugMe, "#00F");

			}

			// inner "event loop" of gestures treatment
			this.startGesturesListProcessingTimer();

			md(this + ".allocateGesture-4", debugMe);

			gesture.addPointer(pointerInfos);

			return gesture;

		},

		buildAndSendNotificationGesture: function (gesture) {

			// small shortcut for the app
			this.gesture = gesture;

			// small shortcut for the app
			this.listOfPointers = gesture.listOfPointers;

			this.sendCombo.dispatch(this, this.formatGesture(gesture));

		},

		buildComboClearGesturesAndSendCombo: function (gesture) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var combo = this.listOfFormattedGestures.join(TipTap.settings.comboGesturesSep);

			md(this + ".buildComboClearGesturesAndSendCombo-1:[" + combo + "]", debugMe);

			this.clearListOfFormattedGestures();

			this.sendCombo.dispatch(this, combo, gesture);

		},

		cancelSendComboAndEndActionTimer: function () {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".cancelSendComboAndEndActionTimer-1", debugMe, "");

			if (this.endComboAndMaybeActionTimer) {

				md(this + ".cancelSendComboAndEndActionTimer-clearTimeout", debugMe, "");

				clearTimeout(this.endComboAndMaybeActionTimer);

				this.endComboAndMaybeActionTimer = 0;

			}

		},

		clearListOfFormattedGestures: function () {

			this.listOfFormattedGestures.length = 0;

		},

		consumeDoneGesturesFromFIFO: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var gesture;

			// Don't forget to clear the timer!!
			this.processGestureTimer = 0;

			md(this + ".consumeDoneGesturesFromFIFO-1", debugMe);

			// while there are Gestures to process
			while (this.fifoOfGestures.length) {

				// take first (oldest) one
				gesture = this.fifoOfGestures[0];

				md(this + ".consumeDoneGesturesFromFIFO-treating(" + gesture + "." + gesture.status + ")", debugMe);

				// if too recent and not in dragged status
				if ((TipTap.settings.simultaneousMovesTimer_ms > gesture.age()) &&
					// once in dragged state, send events as soon as possible to avoid "lag", so age doesn't count
					(gesture.status !== TipTap.Gesture._DRAGGED)) {

					md(this + ".consumeDoneGesturesFromFIFO-too young and != 'dragged', EXITING", debugMe);

					// restart the scheduler to come back later
					this.startGesturesListProcessingTimer();

					// and exit
					return;

				}

				// remove the Gesture from the list
				this.fifoOfGestures.shift();

				//rotZoom = gesture.getRotationAndZoom();

				// call the function corresponding to the status
				this[TipTap.Gesture.statusMatchCode[gesture.status].code].call(this, gesture);

			}

		},

		createSignals: function () {
			var Signal = signals.Signal;

			this.pressed = new Signal();

			this.sendCombo = new Signal();

			this.dragStarted = new Signal();

			this.dragged = new Signal();

			this.dragStopped = new Signal();

			this.released = new Signal();

			this.finished = new Signal();

		},

		endComboAndMaybeAction: function (gesture) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".endComboAndMaybeAction-1(" + this.endComboAndMaybeActionTimer + ", " + gesture + ")", debugMe, "");

			this.endComboAndMaybeActionTimer = 0;

			this.buildComboClearGesturesAndSendCombo(gesture);

			// if no more Pointers active, kill the Action
			this.terminateIfEmpty();

		},

		flushPreviousGesture: function () {

			// in case of untip, we must flush previous complex gestures because combos are for Tap and Swipe only
			this.boundEndComboAndMaybeAction && this.boundEndComboAndMaybeAction();

			this.boundEndComboAndMaybeAction = null;

		},

		formatGesture: function (gesture) {
			// todo: storeGestureForCombo, store full Gesture, and format on last moment?
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var tips;

			var formattedGesture = gesture.format();

			// shall we include the "tip" prefix in the matching combo?
			if (TipTap.settings.useTipPrefixes) {

				// get the "background" tipping count to send it: tip3-tip for example
				tips = TipTap.Gesture.formatGesture(TipTap.Gesture._TIPPED, this.pressedPointersCount);

				if (tips) {

					// eg: tip3-tip
					formattedGesture = tips + TipTap.settings.comboParallelActionOperator + formattedGesture;

				}

			}

			md(this + ".formatGesture-1(" + formattedGesture + ")", debugMe);

			return formattedGesture;

		},

		formatAndStoreGesture: function (gesture) {
			// todo: storeGestureForCombo, store full Gesture, and format on last moment? Must store tips count with Gesture!
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".formatAndStoreGesture(" + gesture + "," + this.formatGesture(gesture) + ")", debugMe, "#F00");

			this.listOfFormattedGestures.push(this.formatGesture(gesture));

		},

		getPointer: function (index) {

			return this.gesture.getPointer(index);

		},

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		hasPressedPointers: function () {

			return (this.pressedPointersCount > 0);

		},

		_setTarget$: null,

		_setTarget: function (target) {

			this.target = target;

		},

		_set$Target: function ($target) {

			this.$target = $target;

		},

		startGesturesListProcessingTimer: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			if (this.processGestureTimer) {

				md(this + ".startProcessGestureTimer-no need to start timer", debugMe);

				return;

			}

			// start the timer of the Gesture: lifefime == duration of simultaneity tolerance
			this.processGestureTimer = setTimeout(

				_.bind(this.consumeDoneGesturesFromFIFO, this),

				TipTap.settings.simultaneousMovesTimer_ms / 4

			);

			md(this + ".startProcessGestureTimer-timer started(" + this.processGestureTimer + ")", debugMe);

		},

		startSendComboAndEndActionTimer: function (gesture) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			this.boundEndComboAndMaybeAction = _.bind(this.endComboAndMaybeAction, this, gesture);

			// tap/swipe wait for the time needed to do a possible next gesture within the same combo
			this.endComboAndMaybeActionTimer =

				setTimeout(

					this.boundEndComboAndMaybeAction,

					TipTap.settings.comboEndTimer_ms

				);

			md(this + ".startSendComboAndEndActionTimer-1(" + gesture +
				   ", " + this.endComboAndMaybeActionTimer + ")", debugMe, "");

		},

		storeGesture: function (gesture) {

			this.fifoOfGestures.push(gesture);

		},

		terminateIfEmpty: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			if (this.hasPressedPointers()) {

				return;

			}

			md(this + ".terminateIfEmpty-1", debugMe);

			// if no more pressed pointers, Action is finished
			this.finished.dispatch(this);

		},

		toString: function () {
			return "-A#" + this.id;
		},

		zoomElement: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;
			var $t = this.$target;
			var bb, eg;

			/*$t.css('webkitTransformOrigin', cx + ' ' + cy + '')
			 .css('webkitTransform', 'scale(' + this.zoomX.absoluteZoom + ',' + this.zoomY.absoluteZoom + ')');*/
			bb = this.fingersBoundingBox;
			eg = this.elementGeometry;

			// resize the element by taking the new Fingers bounding box dimensions, and adding the deltas
			$t.width(bb.width + eg.width).height(bb.height + eg.height);
			$t.offset({
				          left: bb.left + eg.left,
				          top:  bb.top + eg.top
			          });
		}

	};

	// just to make things faster. Not sure it's *so* clean to have methods names based on another class' properties value
	var gesture = TipTap.Gesture;

	// status callback. Names are dynamically created from gestures codes, avoid keeping two source files in sync
	Action.prototype[gesture.statusMatchCode[gesture._PRESSED].code] = function (gesture) {

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onPressed(gesture);
		}

		// notification gestures are not stored in the formatted list
		this.buildAndSendNotificationGesture(gesture);

	};

	// tap and swipe are treated the same
	Action.prototype[gesture.statusMatchCode[gesture._SWIPED].code] =
		Action.prototype[gesture.statusMatchCode[gesture._TAPPED].code] =
			function (gesture) {

				this.cancelSendComboAndEndActionTimer();

				// store gesture at the last moment, to avoid issue with "release", due to small wait for tab/swipe
				this.formatAndStoreGesture(gesture);

				// only tab and swipe are "chainable" anymore, doing tip and a tap shortly after doesn't make much sense as a Combo
				this.startSendComboAndEndActionTimer(gesture);

			};

	Action.prototype[gesture.statusMatchCode[gesture._TIPPED].code] = function (gesture) {
		var debugMe = true && this.debugMe && TipTap.settings.debug;

		this.formatAndStoreGesture(gesture);

		// we increase the "tips count" AFTER storing the gesture, so that a single tip doesn't generate tip-tip
		this.pressedPointersCount += gesture.pointersCount();

		this.buildComboClearGesturesAndSendCombo(gesture);

	};

	Action.prototype[gesture.statusMatchCode[gesture._UNTIPPED].code] = function (gesture) {
		var debugMe = true && this.debugMe && TipTap.settings.debug;

		/* we remove tips from "tips count" BEFORE, because we it's not logical to see the untipped fingers counted as tip.
		 Even if the "untip" event happens while tipping, from a human point of view, when you untip, the finger is not
		 tipping anymore. So, for one finger, you expect "untip", not "tip-untip". At least, I do. And I'm the boss here :-D
		 */

		this.pressedPointersCount -= gesture.pointersCount();

		// cancel any planned automatic sending, because an untip causes immediate sending
		this.cancelSendComboAndEndActionTimer();

		// an untip must not be chained to previous gestures anymore, doesn't really make sense
		this.flushPreviousGesture();

		this.formatAndStoreGesture(gesture);

		this.buildComboClearGesturesAndSendCombo(gesture);

		// if no more Pointers active, kill the Action
		this.terminateIfEmpty();

	};

	Action.prototype[gesture.statusMatchCode[gesture._DRAG_STARTED].code] = function (gesture) {

		// notification gestures are not stored in the formatted list

		this.buildAndSendNotificationGesture(gesture);

	};

	Action.prototype[gesture.statusMatchCode[gesture._DRAGGED].code] = function (gesture) {
		var debugMe = true && this.debugMe && TipTap.settings.debug;

		md(this + ".drag", debugMe);

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onDrag(gesture);

		}

		this.gesture = gesture;

		// the power (^n) of the combo is the count of TOUCHING fingers, not MOVING!
		this.dragged.dispatch(this, gesture.format());

	};

	Action.prototype[gesture.statusMatchCode[gesture._DRAG_STOPPED].code] = function (gesture) {

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onStoppedDragging(gesture);

		}

		// notification gestures are not stored in the formatted list
		this.buildAndSendNotificationGesture(gesture);

	};

	Action.prototype[gesture.statusMatchCode[gesture._RELEASED].code] = function (gesture) {

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onReleased(gesture);

		}

		// notification gestures are not stored in the formatted list
		this.buildAndSendNotificationGesture(gesture);

	};


	Action.id = function () {
		Action._id++;

		return Action._id;
	};

	Action._id = 0;

	Action.use$ = function (use$) {

		if (use$) {
			// replaces methods. I know, I "should" use decorators, but it's a bit heavy for this.
			this.prototype._setTarget$ = this.prototype._set$Target;
			this.prototype.getTarget$ = this.prototype.get$Target;

		} else {

			this.prototype._setTarget$ = this.prototype._setTarget;
			this.prototype.getTarget$ = this.prototype.getTarget;

		}

	};

	// namespaces the thing
	TipTap.Action = Action;

}(window.TipTap, _));
