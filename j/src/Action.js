(function (TipTap, _) {
	/**
	 * An Action starts from a first start event (mousedown, touchstart) and ends after a small delay after the last
	 * pointer ended (mouseup, touchend). The small delay is here to allow combos of multiple Gestures, like double-tap (the
	 * classical double-clic in a mouse-only world).
	 */
	var Action = function (target$) {

		var debug = false && Action.debug && TipTap.settings.debug;

		// function bound with the gesture to use when called. Allows to call it from setTimeout or immediate (untip)
		this.boundEndComboAndMaybeAction = null;

		// store the reference to the timer waiting for a following Gesture. Allow to kill the timer
		this.endComboAndMaybeActionTimer = 0;

		// file of HICSs, to ensure a sequential treatment
		this.fifoOfHics = [];

		// store here the last gesture before sending to application
		this.gesture = null;

		this.id = Action.id();

		// store the strings created from each Gesture. Combined to create the Combo
		this.listOfFormattedGestures = [];

		// will store the pointer list of pointers of the last gesture
		this.listOfPointers = null;

		// count of Pointers "active" (fingers touching, mouse down...)
		this.pressedPointersCount = 0;

		// "pointer" on the setTimeout of Hics FIFO processing (scheduler)
		this.processHicsTimer = 0;

		// preallocating both to null might help optimizers / JIT
		this.target = null;
		this.$target = null;
		this._setTarget$(target$);

		md(this + '.new(' + (this.target ? this.target.id : this.$target[0].id) + '")', debug);

		// check if the target has already been processed by RotoZoomer
		if (TipTap.settings.rotoZoom) {

			// $target, rotateable, zoomable, autoApply
			this.rotoZoomer = new TipTap.RotoZoomer(target$, true, true, true);

		}

		// create the Signal objects to send
		this.createSignals();

	};

	Action.prototype = {

		addPointerListeners: function (pointer) {
			// get ready to, at each Pointer signal, add it to a Hics of the same kind
			pointer.pressed.add(_.bind(this.allocateHics, this, TipTap.Gesture._PRESSED, pointer));
			pointer.tapped.add(_.bind(this.allocateHics, this, TipTap.Gesture._TAPPED, pointer));
			pointer.tipped.add(_.bind(this.allocateHics, this, TipTap.Gesture._TIPPED, pointer));
			pointer.untipped.add(_.bind(this.allocateHics, this, TipTap.Gesture._UNTIPPED, pointer));
			pointer.swiped.add(_.bind(this.allocateHics, this, TipTap.Gesture._SWIPED, pointer));
			pointer.dragStarted.add(_.bind(this.allocateHics, this, TipTap.Gesture._DRAG_STARTED, pointer));
			pointer.dragged.add(_.bind(this.allocateHics, this, TipTap.Gesture._DRAGGED, pointer));
			pointer.dragStopped.add(_.bind(this.allocateHics, this, TipTap.Gesture._DRAG_STOPPED, pointer));
			pointer.released.add(_.bind(this.allocateHics, this, TipTap.Gesture._RELEASED, pointer));
		},

		allocateHics: function (status, pointer) {
			var debug = true && Action.debug && TipTap.settings.debug;

			md(this + ".allocateHics-1(" + TipTap.Gesture.statusMatchCode[status].code + ")", debug);

			/*
			 CLONE the PointerInfos, because:
			 1) the same can be used for different states (PRESSED and TIPPED or TAPPED)
			 2) to not let Pointer alive because of links to still living PointerInfos
			 */
			var pointerInfos = new TipTap.PointerInfos(pointer, status);

			if (status === TipTap.Gesture._PRESSED) {

				// clear any pending Action termination timer
				this.cancelSendComboAndEndActionTimer();

			}

			// is there a Hics which can accept this pointerInfos?
			var hics = _.find(this.fifoOfHics, function (h) {

				return h.canThisPointerBeAdded(pointerInfos);

			}, this);

			// if no, create new and add to stack
			if (!hics) {

				md(this + ".allocateHics-must create new Hics", debug);

				hics = new TipTap.Hics(status, pointer.getDirection());

				this.storeHics(hics);

			}

			// inner "event loop" of Hics treatment
			this.startHicsListProcessingTimer();

			md(this + ".allocateHics-4", debug);

			hics.addPointer(pointerInfos);

			return hics;

		},

		buildAndSendNotificationGesture: function (hics) {

			// small shortcut for the app. TODO: deal with gesture/hics concept problem
			this.gesture = hics;

			// small shortcut for the app
			this.listOfPointers = hics.listOfPointers;

			this.sendCombo.dispatch(this.includeHicsInGesture(hics));

		},

		buildComboClearGesturesAndSendCombo: function (gesture) {

			var debug = true && Action.debug && TipTap.settings.debug;

			var combo = this.listOfFormattedGestures.join(TipTap.settings.comboGesturesSep);

			md(this + ".buildComboClearGesturesAndSendCombo-1:[" + combo + "]", debug);

			this.clearListOfFormattedGestures();

			this.sendCombo.dispatch(combo, gesture);

		},

		cancelSendComboAndEndActionTimer: function () {

			var debug = true && Action.debug && TipTap.settings.debug;

			md(this + ".cancelSendComboAndEndActionTimer-1", debug, "");

			if (this.endComboAndMaybeActionTimer) {

				md(this + ".cancelSendComboAndEndActionTimer-clearTimeout", debug, "");

				clearTimeout(this.endComboAndMaybeActionTimer);

				this.endComboAndMaybeActionTimer = 0;

			}

		},

		clearListOfFormattedGestures: function () {

			this.listOfFormattedGestures.length = 0;

		},

		consumeDoneHicsFromFIFO: function () {
			var debug = true && Action.debug && TipTap.settings.debug;

			var hics;

			// Don't forget to clear the timer!!
			this.processHicsTimer = 0;

			md(this + ".consumeDoneGesturesFromFIFO-1", debug);

			var methodsArray = TipTap.Gesture.statusMatchCode;

			// while there are Gestures to process
			while (this.fifoOfHics.length) {

				// take first (oldest) one
				hics = this.fifoOfHics[0];

				md(this + ".consumeDoneGesturesFromFIFO-treating(" + hics + "." + hics.status + ")", debug);

				// if too recent and not in dragged status
				if ((TipTap.settings.simultaneousMovesTimer_ms > hics.age()) &&
					// once in dragged state, send events as soon as possible to avoid "lag", so age doesn't count
					(hics.status !== TipTap.Gesture._DRAGGED)) {

					md(this + ".consumeDoneGesturesFromFIFO-too young and != 'dragged', EXITING", debug);

					// restart the scheduler to come back later
					this.startHicsListProcessingTimer();

					// and exit
					return;

				}

				// remove the Hics from the list
				this.fifoOfHics.shift();

				//rotZoom = hics.getRotationAndZoom();

				// call the function corresponding to the status
				this[methodsArray[hics.status].code].call(this, hics);

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

		endComboAndMaybeAction: function (hics) {
			var debug = true && Action.debug && TipTap.settings.debug;

			md(this + ".endComboAndMaybeAction-1(" + this.endComboAndMaybeActionTimer + ", " + hics + ")", debug, "");

			this.endComboAndMaybeActionTimer = 0;

			this.buildComboClearGesturesAndSendCombo(hics);

			// if no more Pointers active, kill the Action
			this.terminateIfEmpty();

		},

		flushPreviousGesture: function () {

			// in case of untip, we must flush previous complex gestures because combos are for Tap and Swipe only
			this.boundEndComboAndMaybeAction && this.boundEndComboAndMaybeAction();

			this.boundEndComboAndMaybeAction = null;

		},

		includeHicsInGesture: function (gesture) {
			// todo: storeGestureForCombo, store full Gesture, and format on last moment?
			var debug = true && Action.debug && TipTap.settings.debug;

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

			md(this + ".formatGesture-1(" + formattedGesture + ")", debug);

			return formattedGesture;

		},

		formatAndStoreGesture: function (gesture) {
			// todo: storeGestureForCombo, store full Gesture, and format on last moment? Must store tips count with Gesture!
			var debug = true && Action.debug && TipTap.settings.debug;

			md(this + ".formatAndStoreGesture(" + gesture + "," + this.includeHicsInGesture(gesture) + ")", debug, "#F00");

			this.listOfFormattedGestures.push(this.includeHicsInGesture(gesture));

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

		startHicsListProcessingTimer: function () {
			var debug = true && Action.debug && TipTap.settings.debug;

			if (this.processHicsTimer) {

				md(this + ".startProcessGestureTimer-no need to start timer", debug);

				return;

			}

			// start the timer of the Gesture: lifefime == duration of simultaneity tolerance
			this.processHicsTimer = setTimeout(

				_.bind(this.consumeDoneHicsFromFIFO, this),

				TipTap.settings.simultaneousMovesTimer_ms / 4

			);

			md(this + ".startProcessGestureTimer-timer started(" + this.processHicsTimer + ")", debug);

		},

		startSendComboAndEndActionTimer: function (hics) {
			var debug = true && Action.debug && TipTap.settings.debug;

			this.boundEndComboAndMaybeAction = _.bind(this.endComboAndMaybeAction, this, hics);

			// tap/swipe wait for the time needed to do a possible next hics within the same combo
			this.endComboAndMaybeActionTimer =

				setTimeout(

					this.boundEndComboAndMaybeAction,

					TipTap.settings.comboEndTimer_ms

				);

			md(this + ".startSendComboAndEndActionTimer-1(" + hics +
				   ", " + this.endComboAndMaybeActionTimer + ")", debug, "");

		},

		storeHics: function (hics) {

			this.fifoOfHics.push(hics);

		},

		terminateIfEmpty: function () {
			var debug = true && Action.debug && TipTap.settings.debug;

			if (this.hasPressedPointers()) {

				return;

			}

			md(this + ".terminateIfEmpty-1", debug);

			// if no more pressed pointers, Action is finished
			this.finished.dispatch();

		},

		toString: function () {
			return "-A#" + this.id;
		},

		zoomElement: function () {
			var debug = true && Action.debug && TipTap.settings.debug;
			var $t = this.$target;
			var bb, eg;

			/*$t.css('webkitTransformOrigin', cx + ' ' + cy + '')
			 .css('webkitTransform', 'scale(' + this.zoomX.absoluteZoom + ',' + this.zoomY.absoluteZoom + ')');*/
			bb = this.fingersBoundingBox;
			eg = this.elementGeometry;

			// resize the element by taking the new Pointers bounding box dimensions, and adding the deltas
			$t.width(bb.width + eg.width).height(bb.height + eg.height);
			$t.offset({
				          left: bb.left + eg.left,
				          top:  bb.top + eg.top
			          });
		}

	};

	// just to make things faster. Not sure it's *so* clean to have methods names based on another class' properties value, seems a bit a class smell :'(
	var gesture = TipTap.Gesture;
	var methodNames = gesture.statusMatchCode;

	// status callback. Names are dynamically created from gestures codes, avoid keeping two source files in sync
	Action.prototype[methodNames[gesture._PRESSED].code] = function (hics) {

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onPressed(hics);

		}

		// notification gestures are not stored in the formatted list
		this.buildAndSendNotificationGesture(hics);

	};

	// tap and swipe are treated the same
	Action.prototype[methodNames[gesture._SWIPED].code] =
		Action.prototype[methodNames[gesture._TAPPED].code] =
			function (hics) {

				this.cancelSendComboAndEndActionTimer();

				// store hics at the last moment, to avoid issue with "release", due to small wait for tab/swipe
				this.formatAndStoreGesture(hics);

				// only tab and swipe are "chainable" anymore, doing tip and a tap shortly after doesn't make much sense as a Combo
				this.startSendComboAndEndActionTimer(hics);

			};

	Action.prototype[methodNames[gesture._TIPPED].code] = function (hics) {
		var debug = true && Action.debug && TipTap.settings.debug;

		this.formatAndStoreGesture(hics);

		// we increase the "tips count" AFTER storing the hics, so that a single tip doesn't generate tip-tip
		this.pressedPointersCount += hics.getPointersCount();

		this.buildComboClearGesturesAndSendCombo(hics);

	};

	Action.prototype[methodNames[gesture._UNTIPPED].code] = function (hics) {
		var debug = true && Action.debug && TipTap.settings.debug;

		/* we remove tips from "tips count" BEFORE, because we it's not logical to see the untipped pointers counted as tip.
		 Even if the "untip" event happens while tipping, from a human point of view, when you untip, the pointer is not
		 tipping anymore. So, for one pointer, you expect "untip", not "tip-untip". At least, I do. And I'm the boss here :-D
		 */

		this.pressedPointersCount -= hics.getPointersCount();

		// cancel any planned automatic sending, because an untip causes immediate sending
		this.cancelSendComboAndEndActionTimer();

		// an untip must not be chained to previous gestures anymore, doesn't really make sense
		this.flushPreviousGesture();

		this.formatAndStoreGesture(hics);

		this.buildComboClearGesturesAndSendCombo(hics);

		// if no more Pointers active, kill the Action
		this.terminateIfEmpty();

	};

	Action.prototype[methodNames[gesture._DRAG_STARTED].code] = function (hics) {

		// notification gestures are not stored in the formatted list

		this.buildAndSendNotificationGesture(hics);

	};

	Action.prototype[methodNames[gesture._DRAGGED].code] = function (hics) {
		var debug = true && Action.debug && TipTap.settings.debug;

		md(this + ".drag", debug);

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onDrag(hics);

		}

		this.gesture = hics;

		// the power (^n) of the combo is the count of TOUCHING pointers, not MOVING!
		this.dragged.dispatch(hics.format());

	};

	Action.prototype[methodNames[gesture._DRAG_STOPPED].code] = function (hics) {

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onStoppedDragging(hics);

		}

		// notification gestures are not stored in the formatted list
		this.buildAndSendNotificationGesture(hics);

	};

	Action.prototype[methodNames[gesture._RELEASED].code] = function (hics) {

		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer.onReleased(hics);

		}

		// notification gestures are not stored in the formatted list
		this.buildAndSendNotificationGesture(hics);

	};

	Action.debug = true;

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
