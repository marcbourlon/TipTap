// todo(release): make unit tests ;-(
// todo: allow to deactivate event capturing, globally or on some elements (hard!)
// todo?: make it a component? https://github.com/component/spec/wiki https://github.com/component
// todo: method for splitting/reallocate Actions !! Only way to allow complex Actions on parent node and simpler on children
/**
 *
 */
(function (window, document, $) {
	"use strict";

	var TipTap = {
		debugMe:             true,
		device:              null,
		DEVICE_DEFAULT:      0, // if nothing specified, will bind device events (mouse OR touch)
		DEVICE_MOUSE:        1, // allows to force usage of mouse device input
		DEVICE_TOUCH:        2, // allows to force usage of touch device input
		GLOBAL_CLASS_FILTER: "-", // char used internally for global container class
		listOfFingers:       [],
		listOfRouters:       [], // list of all Routers objects
		// Stolen the touch test from Modernizr. Including 49KB for just this was a bit overkill, to me
		touch:               ('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch),
		TOUCH_REFRESH_ms:    1000 / 60, // iOS touch devices frequency is 60Hz
		use$:                true, // use jQuery. Not used for now

		disable: function (elems) {
			/*
			 Deactivate device events on the passed elements
			 */
			// todo
		},

		enable: function (elems) {
			/*
			 Activate device events on the passed elements
			 */
			// todo
		},

		findFingerByIdentifier: function (identifier) {

			return _.find(this.listOfFingers, function (f) {

				return (f.identifier === identifier);

			});

		},

		getEvent: function (e) {

			if (this.use$) {

				return e.originalEvent;

			}

			return e;

		},

		init: function (options) {

			this.settings = _.extend(this.settings, options);

			if ((this.settings.deviceType === this.DEVICE_TOUCH) || this.touch) {

				this.device = new TipTap.Touch();

			} else {

				this.device = new TipTap.Mouse();

			}

			// only one global listener for move/end/cancel. Because fast mouse movement can move cursor out of element, and
			// because end can be fired on another element, dynamically created during drag (same as in drag'n'drop, etc.)
			if (TipTap.use$) {

				$(document)
					.bind(this.device.DRAG_EVENT + ".TipTap", _.bind(TipTap.onDrag, TipTap))
					.bind(this.device.END_EVENT + ".TipTap", _.bind(TipTap.onEnd, TipTap))
					.bind(this.device.CANCEL_EVENT + ".TipTap", _.bind(TipTap.onCancel, TipTap));

			} else {

				// no support for old IEs (not used for now, only jQuery version is working)
				document.addEventListener(this.device.DRAG_EVENT, _.bind(TipTap.onDrag, TipTap));
				document.addEventListener(this.device.END_EVENT, _.bind(TipTap.onEnd, TipTap));
				document.addEventListener(this.device.CANCEL_EVENT, _.bind(TipTap.onCancel, TipTap));

			}


		},

		/**
		 * on
		 *
		 * @param elems : list of jQuery elements gathered by $(<filter)
		 * @param combosList :  "list" of combos to match (see syntax reference)
		 * @param filter : DOM filter expression for delegation
		 * @param callback : callback
		 * @param context : optional context in which to call the callback ($.bind, _.bind...)
		 * @return {*}
		 */
		on: function (elems, combosList, filter, callback, context) {

			// if "filter" is a function, then we have no filter defined, and the filter var is the callback
			if (typeof filter === "function") {

				context = callback;

				callback = filter;

				filter = "";

			}

			var tipTap = this;

			return elems.each(function () {

				// the jQuery wrapped DOM element we're working on
				var $this = $(this);

				var router = _.find(tipTap.listOfRouters, function (rt) {

					// if attaching to same element than a previous one, then use same Router
					return rt.$el.is($this);

				});

				// No router found, create new and keep in list
				if (!router) {

					router = new TipTap.Router($this, tipTap.device);  // otherwise, create new

					tipTap.listOfRouters.push(router);

					if (tipTap.use$) {
						$this
							.bind(tipTap.device.START_EVENT + ".TipTap", _.bind(tipTap.onStart, // calls onStart from TipTap
						                                                      tipTap, // positioning "this" to TipTap
						                                                      router));       // and sending router as 1st param
					} else {
						// no support for old IEs
						//	<element>.addEventListener(device.START_EVENT, _.bind(this.onStart, this, router));
					}

				}

				// attach combo and related callbacks to the Router
				router.bindCombos(combosList, filter, callback, context);

				return $this;

			});

		},

		onStart: function (router, e) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var t = Date.now();

			md(this + ".onStart-1: " + t + "<hr/>", debugMe);

			// Pass "keep bubbling", that the _.reduce will transform into "cancel bubbling" if a matching event is found
			if (TipTap.CANCEL_BUBBLING === _.reduce(this.device.buildEtList(e),
			                                        _.bind(this.onStartDo, this, router),
			                                        TipTap.KEEP_BUBBLING,
			                                        this)) {

				this.stopEvent(e);

			}

			md(this + ".onStart-2: " + (Date.now() - t) + " ms", debugMe);

		},

		onStartDo: function (router, bubblingStatus, eventTouch) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;
			var finger;
			var filter;

			md(this + ".onStartDo-1", debugMe);

			// check if the event target element is matching at least one defined filter
			filter = router.findMatchingFilterForEvent(eventTouch.$target);

			// if no filter found, the component has no callback for this eT
			if (!filter) {

				return bubblingStatus;

			}

			md(this + ".onStartDo-2", debugMe);

			finger = new TipTap.Finger(eventTouch);

			// Keep track of the finger to dispatch further moves
			this.listOfFingers.push(finger);

			// allocate an Action for this Finger, passing the callbacks list
			router.allocateAction(finger);

			md(this + ".onStartDo-3", debugMe);

			// in case the device has something to do with the EventTouch before this one is processed by the Finger
			this.device.onStart();

			finger.onStart(eventTouch);

			md(this + ".onStartDo-4", debugMe);

			return TipTap.CANCEL_BUBBLING;

		},

		onDrag: function (e) {
			/*
			 the system sends events only for one HTML target, so in theory for one Action. But when we can split
			 Actions to allow splitting elements, we'll have to deal with several Actions concerned by one event
			 Will it work?
			 */
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var cancelBubbling = TipTap.KEEP_BUBBLING;
			var t = Date.now();

			// todo: onMove which also tracks mouse move (not drag). for this, check if an Action exists, and if not, create one
			if (!this.device.shouldCaptureDrag()) {

				return;

			}

			// in case the device has something to do with the ET
			this.device.onDrag(e);

			// buildEtList unifies mouse and touch events/touchs in a list
			_.each(this.device.buildEtList(e), function (eventTouch) {

				// we store the touch identifier in the Finger, so we can match new incoming events. Obvious.
				var finger = this.findFingerByIdentifier(eventTouch.identifier);

				// not found (can't happen...)
				if (!finger) {

					return;

				}

				md(this + ".onDrag: " + t + ",l=" + this.device.buildEtList(e).length + "<hr/>", debugMe);

				cancelBubbling = TipTap.CANCEL_BUBBLING;

				finger.onDrag(eventTouch);

			}, this);

			if (cancelBubbling) {

				this.stopEvent(e);

			}
		},

		onEnd: function (e) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".onEnd", debugMe);

			// odd (?) usage of _.reduce(): calls finger.end() on all fingers concerned
			if (_.reduce(this.device.buildEtList(e), _.bind(this.onEndDo, this), TipTap.KEEP_BUBBLING, this)) {

				this.stopEvent(e);

			}

		},

		onEndDo: function (cancelBubbling, eventTouch) {

			var finger = this.findFingerByIdentifier(eventTouch.identifier);

			if (!finger) {

				return cancelBubbling;

			}

			this.device.onEnd(eventTouch);      // in case the device has something to do with the ET

			finger.onEnd(eventTouch);

			this.unlinkFinger(finger);

			return TipTap.CANCEL_BUBBLING;

		},

		onCancel: function (e) {

			md(this + ".onCancel", debugMe);

			this.onEnd(e);  // todo: better management of cancel ?
		},

		stopEvent: function (e) {
			e = TipTap.getEvent(e);

			e.preventDefault();
			//e.stopPropagation();
			//e.stopImmediatePropagation();
		},

		toString: function () {
			return "TipTap";
		},

		unlinkFinger: function (finger) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var l = this.listOfFingers.length;

			this.listOfFingers.splice(this.listOfFingers.indexOf(finger), 1);

			md(this + ".unlinkFinger: " + l + " -> " + this.listOfFingers.length, debugMe);

		},

	};

	TipTap.settings = {

		deviceType: TipTap.DEVICE_MOUSE, // which kind of device do we use

		simultaneousMovesTimer_ms: 3 * TipTap.TOUCH_REFRESH_ms, // delay accepted between similar events/moves to be considered  as simultaneous

		tapMaxDuration_ms: 150, // if down without move for longer than this, it's a tip. Otherwise, move or tap

		swipeStartDelay_ms: 2 * TipTap.TOUCH_REFRESH_ms, // duration between start and move to take as a swipe

		swipeDuration_ms: 8 * TipTap.TOUCH_REFRESH_ms, // max move duration to still be a swipe

		swipeMinDisplacement_px: 8, // minimal distance of first move to consider as swipe

		swipeMaxDistance_px: 160, // max distance to still be considered as swipe

		moveThreshold_px: TipTap.touch ? 8 : 0, // min distance to consider that the move was intentional

		comboEndTimer_ms: 100, // delay accepted before next tap to keep it in the gesture (like in dblclick)

		comboGesturesSep: ">", // char to separate combos: tap2>tap2

		comboParallelActionOperator: "-", // char to show simultaneous actions: tip2-tap2

		comboAlternateOperator: "|", // char to define alternate combos: press/tip

		debug: true

	};

	// there's more elegants way to do so, but I'll do when I'm a grown up js developer :-P
	window.TipTap = TipTap;

	// jQuery "pluginification"
	var methods = {

		activate: function () {

			return TipTap.activate(this);

		},

		on: function (combosList, filter, callback, context) {

			return TipTap.on(this, combosList, filter, callback, context);

		},

		deactivate: function () {

			return TipTap.deactivate(this);

		},

		off: function () {

		}

	};

	if ($) {
		// Touchy does it "better" knowing that it takes normal DOM elements as parameter
		// see once we move to jQuery-less code
		$.fn.jTipTap = function (method, combosList, filter, callback) {

			if (methods[method]) {

				return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));

			} else if (typeof method === 'object' || !method) {

				return methods.init.apply(this, arguments);

			} else {

				$.error('Method ' + method + ' does not exist in jQuery.TipTap');

			}

		};

	}

}(window, document, window.jQuery));

TipTap.KEEP_BUBBLING = false;
TipTap.CANCEL_BUBBLING = true;

// Helper debug function, very crappy to have it here, I'm shameful! :'(
var md = (function () {
	var dl = $('#debuglog');
	return function (t, display, color) {
		if (display) {
			if (color) {
				t = '<span style="color:' + color + '">' + t + '</span>';
			}
			// prepend to have latest messages on top, without scrolling
			dl.prepend(t + "<br/>");
		}
	};
}());

/*
 Usage:

 new Fsm(saveState)
 - if saveState is true, the FSM stores its own state. Convenient for most normal cases.
 - if saveState is false, the FSM will store its state into the caller object (using "state" property, maybe should use something less... standard?). Convenient when many dynamic objects use a totally similar FSM (multiple objects following similar patterns), because it avoids creating and destroying a lot of completely similar FSMs. Better for speed and memory management.

 this.fsm.init(
 [
 {
 from:        "origin", // name of the state from which to move
 isStart:     true, // defines if the position is the start. No check, last declaration wins
 transitions: [
 // list of transitions
 {
 signal: "signal" or ["signal1","signal2", ...], // signal (string) or list of signals, string(s)
 to:     "dest", // destination state. Fsm._SELF (or not specified) for looping on oneself, Fsm._CALC to use action's returned result as destination
 action: function (someParams) {  // is called with .apply, so that "this" is the one of the caller (*)
 this.doSomething(someParams);
 return "signal";     // Only needed in case "to" has been set to Fsm._CALC, return the state to go to.
 }
 }
 ]
 }
 ]
 );

 (*) must call fsm with this as param: ...fsm.signal.call(object) => object will be passed to the action function as "this"

 */

(function (TipTap, _) {

	var Fsm = function (saveState) {

		this.effects = {};

		this.initialState = "";

		// removed timed transitions
		// this.onEnter = {};
		this.state = "";

		// if saveState is undefined, forces it to false. Makes simpler, faster and better tests later
		if (!saveState) {

			saveState = Fsm.SAVE_STATE;

		}

		// the Fsm keeps the state, or not. If not, it can be used as an iterator on lots of different objects
		this.saveState = saveState;
	};

	Fsm._SELF = "_self";

	Fsm._CALC = "_calc";

	Fsm.SAVE_STATE = false; // so that not giving param to Fsm constructor means "stateful", which is better for user

	Fsm.DONT_SAVE_STATE = true;

	Fsm.prototype = {

		// fsmOwner is passed each time, to make the Fsm an "iterator" not storing any state
		doTransition: function (fsmOwner, signal) {

			var effect,

				returnState;

			var stateStorage;

			// if Fsm is stateful, it keeps track of its state
			if (this.saveState === Fsm.SAVE_STATE) {

				stateStorage = this;

			} else {

				// otherwise, the state is stored in the object. Allows one Fsm for multiple objects, good for perf and memory
				stateStorage = fsmOwner;

				// on first call, there's no chance that the initialState is filled in the caller, so we set it
				if (!stateStorage.state) {

					stateStorage.state = this.initialState;

				}

			}
			// gets the effect expected from this signal applied to current state
			effect = this.effects[stateStorage.state + signal];

			// if no effect is found for this signal at this state, leave without doing anything
			if (!effect) {

				return;

			}

			// else, execute action with all arguments. "this" in the called action is positioned to the fsmOwner
			// if no return is given, assume self
			returnState = effect.action.apply(fsmOwner, Array.prototype.slice.call(arguments, 2)) || Fsm._SELF;

			// allows shortcut "_self" to loop on same state, if not self, transition to the new state
			if (effect.to === Fsm._SELF) {

				return;

			}

			if (effect.to === Fsm._CALC) { // if next state is calculated, need to move to returned state...

				if (returnState === Fsm._SELF) { // ...which can be _self, in which case, again no change ;-)

					return;

				}

				stateStorage.state = returnState;

			} else {

				stateStorage.state = effect.to;

			}

		},

		init: function (listOfStates) {

			// treats every line of FSM definition
			_.each(listOfStates, function (state) {

				// consider that, by default, the first state given is the root
				if (!this.state) {

					this.state = state.from;

				}

				// but if we find a state flagged "isStart", use it as the root
				if (state.isStart) {

					// in case we don't store state internally, state assignment is useless, but it doesn't harm
					this.state = this.initialState = state.from;

				}

				this.parseState(state);

			}, this); // don't forget context

			return this.initialState;
		},

		parseState: function (state) {

			// takes each transition one by one
			_.each(state.transitions, function (transition) {

				var signalsList = transition.signal;

				// if a String, makes it an Array, to uniformize treatment
				if (typeof signalsList === "string") {

					signalsList = [signalsList];

				}

				// allow to define a list of fingerStatusToGestureSignalMapping generating the same transition (namely end and cancel for touch :-D)
				_.each(signalsList, function (signal) {

					this.storeTransition(state.from, transition, signal);

				}, this);

			}, this);
		},

		storeTransition: function (from, transition, signal) {

			// create unique keys resulting from concatenating 'from' state and signal, to store 'to' state and action
			this.effects[from + signal] = {

				action: transition.action, // function to execute

				to: transition.to || Fsm._SELF     // state after transition. If none given, stays on same

			};

			// creates the transition as a method of the Fsm itself
			this[signal] = (function (fsm) {

				return function () {

					// "this" is positioned by the caller, using .call() (to make easier to call Fsm methods as events callbacks)
					// so, to pass the args, we need to call(), and send fsm as this to himself. Bit awkward, I know...
					var args = [this, signal].concat(Array.prototype.slice.call(arguments));

					return fsm.doTransition.apply(fsm, args);

				};

			}(this));

		},

		toString: function () {

			return "FSM";

		}

	};

	// namespaces the thing
	TipTap.Fsm = Fsm;

}(window.TipTap, _));

(function (TipTap, _) {

	var Gesture = function (status, direction) {

		this.debugMe = false;

		var debugMe = true && this.debugMe && TipTap.settings.debug;

		this.id = Gesture.id();

		this.debugColor = "#" + (Math.round(Math.random() * Math.pow(2, 24))).toString(16);

		this.status = status;

		this.direction = direction;

		this.listOfPointers = [];

		// birth time of the Gesture, to know if it's dead
		// todo?: use the first pointer datetime as birthTime! Will fix some small delay due to notification gestures
		this.birthTime = Date.now();

		md(this + ".new(" +
			   Gesture.statusMatchCode[Gesture.getFullStatus(this.status, this.direction)].code + ")", debugMe, this.debugColor);

	};

	Gesture.prototype = {
		addPointer: function (pointer) {
			// adds pointer in ascending order of ids. In theory, pushing would be enough due to touches arrays, but...
			var l = this.listOfPointers.length;
			var i = 0;

			while ((i < l) &&

				(this.listOfPointers[i].identifier < pointer.identifier)) {

				i++;

			}

			if (i === l) {

				this.listOfPointers.push(pointer);

			} else {

				this.listOfPointers.splice(i, 0, pointer);

			}

		},

		age:                      function () {

			return Date.now() - this.birthTime;

		},

		// todo: remove?
		calculateZoomAndRotation: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			// todo: what to do with 3 pointers ? Calculate 3 vectors, and use longest one to do calculations?
			// todo: order by identifier asc, to try to always use the same?

			var pointer0 = this.listOfPointers[0];

			var pointer1 = this.listOfPointers[1];

			var initialVec = this.calculateVector(pointer0.initialPosition, pointer1.initialPosition);

			var vec = this.calculateVector(pointer0.position, pointer1.position);

			this.zoom = vec.len / initialVec.len;

			this.rotation = vec.rot - initialVec.rot;

			md(this + ".calculateZoomAndRotation(" + this.zoom + ", " + this.rotation + ")", debugMe)
		},

		// todo: remove?
		calculateZoomFactor:      function (zoomObj, min, max) {
			var absoluteZoom, relativeZoom;

			// ratio between current distance between fingers, and initial distance is absolute zoom
			absoluteZoom = (max - min) / zoomObj.initialFingersDistance;
			// relative zoom is ratio between last absolute zoom level and current
			zoomObj.relativeZoom = absoluteZoom / zoomObj.absoluteZoom;
			zoomObj.absoluteZoom = absoluteZoom;
		},

		canThisPointerBeAdded: function (pointer) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".canThisPointerBeAdded(" +
				   Gesture.statusMatchCode[Gesture.getFullStatus(this.status, this.direction)].code +
				   " =?= " +
				   Gesture.statusMatchCode[Gesture.getFullStatus(pointer.status, pointer.direction)].code +
				   ", " + pointer.identifier +
				   ")", debugMe, this.debugColor);

			// accepts only similar statuses in one combo, and not twice the same Finger
			return ((this.status === pointer.status) &&

				(this.direction === pointer.direction) &&

				!this.hasPointerFromSameFinger(pointer));

		},

		format: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var format = Gesture.formatGesture(this.status, this.direction, this.pointersCount());

			md(this + ".format: " + format, debugMe, this.debugColor);

			return format;
		},

		getPointer: function(index) {
			if (index < 0 ) {
				return null;
			}

			if (index >= this.listOfPointers.length) {
				return null;
			}

			return this.listOfPointers[index];
		},

		hasPointerFromSameFinger: function (pointer) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;
			var test;

			test = _.find(this.listOfPointers, function (ptr) {

				return (ptr.identifier === pointer.identifier);

			});

			md(this + ".hasPointerFromSameFinger => " + test, debugMe, this.debugColor);

			return test;
		},

		isEmpty: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			return     !this.listOfPointers.length;

		},

		pointersCount: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			return this.listOfPointers.length;

		},

		toString: function () {

			return "--G#" + this.id + Gesture.statusMatchCode[this.status].code;

		}

	};

	Gesture.formatGesture = function (status, direction, pointersCount) {
		var debugMe = true && this.debugMe && TipTap.settings.debug;
		var i;
		var result = "";
		var statusName;

		// if only two arguments, assume direction not given
		if (arguments.length === 2) {

			pointersCount = direction;

			direction = TipTap.Finger._DIR_NONE;

		}

		statusName = Gesture.getMatchCode(status, direction);

		// mostly for manual calls, since normal calls always have a pointers count
		if (!pointersCount) {

			return "";

		}

		// repeat pointersCount times the status (for regexp matching)
		for (i = 0; i < pointersCount; i++) {

			result += statusName;

		}

		md("Gesture.formatGesture: " + result, debugMe);

		return result;

	};

	Gesture.getMatchCode = function (status, direction) {

		// only the letter
		return Gesture.statusMatchCode[Gesture.getFullStatus(status, direction)].letter;

	};

	Gesture.getFullStatus = function (status, direction) {

		if (status !== Gesture._SWIPED) {

			return status;

		}

		switch (direction) {

			case TipTap.Finger._DIR_TOP:
				return Gesture._SWIPED_T;

			case TipTap.Finger._DIR_BOTTOM:
				return Gesture._SWIPED_B;

			case TipTap.Finger._DIR_LEFT:
				return Gesture._SWIPED_L;

			// arbitrarily decides that no direction is right. Can't see how it could happen, though
			default:
				return Gesture._SWIPED_R;

		}

	};

	Gesture.id = function () {

		Gesture._id++;

		return Gesture._id;

	};

	Gesture._id = 0;

	// *WARNING*!!! Don't change order, since we String.replace substrings, so we must match "untip" before "tip"... etc.
	Gesture._VOID = 0;
	Gesture._PRESSED = Gesture._VOID + 1;             // 1
	Gesture._TAPPED = Gesture._PRESSED + 1;           // 2
	Gesture._UNTIPPED = Gesture._TAPPED + 1;          // 4
	Gesture._TIPPED = Gesture._UNTIPPED + 1;          // 5
	Gesture._DRAG_STARTED = Gesture._TIPPED + 1;      // 6
	Gesture._DRAG_STOPPED = Gesture._DRAG_STARTED + 1;// 7
	Gesture._DRAGGED = Gesture._DRAG_STOPPED + 1;     // 8
	Gesture._RELEASED = Gesture._DRAGGED + 1;         // 9
	Gesture._SWIPED_T = Gesture._RELEASED + 1;        // 10
	Gesture._SWIPED_R = Gesture._SWIPED_T + 1;        // 11
	Gesture._SWIPED_B = Gesture._SWIPED_R + 1;        // 12
	Gesture._SWIPED_L = Gesture._SWIPED_B + 1;        // 13
	Gesture._SWIPED = Gesture._SWIPED_L + 1;          // 14

	// table of: code = what the user will type to define his combos, letter = inner one char code to simplify regexp
	Gesture.statusMatchCode = [];
	Gesture.statusMatchCode[Gesture._VOID] = {code: "void", letter: "A"};    // not used, not empty because of regexp in Router (ugly, right?)
	Gesture.statusMatchCode[Gesture._PRESSED] =       {code: "press",     letter: "B"};
	Gesture.statusMatchCode[Gesture._TAPPED] =        {code: "tap",       letter: "C"};
	Gesture.statusMatchCode[Gesture._UNTIPPED] =      {code: "untip",     letter: "D"};
	Gesture.statusMatchCode[Gesture._TIPPED] =        {code: "tip",       letter: "E"};
	Gesture.statusMatchCode[Gesture._DRAG_STARTED] =  {code: "dragStart", letter: "F"};
	Gesture.statusMatchCode[Gesture._DRAG_STOPPED] =  {code: "dragStop",  letter: "G"};
	Gesture.statusMatchCode[Gesture._DRAGGED] =       {code: "drag",      letter: "H"};
	Gesture.statusMatchCode[Gesture._RELEASED] =      {code: "release",   letter: "I"};
	Gesture.statusMatchCode[Gesture._SWIPED_T] =      {code: "swipe_t",   letter: "J"};
	Gesture.statusMatchCode[Gesture._SWIPED_R] =      {code: "swipe_r",   letter: "K"};
	Gesture.statusMatchCode[Gesture._SWIPED_B] =      {code: "swipe_b",   letter: "L"};
	Gesture.statusMatchCode[Gesture._SWIPED_L] =      {code: "swipe_l",   letter: "M"};
	Gesture.statusMatchCode[Gesture._SWIPED] =        {code: "swipe",     letter: "N"};

	// namespaces the thing
	TipTap.Gesture = Gesture;

}(window.TipTap, _));

(function (TipTap, _) {
	/**
	 * An Action starts from a first start event (mousedown, touchstart) and ends after a small delay after the last
	 * pointer ended (mouseup, touchend). The small delay is here to allow combos of multiple Gestures, like double-tap (the
	 * classical double-clic in a mouse-only world).
	 */
	var Action = function ($target) {

		var debugMe = true && this.debugMe && TipTap.settings.debug;

		this.debugMe = true;

		md(this + '.new(' + $target[0].id + '")', debugMe);

		this.$target = $target;

		// todo: change $target to target when no more jQuery dependency. Ideal would be a "plus" mode for jQuery
		//this.target = this.$target.get(0);

		// store the reference to the timer waiting for a following Gesture. Allow to kill the timer
		this.endComboAndMaybeActionTimer = 0;

		// file of Gestures, to ensure a sequential treatment
		this.fifoOfGestures = [];

		// store here the last gesture before sending to application
		this.gesture = null;

		this.id = Action.id();

		// store the strings created from each Gesture. Combined to create the Combo
		this.listOfFormattedGestures = [];

		// count of Pointers "active" (fingers touching, mouse down...)
		this.pressedPointersCount = 0;

		// "pointer" on the setTimeout of Gesture FIFO processing (scheduler)
		this.processGestureTimer = 0;

		// check if the target has already been processed by RotoZoomer
		// $target, rotateable, zoomable, autoApply
		if (TipTap.settings.rotoZoom) {

			this.rotoZoomer = new TipTap.RotoZoomer(this.$target, true, true, true);

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
			/*
			 CLONE the pointer, because:
			 1) the same can be used for different states (PRESSED and TIPPED or TAPPED)
			 2) to not let Finger alive because of links to living Pointers
			 */
			var pointer;

			md(this + ".allocateGesture-1(" + TipTap.Gesture.statusMatchCode[status].code + ")", debugMe);

			// copy Finger position, plus some stuff
			pointer = new TipTap.Pointer(finger, status);

			if (TipTap.Gesture._PRESSED === status) {

				// clears any pending Action termination timer
				this.cancelSendComboAndEndActionTimer();

			}

			// is there a Gesture which can accept this pointer?
			gesture = _.find(this.fifoOfGestures, function (g) {

				return g.canThisPointerBeAdded(pointer);

			}, this);

			// if no, create new and add to stack
			if (!gesture) {

				md(this + ".allocateGesture-must create new Gesture", debugMe);

				gesture = new TipTap.Gesture(status, finger.getDirection());

				// store in the FIFO of Gestures
				this.storeGesture(gesture);

			} else {

				md(this + ".allocateGesture-using gesture " + gesture, debugMe, "#00F");

			}

			// inner "event loop" of gestures treatment
			this.startGesturesListProcessingTimer();

			md(this + ".allocateGesture-4", debugMe);

			gesture.addPointer(pointer);

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

			md(this + ".buildComboFromGestures-1:[" +

				   combo + "]", debugMe);

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
			var combo;

			md(this + ".sendComboAndEndAction-1(" + this.endComboAndMaybeActionTimer + ", " + gesture + ")", debugMe, "");

			this.endComboAndMaybeActionTimer = 0;

			this.buildComboClearGesturesAndSendCombo(gesture);

			// if no more Pointers active, kill the Action
			this.terminateIfEmpty();

		},

		formatGesture: function (gesture) {
			// todo: storeGestureForCombo, store full Gesture, and format on last moment?
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var tips;

			var formattedGesture = gesture.format();

			// get the "background" tipping count to send it: tip3tip for example
			tips = TipTap.Gesture.formatGesture(TipTap.Gesture._TIPPED, this.pressedPointersCount);

			if (tips) {

				// eg: tip3-tip
				formattedGesture = tips + TipTap.settings.comboParallelActionOperator + formattedGesture;

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

		hasPressedPointers: function () {

			return (this.pressedPointersCount > 0);

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

			// tap/swipe wait for the time needed to do a possible next gesture within the same combo
			this.endComboAndMaybeActionTimer =

				setTimeout(

					_.bind(this.endComboAndMaybeAction, this, gesture),

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

	// just to make things faster
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

				// only tab and swipe are "chainable" anymore, doing tip and fast tap after doesn't make much sense as a Combo
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

		this.formatAndStoreGesture(gesture);

		// cancel any planned automatic sending, because a tip causes immediate sending
		this.cancelSendComboAndEndActionTimer();

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

	// namespaces the thing
	TipTap.Action = Action;

}(window.TipTap, _));

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
		this.dragDetailsAbsolute = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// used to store details about the relative drag (between two last positions)
		this.dragDetailsRelative = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

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
							if (!this.wasAnUncontrolledMove()) {
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
							if (!this.wasAnUncontrolledMove()) {
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
			dx = this.dragDetailsRelative.dx;
			adx = Math.abs(dx);
			dy = this.dragDetailsRelative.dy;
			ady = Math.abs(dy);

			md(this + ".isSwipingOrDragging-1: " + this.absDrag.duration_ms + "px", debugMe)

			// Swipe is defined by: 'dragged "a lot" and just after "start" '
			if (this.absDrag.duration_ms <= settings.swipeStartDelay_ms) {

				md(this + ".isSwipingOrDragging-2", debugMe)
				if (adx >= ady) {
					if (adx >= settings.swipeMinDisplacement_px) {
						if (dx > 0) {
							md(this + ".isSwipingOrDragging > swipe-r", debugMe)
							this.direction = Finger._DIR_RIGHT;
						} else {
							md(this + ".isSwipingOrDragging > swipe-l", debugMe)
							this.direction = Finger._DIR_LEFT;
						}
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

			return (this.absDrag.duration_ms > settings.swipeDuration_ms) ||
				(this.absDrag.d > settings.swipeMaxDistance_px);
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

			md(this + ".wasAnUncontrolledMove", debugMe);

			return ((Math.abs(this.absDrag.dx) > settings.moveThreshold_px) ||
				(Math.abs(this.absDrag.dy) > settings.moveThreshold_px));
		}
	};

	// namespacing
	TipTap.Finger = Finger;

}(window.TipTap, _));

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

(function (TipTap, _) {

	var Pointer = function (ptr, status) {

		this.identifier = ptr.identifier;

		// do not set target from eventTouch, because it can be (mouse) other than initial Finger target
		this.$target = ptr.$target;

		this.pageX = ptr.getPosition().pageX;

		this.pageY = ptr.getPosition().pageY;

		this.status = status;

		this.direction = ptr.getDirection();

	};

	Pointer.prototype = {

		toString: function () {

			return "Ptr#" + this.identifier;

		}

	};

	// namespaces the thing
	TipTap.Pointer = Pointer;

}(window.TipTap, _));

(function (TipTap) {

	var Position = function (eT) {

		// do not set target from eventTouch, because it can be (in case of mouse) other than initial Finger target

		this.timeStamp = eT.timeStamp;

		this.pageX = eT.pageX;

		this.pageY = eT.pageY;

		// this.target = document.elementFromPoint(this.pageX, this.pageY);  // real element under the touch. If needed.

	};

	Position.prototype = {

		toString: function () {

			return "Pos#" + this.identifier + "(" + this.pageX + "," + this.pageY + ")";

		}

	};

	// namespaces the thing
	TipTap.Position = Position;

}(window.TipTap));

/**
 *  Helper for rotation and zoom of elements
 *  Strongly inspired from the class Touchable of Marius Gundersen (http://lab.mariusgundersen.com/touch.html)
 *
 * @$target: jqueryfied DOM element
 * @rotateable: boolean, if element must accept to be rotated
 * @zoomable: boolean, if element must accept to be zoomed
 * @autoApply: boolean, if transformations are applied automatically to the element
 */
(function (TipTap, _) {

	var RotoZoomer = function ($target, rotateable, zoomable, autoApply) {
		this.debugMe = false;

		var debugMe = true && this.debugMe && TipTap.settings.debug;

		this.$target = $target;

		this.target = $target[0];

		// todo: rename in listOfPointers
		this.touches = [];

		// stores data in DOM node, because object is lost between touches
		if ($target.data("rotoZoomer-matrix")) {

			this.matrix = $target.data("rotoZoomer-matrix").split(",");

			this.rotateable = $target.data("rotoZoomer-rotateable");

			this.zoomable = $target.data("rotoZoomer-zoomable");

			// if the transformation must be applied automatically to the target
			this.autoApply = $target.data("rotoZoomer-autoapply");

			md("<b>" + this + ".new, data read(m: [" + $target.data("rotoZoomer-matrix") + "], rotateable: " + $target.data("rotoZoomer-rotateable") + ", zoomable: " + $target.data("rotoZoomer-zoomable") + ", autoApply: " + $target.data("rotoZoomer-autoapply") + ")</b>", debugMe);

		} else {

			this.matrix = [1, 0, 0, 1, 0, 0];

			this.rotateable = rotateable;

			this.zoomable = zoomable;

			this.autoApply = autoApply;

			md("<b>" + this + ".new, data (m: [1, 0, 0, 1, 0, 0], rotateable: " + rotateable + ", zoomable: " + zoomable + ", autoApply: " + autoApply + ")</b>", debugMe);


			// todo: rename in ptrDist
			this.touchDist = 0;

			// todo: rename in ptrRot
			this.touchRot = 0;

			// setTransform(rotation, scale, translation x, translation y)
			this.setTransform(0, 1, 0, 0);

		}
	}


	RotoZoomer.prototype = {
		addTouch:       function (touch) {
			// adds touch in ascending order of ids. In theory, pushing would be enough due to touches arrays, but...
			var touches = this.touches;
			var l = touches.length;
			var i = 0;

			while ((i < l) &&

				(touches[i].identifier < touch.identifier)) {

				i++;

			}

			if (i === l) {

				touches.push(touch);

			} else {

				touches.splice(i, 0, touch);

			}

		},

		// todo: rename to calculateVector
		getTouchVector: function (position1, position2) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".getTouchVector-1", debugMe);

			md(this + ".getTouchVector-1(x1: " + position1.pageX + ", y1: " + position1.pageY + ", x2: " + position2.pageX + ", y2: " + position2.pageY + ")", debugMe);

			var vec = {

				x: position2.pageX - position1.pageX,

				y: position2.pageY - position1.pageY

			};

			// todo: rename in len, rot
			vec.length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

			vec.rotation = Math.atan2(vec.y, vec.x);

			vec.cx = position2.pageX + vec.x / 2;

			vec.cy = position2.pageY + vec.y / 2;

			md(this + ".getTouchVector-2: l: " + vec.length + ", r: " + vec.rotation + ", cx: " + vec.cx + ", cy: " + vec.cy, debugMe);

			return vec;
		},

		onDrag: function (gesture) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".onDrag-1", debugMe);

			var lop = gesture.listOfPointers;

			var touch0;

			var touch1;

			var rotation;

			var zoom;

			var vector;


			if (lop.length >= 2) {

				md(this + ".onDrag-2", debugMe);

				touch0 = this.getTouch(lop[0].identifier);

				touch1 = this.getTouch(lop[1].identifier);

				vector = this.getTouchVector(
					{pageX: lop[0].pageX, pageY: lop[0].pageY},
					{pageX: lop[1].pageX, pageY: lop[1].pageY}
				);

				md(this + ".onDrag-2, vector.length = " + vector.length + ", vector.rotation = " + vector.rotation, debugMe);

				zoom = vector.length / this.touchDist;

				md(this + ".onDrag-2, this.touchDist = " + this.touchDist + ", this.touchRot = " + this.touchRot, debugMe);

				if (this.rotateable) {

					rotation = this.touchRot - vector.rotation;

				}

				md(this + ".onDrag-3(rot:" + rotation + ", zoom:" + zoom + ")", debugMe);

				this.setMatrix(rotation, zoom, 0, 0);

				/*		this.setMatrix(rotation, zoom, -(touch0.pageX + touch1.pageX) / 2, -(touch0.pageY + touch1.pageY) / 2);

				 var globalTouch0 = this.getTouchPos(touch0.identifier);

				 var globalTouch1 = this.getTouchPos(touch1.identifier);

				 this.matrix[4] = -(globalTouch0.pageX + globalTouch1.pageX) / 2;

				 this.matrix[5] = -(globalTouch0.pageY + globalTouch1.pageY) / 2;
				 */
				md(this + ".onDrag-4", debugMe);

				this.applyTransform();

			}

			md(this + ".onDrag-end", debugMe);

		},

		onPressed: function (gesture) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var lop = gesture.listOfPointers;

			var touch0;

			var touch1;

			var transform;

			var vector;


			// store all pointers, no matter what
			_.each(lop, function (ptr) {

				// store local coordinates of the touches relative to the element
				this.setTouchPos(ptr);

			}, this);

			var lot = this.touches;

			md(this + ".onPressed: lopl = " + lop.length, debugMe);

			// if enough active pointers
			if (lot.length >= 2) {

				// always take the two first pointers
				// todo: move this to onStartedDragging? And deal with 3 pointers?
				touch0 = lot[0];

				for (var key in touch0) {

					if (touch0.hasOwnProperty(key)) {

						md(this + ".onPressed:touch0 = " + key, debugMe);

					}

				}

				touch1 = lot[1];

				md(this + ".onPressed: calc vector()", debugMe);

				vector = this.getTouchVector(touch0, touch1);

				md(this + ".onPressed: calc transform()", debugMe);

				transform = this.getTransform();

				this.touchDist = vector.length / transform.scale;

				md(this + ".onPressed: touchDist = " + this.touchDist, debugMe);

				if (this.rotateable) {

					this.touchRot = transform.rotation + vector.rotation;

				}

			}

			md(this + ".onStartedDragging-2", debugMe);

		},

		onReleased: function (gesture) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			_.each(gesture.listOfPointers, function (ptr) {

				md(this + ".onReleased, removing:" + ptr, debugMe);

				this.unsetTouchPos(ptr);

			}, this);

		},

		onStoppedDragging: function (gesture) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var lop = gesture.listOfPointers;

			var i;

			var lopl = lop.length;

			var $target = this.$target;

			md(this + ".onStoppedDragging-1", debugMe);

			for (i = 0; i < lopl; i++) {

				this.unsetTouchPos(lop[i]);

			}

			// whatever, it's a marker
			$target.data("rotoZoomer-matrix", this.matrix.join(","));

			$target.data("rotoZoomer-rotateable", this.rotateable);

			$target.data("rotoZoomer-zoomable", this.zoomable);

			// if the transformation must be applied automatically to the target
			$target.data("rotoZoomer-autoapply", this.autoApply);

			md(this + ".onStoppedDragging-2, data read(m: [" + $target.data("rotoZoomer-matrix") + "], rotateable: " + $target.data("rotoZoomer-rotateable") + ", zoomable: " + $target.data("rotoZoomer-zoomable") + ", autoApply: " + $target.data("rotoZoomer-autoapply") + ")", debugMe);
		},

		setTouchPos: function (pointer) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".setTouchPos-1", debugMe);

			// adds pointer in ascending order of ids
			var localPointer = this.globalToLocal(pointer);
			var touch = {

				identifier: pointer.identifier,

				localX: localPointer.localX,

				localY: localPointer.localY,

				pageX: pointer.pageX,

				pageY: pointer.pageY

			};

			this.addTouch(touch);

			md(this + ".setTouchPos-4", debugMe);

		},

		unsetTouchPos: function (pointer) {

			var touches = this.touches;
			var l = touches.length;
			var i = 0;

			while ((i < l) &&

				(touches[i].identifier !== pointer.identifier)) {

				i++;

			}

			// deals with the case where the pointer isn't stored...
			if (i < l) {

				touches.splice(i, 1);

			}

		},

		getTouch: function (touchID) {

			return _.find(this.touches, function (touch) {

				return touchID === touch.identifier;

			});

		},

		getTouchPos: function (touchID) {

			var retTouch = this.getTouch(touchID);

			if (!retTouch) {

				retTouch = {

					identifier: touchID,

					localX: 0,

					localY: 0,

					pageX: 0,

					pageY: 0

				};

				this.addTouch(retTouch);

			}

			return this.localToGlobal(retTouch);

		},

		applyTransform: function () {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var matrix = "matrix(" + this.matrix.join(",") + ")";

			if (this.autoApply) {

				md(this + ".autoApply", debugMe);

				this.target.style.WebkitTransform = matrix;

				this.target.style.OTransform = matrix;

				this.target.style.MozTransform = matrix;

			}
		},

		setTransform: function (rotation, scale, tx, ty) {

			this.setMatrix(rotation, scale, tx, ty);

			this.applyTransform();

		},

		getTransform: function () {
			var a = this.matrix[0];
			var b = this.matrix[2];

			var rotation = Math.atan(b / a);
			var scale = a / Math.cos(rotation);

			return {scale: scale, rotation: rotation};
		},

		setMatrix: function (rotation, scale, translateX, translateY) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			this.matrix[0] = Math.cos(rotation) * scale;

			this.matrix[2] = Math.sin(rotation) * scale;

			this.matrix[1] = -Math.sin(rotation) * scale;

			this.matrix[3] = Math.cos(rotation) * scale;

			this.matrix[4] = translateX;

			this.matrix[5] = translateY;

			md(this + ".setMatrix([" + this.matrix.join(',') + "])", debugMe);

		},

		localToGlobal: function (local) {
			var x = this.matrix[0] * local.localX + this.matrix[2] * local.localY + 1 * this.matrix[4];
			var y = this.matrix[1] * local.localX + this.matrix[3] * local.localY + 1 * this.matrix[5];
			return {
				pageX: x, pageY: y
			};
		},

		globalToLocal: function (pointer) {
			var dx = pointer.pageX - this.matrix[4];
			var dy = pointer.pageY - this.matrix[5];
			var det = this.matrix[0] * this.matrix[3] - this.matrix[1] * this.matrix[2];
			var x = (this.matrix[3] * dx - this.matrix[2] * dy) / det;
			var y = (-this.matrix[1] * dx + this.matrix[0] * dy) / det;
			return {localX: x, localY: y};
		},

		toString: function () {
			return "rotoZoomer";
		}

	};

	// namespaces the thing
	TipTap.RotoZoomer = RotoZoomer;

}(window.TipTap, _));

(function (TipTap, _, $) {

	var Router = function ($el, device) {
		this.debugMe = true;

		this.device = device;
		this.$el = $el;
		this.listOfCallbacks = {};
		this.listOfFilters = [];
		this.listOfActions = [];    // list of all Actions for this Router

		this.nofilter = false;  // special case when callback is set with no filter. While not set, is false

	};

	Router.prototype = {

		addActionListeners: function (action) {
			action.pressed.add(this.callComboCallback, this);
			action.sendCombo.add(this.callComboCallback, this);
			action.dragStarted.add(this.callComboCallback, this);
			action.dragged.add(this.callComboCallback, this);
			action.dragStopped.add(this.callComboCallback, this);
			action.released.add(this.callComboCallback, this);
			action.finished.add(this.deallocateAction, this);
		},

		allocateAction: function (finger) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var action;

			md(this + ".allocateAction-1", debugMe);

			// look for an existing Action on the same target
			// todo: allow few simultaneous Actions on a same target, differentiate by distance of the pointers
			action = this.findActionByTarget(finger.$target);

			// if no matching Action found, we create a new one
			if (!action) {

				md(this + ".allocateAction-couldn't find Action by target", debugMe);

				action = new TipTap.Action(finger.$target);

				md(this + ".allocateAction-new Action created", debugMe);

				this.listOfActions.push(action);

				this.addActionListeners(action);

			}

			action.addFingerListeners(finger);

			md(this + ".allocateAction-end(" + action + ")", debugMe);

		},

		bindCombos: function (combosList, filter, callback, context) {
			var comboRegexp;

			// beware, filter can be empty string from the app call, so it's necessary to test this anyway
			if (filter === "") {

				this.nofilter = true; // makes event callback test faster

				filter = TipTap.GLOBAL_CLASS_FILTER;

			} else {

				this.listOfFilters.push(filter);  // don't store the no-filter option, to test it last

			}

			// transforms the user-easy syntax into a regexp
			comboRegexp = Router.comboToRegExp(combosList);

			// if no entry for such a combo
			if (!this.listOfCallbacks[comboRegexp]) {

				// create it
				this.listOfCallbacks[comboRegexp] = {

					// compile the regex once
					regex:     new RegExp(comboRegexp),
					callbacks: []

				};

			}

			/* store the callback in a way which allows several callbacks to be attached to the same
			 element, with different filters. Store with unshift (instead of pop) so that latter
			 definitions appear first, and thus, if the user follows the rule of defining more global
			 rules first, rules will apply from the more precise to more general
			 */
			this.listOfCallbacks[comboRegexp].callbacks.unshift({
				                                                    filter:   filter,
				                                                    callback: callback,
				                                                    context:  context
			                                                    });
		},

		callComboCallback: function (action, combo) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md("<b>" + this + ".callComboCallback(" + action + ", " + combo + ", " + action.gesture + ")</b>", debugMe);

			// finds all the callbacks based on combo matching
			_.each(this.listOfCallbacks, function (listOfCallbacksForThisCombo) {

				if (listOfCallbacksForThisCombo.regex.test(combo)) {

					// simple optimization
					var $target = action.$target;

					// if target is the global container, and some actions are global, set to true
					var globalAction = ($target.is(this.$el) && this.nofilter);

					// for each matched combo, find the first filter matching the element (=> declare more restrictive filters first)
					var cb = _.find(listOfCallbacksForThisCombo.callbacks, function (element) {

						// if we are on an element catching some events, or if some global actions defined
						return $target.is(element.filter);

					});

					// if couldn't find a sub-element specific callback, but global effect is defined, look for global callback
					if (!cb && globalAction) {
						// just for speed
						var class_filler = TipTap.GLOBAL_CLASS_FILTER;

						cb = _.find(listOfCallbacksForThisCombo.callbacks, function (element) {

							// if we are on an element catching some events, or if some global actions defined
							return (element.filter === class_filler);

						});
					}

					if (cb) {

						// uses given context
						cb.callback.call(cb.context, action);

					}

				}

			}, this);

		},

		deallocateAction: function (action) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".deAllocateAction(" + action + ")", debugMe)

			this.listOfActions.splice(this.listOfActions.indexOf(action), 1);

		},

		findActionByTarget: function ($target) {

			return _.find(this.listOfActions, function (a) {

				// match action if same filter and same target
				return a.$target.is($target);

			});

		},

		findMatchingFilterForEvent: function ($target) {
			var filter;

			// check if target is really allowed to capture events (matching filter BEFORE global callbacks)
			filter = _.find(this.listOfFilters, function (fltr) {

				return $target.is(fltr);

			});

			// if filter was not matched, but the whole target is capturing, sends back the "-" filter
			if (!filter && this.nofilter) {

				return TipTap.GLOBAL_CLASS_FILTER;

			}

			// either the matched filter, or "undefined" if filter not found and no global capture
			return filter;

		},

		toString: function () {
			return "R";
		},

	};

	// Utilitarians functions for either format
	Router.comboToRegExp = function (fullCombo) {

		var debugMe = true && this.debugMe && TipTap.settings.debug;

		// replace human readable move codes (press, tip, release, etc.) by single letters for simpler & faster Regexp
		_.each(TipTap.Gesture.statusMatchCode, function (codeLetter) {

			fullCombo = fullCombo.replace(new RegExp(codeLetter.code, "g"), codeLetter.letter);

		});

		// separate all alternate combos to deal with them one by one: "A|B" -> ["A","B"]
		var listOfCombos = fullCombo.split(TipTap.settings.comboAlternateOperator);

		var listOfProcessedCombos = [];

		/*
		 Now, we're dealing with combos with syntax: tip*tap2>tip*tap2 or tip2tap>tip2tap
		 tip*tap2>tip*tap2 -> (tip)*(?=((tap){2})(?=(>(tip)*(?=((tap){2}))))
		 tip2tap>tip2tap -> ((tip){2})(?=(tap)(?=>(((tip){2})(?=(tap)))))
		 */
		_.each(listOfCombos, function (combo) {

			var processedCombo = Router.transformComboIntoRegex(combo);

			listOfProcessedCombos.push(processedCombo);

		});

		// recombine as a regexp, so with "|"
		//processedFullCombo = "(" + listOfProcessedCombos.join(")|(") + ")";
		return listOfProcessedCombos.join("|");

	};

	var gesturesLetters = _.reduce(TipTap.Gesture.statusMatchCode, function (memo, value) {

		// Concatenates all Gestures letters
		return memo + value.letter;

	}, "");


	Router.lettersAndSeparatorsRE = new RegExp("[" + gesturesLetters +
		                                           TipTap.settings.comboGesturesSep +
		                                           TipTap.settings.comboParallelActionOperator + "]");
	Router.modifiersRE = /[\*\+\?]/;
	Router.modifiersZeroOrRE = /[\*\?]/;
	Router.numbersRE = /[0-9]/;

	Router.transformComboIntoRegex = function (combo) {
		var comboLength = combo.length - 1;

		// analyze the combo from the end, because it's the way we must construct the regexp
		var index = 0;

		// the $ is added at the end of the inner most matching pattern!!
		return "^" + Router.recursiveTransformCombo(combo, comboLength, index);

	};

	Router.recursiveTransformCombo = function (combo, comboLength, index) {

		var c = combo.charAt(index++);
		var nextMove;

		// hack: I (ab)use the fact that treatment of ">" and "-" are the same as for moves letter. But it's only because
		// I don't do any serious error treatment and assume to receive always correctly formed combos...
		if (Router.lettersAndSeparatorsRE.test(c)) {

			// keeps the move
			var move = c;

			var power = 0;

			// at most, should be 11. And it's even a nonsense: can you imagine a usable gesture like tip11 ?? X'D
			while ((index <= comboLength) && Router.numbersRE.test(combo.charAt(index))) {

				power = 10 * power + parseInt(combo.charAt(index++), 10);

			}

			// no need to add a power if 0 (which doesn't even make sense!!) or 1
			if (power > 1) {

				move += "{" + power + "}";

			} else {

				// if no occurrences counter, check for modifiers
				if (index <= comboLength) {

					c = combo.charAt(index);

					// if no number, maybe one of these: ?+*
					if (Router.modifiersRE.test(c)) {

						var modifier = c;

						index++;

						if (Router.modifiersZeroOrRE.test(c) && (index <= comboLength)) {

							var hasDash = ((combo.charAt(index)) === TipTap.settings.comboParallelActionOperator);

							if (hasDash) {

								index++;

								nextMove = Router.recursiveTransformCombo(combo, comboLength, index);

							}

						}

					}

				}

			}

			// hasDash is set in case of "zero" modifiers and dash present
			if (hasDash) {

				/* real regexp syntax for "tip?-tap" and tip*-tap is quite different!
				 E?-F => F|E-F
				 E*-F => F|E+-F
				 plus the whole thing (?= of course
				 */

				switch (modifier) {

					case "?":
						move = "(" + nextMove + "|" + move + "(?=-(?=" + nextMove + ")))";
						break;

					case "*":
						move = "(" + nextMove + "|" + move + "+(?=-(?=" + nextMove + ")))";
						break;

					case "+":
						move += "+(?=-(?=" + nextMove + "))";
						break;

				}

			} else {

				if (modifier) {

					// add the modifier to the matching char: A*, B+, C?, etc.
					move += modifier;

				}

				// here, we have a complete move matching expression: A*, B{2}, C?, D+, ...
				// shouldn't happen!
				if (index <= comboLength) {

					// ^A*(?=(B{2}(?=(>(?=(A*(?=(B{2}$))))))))
					// AABB>ABB

					move += "(?=(" + Router.recursiveTransformCombo(combo, comboLength, index) + "))";

				} else {

					// for some reason not yet fully clear for me, the $ must be set at the innermost pattern matching!!
					move += "$";

				}

			}

			return move;

		} else {

			// should fail with error message...;
			return "";

		}

	};

	// namespaces the thing
	TipTap.Router = Router;

}(window.TipTap, _, window.jQuery));

(function (TipTap, _, $) {

	var Touch = function () {
		this.debugMe = true;

		this.START_EVENT = 'touchstart';
		this.DRAG_EVENT = 'touchmove';
		this.END_EVENT = 'touchend';
		this.CANCEL_EVENT = 'touchcancel';
	}

	Touch.prototype = {
		buildEtList:       function (e) {
			var l = TipTap.getEvent(e).changedTouches;
			_.each(l, function (t) {
				// adds timestamp to each touch
				t.timeStamp = e.timeStamp;
				t.$target = $(t.target);  // todo: remove jQuery dependency (use isSameNode instead of is)
			});
			return l;
		},
		onStart:           function (eventTouch) {
		},
		onDrag:            function (e) {
		},
		onEnd:             function (eventTouch) {
		},
		onCancel:          function (eventTouch) {
		},
		shouldCaptureDrag: function (e) {
			return true;
		}
	};

	// namespacing
	TipTap.Touch = Touch;

}(window.TipTap, _, window.jQuery));
