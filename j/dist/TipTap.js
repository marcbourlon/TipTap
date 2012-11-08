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
		debug:             true,
		device:              null,
		CAPTURE_BUBBLE:      0, // let the app define how some gesture are captured. Very useful to
		CAPTURE_CAPTURE:     1, // define gestures on containers, despite lots of underneath objects (so, different targets!)
		_CANCEL_BUBBLING:    true,
		DEVICE_DEFAULT:      0, // if nothing specified, will bind device events (mouse OR touch)
		DEVICE_MOUSE:        1, // allows to force usage of mouse device input
		DEVICE_TOUCH:        2, // allows to force usage of touch device input
		GLOBAL_CLASS_FILTER: "-", // char used internally for global container class
		_KEEP_BUBBLING:      false,
		listOfPointers:       [],
		listOfRouters:       [], // list of all Routers objects
		// Stolen the touch test from Modernizr. Including 49KB for just this was a bit overkill, to me
		isTouchInterface:    true,
		TOUCH_REFRESH_ms:    1000 / 60, // iOS touch devices frequency is 60Hz

		_bindCombosToRouter: function(router, combosFiltersCallbacksList, context) {

			// deal with the list of combos
			for (var combosIdx = 0, combosCount = combosFiltersCallbacksList.length; combosIdx < combosCount; combosIdx++) {

				var comboFilterCallback = combosFiltersCallbacksList[combosIdx];
				var combo = comboFilterCallback.combo;
				var filter = comboFilterCallback.filter || "";
				var callback = comboFilterCallback.callback;

				// attach combo and related callbacks to the Router
				router.bindCombos(combo, filter, callback, context);

			}
		},

		_detectTouchDevice: function () {
			var testsCount = 0;
			var passedTestsCount = 0;

			testsCount++;
			if ('ontouchstart' in window) {
				passedTestsCount++;
			}

			testsCount++;
			// must test stronger due to this f**king Chrome sending back yes for "ontouchstart", crashing Modernizr test
			try {

				document.createEvent('TouchEvent');

				passedTestsCount++;

			} catch (e) {

			}

			testsCount++;
			if ('createTouch' in document) {
				passedTestsCount++;
			}

			testsCount++;
			if (typeof TouchEvent != 'undefined') {
				passedTestsCount++;
			}

			testsCount++;
			if (typeof Touch == 'object') {
				passedTestsCount++;
			}

			testsCount++;
			if ('ontouchend' in document) {
				passedTestsCount++;
			}

			// if more than 80% of tests positive, assume it's ok. Sadly, it's not true...
			// http://modernizr.github.com/Modernizr/touch.html
			return ((passedTestsCount / testsCount) > 0.8);

		},

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

		_findPointerByIdentifier: function (identifier) {

			return _.find(this.listOfPointers, function (f) {

				return (f.identifier === identifier);

			});

		},

		_findRouter: function(listOfRouters, node$) {

			for (var routerIdx = 0, routersCount = listOfRouters.length; routerIdx < routersCount; routerIdx++) {

				var tmpRouter = listOfRouters[routerIdx];

				// if attaching to same element than a previous one, then use same Router
				if (tmpRouter.isOnNode$(node$)) {

						return tmpRouter;

				}

			}

			return null;

		},

		buildNamespacedEventName: function (eventBasename) {

			return  eventBasename + '.TipTap';

		},

		init: function (options) {

			this.settings = _.extend(this.settings, options);

			this.isTouchInterface = this._detectTouchDevice();

			// avoids too accurate movements to be detected, preventing proper gestures
			this.settings.moveThreshold_px = this.isTouchInterface ? 8 : 0;

			if (this.settings.useBorisSmusPointersPolyfill) {

				this.device = this.UnifiedPointer;

			} else {

				if ((this.settings.deviceType === this.DEVICE_TOUCH) || this.isTouchInterface) {

					this.device = this.Touch;

				} else {

					this.device = this.Mouse;

				}

			}

			// if user asks to use jQuery but this is not present, deny it
			this.settings.use$ = this.settings.use$ && !!$;

			this._use$(this.settings.use$);

			// set drag, end and cancel callbacks
			this._setCallbacks$();

		},

		_isArray: function (testVariable) {

			return (Object.prototype.toString.call(testVariable) === "[object Array]");

		},

		/**
		 * on
		 *
		 * @param nodesList : list of DOM elements gathered by querySelectorAll(<filter>)
		 * @param combosFiltersCallbacksList :  "list" of combos to match (see syntax reference)
		 * @param filter : DOM filter expression for delegation
		 * @param callback : callback
		 * @param context : optional context in which to call the callback (like .bind, $.bind, _.bind...)
		 * @return {*}
		 */
		on: function (nodesList, combosFiltersCallbacksList, context) {

			if (!nodesList) {

				// if no nodeslist, return TipTap anyway for chaining
				return this;

			}

			// make single value a list to unify treatment later.
			if (!this._isArray(nodesList)) {

				nodesList = [nodesList];

			}

			// make single value a list to unify treatment later. isArray test in case it's not present.
			if (!this._isArray(combosFiltersCallbacksList)) {

				combosFiltersCallbacksList = [combosFiltersCallbacksList];

			}

			for (var nodeIdx = 0, nodesCount = nodesList.length; nodeIdx < nodesCount; nodeIdx++) {

				var curNode = nodesList[nodeIdx];

				var router = this._findRouter(this.listOfRouters, curNode);

				// No router found, create new and keep in list
				if (!router) {

					router = new TipTap.Router(curNode);

					this.listOfRouters.push(router);

					// no support for old IEs
					curNode.addEventListener(this.device.START_EVENT_NAME, _.bind(this.onStart, this, router));

				}

				this._bindCombosToRouter(router, combosFiltersCallbacksList, context);

			}

			// return TipTap for chaining
			return this;

		},

		$on: function (nodesList, combosFiltersCallbacksList, context) {

			// make single value a list to unify treatment later. isArray test in case it's not present.
			if (!this._isArray(combosFiltersCallbacksList)) {

				combosFiltersCallbacksList = [combosFiltersCallbacksList];

			}

			// could use "TipTap", but cleaner.
			var tipTap = this;

			return nodesList.each(function () {

				// the jQuery wrapped DOM element we're working on
				var $this = $(this);

				var router = tipTap._findRouter(tipTap.listOfRouters, $this);

				// No router found, create new and keep in list
				if (!router) {

					router = new TipTap.Router($this);  // otherwise, create new

					tipTap.listOfRouters.push(router);

					$this
						.bind(
						tipTap.buildNamespacedEventName(tipTap.device.START_EVENT_NAME),
						_.bind(tipTap.onStart, // calls onStart from TipTap
						       tipTap, // positioning "this" to TipTap
						       router)
					);       // and sending router as 1st param

				}

				tipTap._bindCombosToRouter(router, combosFiltersCallbacksList, context);

				return $this;

			});

		},

		onStart: function (router, event) {
			var debug = true && TipTap.debug && TipTap.settings.debug;

			var t = Date.now();

			md(this + ".onStart-1: " + t + "<hr/>", debug);

			// Pass "keep bubbling", that the _.reduce will transform into "cancel bubbling" if a matching event is found
			if (_.reduce(this.device.buildEventList(event),

			             _.bind(this.onStartDo, this, router),

			             TipTap._KEEP_BUBBLING,

			             this) === TipTap._CANCEL_BUBBLING) {

				this.stopEvent(event);

			}

			md(this + ".onStart-2: " + (Date.now() - t) + " ms", debug);

		},

		onStartDo: function (router, bubblingStatus, tiptapEvent) {
			var debug = true && TipTap.debug && TipTap.settings.debug;
			var pointer;
			var filter;

			md(this + ".onStartDo-1", debug);

			// check if the event target element is matching at least one defined filter
			filter = router.findMatchingFilterForEvent(tiptapEvent.getTarget$());

			// if no filter found, the component has no callback for this eT
			if (!filter) {

				return bubblingStatus;

			}

			md(this + ".onStartDo-2", debug);

			pointer = new TipTap.Pointer(tiptapEvent);

			// Keep track of the pointer to dispatch further moves
			this.listOfPointers.push(pointer);

			// allocate an Action for this Pointer, passing the callbacks list
			router.allocateAction(pointer);

			md(this + ".onStartDo-3", debug);

			// in case the device has something to do with the EventTouch before this one is processed by the Pointer
			this.device.onStart();

			pointer.onStart(tiptapEvent);

			md(this + ".onStartDo-4", debug);

			return TipTap._CANCEL_BUBBLING;

		},

		onDrag: function (e) {
			/*
			 the system sends events only for one HTML target, so in theory for one Action. But when we can split
			 Actions to allow splitting elements, we'll have to deal with several Actions concerned by one event
			 Will it work?
			 */
			var debug = false && TipTap.debug && TipTap.settings.debug;

			var cancelBubbling = TipTap._KEEP_BUBBLING;

			var t = Date.now();

			// todo: onMove which also tracks mouse move (not drag). for this, check if an Action exists, and if not, create one
			if (!this.device.shouldCaptureDrag()) {

				return;

			}

			// in case the device has something to do with the ET
			this.device.onDrag(e);

			// buildEtList unifies mouse and touch events/touchs in a list
			_.each(this.device.buildEventList(e), function (tipTapEvent) {

				// we store the touch identifier in the Pointer, so we can match new incoming events. Obvious.
				var pointer = this._findPointerByIdentifier(tipTapEvent.identifier);

				// not found (can't happen...)
				if (!pointer) {

					return;

				}

				md(this + ".onDrag: " + t + ",l=" + this.device.buildEventList(e).length + "<hr/>", debug);

				cancelBubbling = TipTap._CANCEL_BUBBLING;

				pointer.onDrag(tipTapEvent);

			}, this);

			if (cancelBubbling) {

				this.stopEvent(e);

			}
		},

		onEnd: function (e) {

			var debug = true && TipTap.debug && TipTap.settings.debug;

			// odd (?) usage of _.reduce(): calls pointer.end() on all pointers concerned
			if (_.reduce(this.device.buildEventList(e), _.bind(this.onEndDo, this), TipTap._KEEP_BUBBLING, this)) {

				md(this + ".onEnd", debug, "#F00");

				this.stopEvent(e);

			}

		},

		onEndDo: function (bubblingStatus, tipTapEvent) {

			var debug = true && TipTap.debug && TipTap.settings.debug;

			var pointer = this._findPointerByIdentifier(tipTapEvent.identifier);

			if (!pointer) {

				return bubblingStatus;

			}

			md(this + ".onEndDo", debug, "#F00");

			this.device.onEnd(tipTapEvent);      // in case the device has something to do with the event

			pointer.onEnd(tipTapEvent);

			this.unlinkPointer(pointer);

			return TipTap._CANCEL_BUBBLING;

		},

		onCancel: function (e) {

			md(this + ".onCancel", debug);

			this.onEnd(e);  // todo: better management of cancel ?
		},

		_setCallbacks$: null,

		_setCallbacks: function () {

			// only one global listener for move/end/cancel. Because fast mouse movement can move cursor out of element, and
			// because end can be fired on another element, dynamically created during drag (same as in drag'n'drop, etc.)
			document.addEventListener(this.device.DRAG_EVENT_NAME, _.bind(this.onDrag, this));
			document.addEventListener(this.device.END_EVENT_NAME, _.bind(this.onEnd, this));
			document.addEventListener(this.device.CANCEL_EVENT_NAME, _.bind(this.onCancel, this));

		},

		_set$Callbacks: function () {

			$(document)
				.bind(this.buildNamespacedEventName(this.device.DRAG_EVENT_NAME), _.bind(this.onDrag, this))
				.bind(this.buildNamespacedEventName(this.device.END_EVENT_NAME), _.bind(this.onEnd, this))
				.bind(this.buildNamespacedEventName(this.device.CANCEL_EVENT_NAME), _.bind(this.onCancel, this));

		},

		stopEvent: function (e) {

			e.preventDefault();
			//e.stopPropagation();
			//e.stopImmediatePropagation();
		},

		toString: function () {
			return "TipTap";
		},

		unlinkPointer: function (pointer) {

			var debug = true && TipTap.debug && TipTap.settings.debug;

			var l = this.listOfPointers.length;

			this.listOfPointers.splice(this.listOfPointers.indexOf(pointer), 1);

			md(this + ".unlinkPointer: " + l + " -> " + this.listOfPointers.length, debug);

		},

		_use$: function (use$) {

			this._setCallbacks$ = (use$) ? this._set$Callbacks : this._setCallbacks;

			this.device.use$(use$);
			this.Action.use$(use$);
			this.Pointer.use$(use$);
			this.PointerInfos.use$(use$);
			this.Router.use$(use$);

		},

	};

	TipTap.settings = {

		comboAlternateOperator: "|", // char to define alternate combos: press/tip

		comboEndTimer_ms: 100, // delay accepted before next tap or swipe to keep it in the gesture (like in dblclick)

		comboGesturesSep: ">", // char to separate combos: tap2>tap2

		comboParallelActionOperator: "-", // char to show simultaneous actions: tip2-tap2

		debug: true,

		deviceType: TipTap.DEVICE_MOUSE, // which kind of device do we use

		moveThreshold_px: 0, // min distance to consider that the move was intentional

		rotoZoom: false, // whether to activate the hack of CSS3 rotation/zoom

		simultaneousMovesTimer_ms: 3 * TipTap.TOUCH_REFRESH_ms, // delay accepted between similar events/moves to be considered  as simultaneous

		swipeDuration_ms: 8 * TipTap.TOUCH_REFRESH_ms, // max move duration to still be a swipe

		swipeMaxDistance_px: 160, // max distance to still be considered as swipe

		swipeMinDisplacement_px: 16, // minimal distance of first move to consider as swipe

		tapMaxDuration_ms: 150, // if down without move for longer than this, it's a tip. Otherwise, move or tap

		useBorisSmusPointersPolyfill: false, // use Boris Smus pointers polyfill. TODO: make it work.

		use$: false, // whether to use jQuery or not

		useTipPrefixes: false, // include or not the "tip" prefixes in complex gestures: "tip-tap" or just "tap"

	};

	// there are more elegant ways to do so, but I'll do when I'm a grown up js developer :-P
	window.TipTap = TipTap;

	// jQuery "pluginification"
	var methods = {

		activate: function () {

			return TipTap.activate(this);

		},

		on: function (combosList, filter, callback, context) {

			return TipTap.$on(this, combosList, filter, callback, context);

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
		$.fn.tipTap = function (method, combosList, filter, callback) {

			if (methods[method]) {

				return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));

			} else if (typeof method === 'object' || !method) {

				return methods.init.apply(this, arguments);

			} else {

				$.error('Method ' + method + ' does not exist in jQuery.tipTap');

			}

		};

	}

}(window, document, window.jQuery));

// Hack: helper debug function, very crappy to have it here, I'm shameful! :'(
var md = (function () {
	var dl = $('#debuglog');
	return function (t, display, color) {
		if (display) {
			if (color) {
				t = '<span style="color: ' + color + '; ">' + t + '</span>';
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

				// allow to define a list of pointerStatusToGestureSignalMapping generating the same transition (namely end and cancel for touch :-D)
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

		var debug = true && Gesture.debug && TipTap.settings.debug;

		this.id = Gesture.id();

		this.status = status;

		this.direction = direction;

		this.listOfPointers = [];

		// birth time of the Gesture, to know if it's dead
		// todo?: use the first pointer datetime as birthTime! Will fix some small delay due to notification gestures
		this.birthTime = Date.now();

		md(this + ".new(" +
			   Gesture.statusMatchCode[Gesture.getFullStatus(this.status, this.direction)].code + ")", debug, Gesture.debugColor);

	};

	Gesture.prototype = {
		toString: function () {

			return "--G#" + this.id + "-" + Gesture.statusMatchCode[this.status].code;

		}

	};

	Gesture.debug = true;
	Gesture.debugColor = "#" + (Math.round(Math.random() * Math.pow(2, 24))).toString(16);

	Gesture.formatGesture = function (status, direction, pointersCount) {
		var debug = true && Gesture.debug && TipTap.settings.debug;
		var i;
		var result = "";
		var statusName;

		// if only two arguments, assume direction not given
		if (arguments.length === 2) {

			pointersCount = direction;

			direction = TipTap.Pointer._DIR_NONE;

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

		md("Gesture.formatGesture: " + result, debug);

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

			case TipTap.Pointer._DIR_TOP:
				return Gesture._SWIPED_T;

			case TipTap.Pointer._DIR_BOTTOM:
				return Gesture._SWIPED_B;

			case TipTap.Pointer._DIR_LEFT:
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

/**
 * Created with IntelliJ IDEA.
 * User: marcbourlon
 * Date: 05/11/12
 * Time: 19:01
 */
/**
 * HICS stands for Human Inaccuracy Compensation System. Call it brilliant or call it pretentious,
 * I couldn't find a great name for this class which aim is to wait for some time to allow some almost
 * simultaneous similar moves to be taken into account as simultaneous.
 */
(function (TipTap, _) {

	var Hics = function (status, direction) {

		var debug = true && Hics.debug && TipTap.settings.debug;

		this.id = Hics.id();

		this.status = status;

		this.direction = direction;

		this.listOfPointers = [];

		// birth time of the Hics, to know if it's dead
		// todo?: use the first pointer datetime as birthTime! Will fix some small delay due to notification gestures
		this.birthTime = Date.now();

		md(this + ".new(" +
			   TipTap.Gesture.statusMatchCode[TipTap.Gesture.getFullStatus(this.status, this.direction)].code + ")", debug, Hics.debugColor);

	};

	Hics.prototype = {

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

		canThisPointerBeAdded: function (pointer) {
			var debug = true && Hics.debug && TipTap.settings.debug;

			md(this + ".canThisPointerBeAdded(" +
				   TipTap.Gesture.statusMatchCode[TipTap.Gesture.getFullStatus(this.status, this.direction)].code +
				   " =?= " +
				   TipTap.Gesture.statusMatchCode[TipTap.Gesture.getFullStatus(pointer.status, pointer.direction)].code +
				   ", " + pointer.identifier +
				   ")", debug, Hics.debugColor);

			// accepts only similar statuses in one combo, and not twice the same Finger
			return ((this.status === pointer.status) &&

				(this.direction === pointer.direction) &&

				!this.hasThisPointerAlready(pointer));

		},

		format: function () {
			var debug = true && Hics.debug && TipTap.settings.debug;

			var format = TipTap.Gesture.formatGesture(this.status, this.direction, this.getPointersCount());

			md(this + ".format: " + format, debug, Hics.debugColor);

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

		hasThisPointerAlready: function (pointer) {
			var debug = true && Hics.debug && TipTap.settings.debug;
			var test;

			test = _.find(this.listOfPointers, function (ptr) {

				return (ptr.identifier === pointer.identifier);

			});

			md(this + ".hasThisPointerAlready => " + test, debug, Hics.debugColor);

			return test;
		},

		isEmpty: function () {

			return     !this.listOfPointers.length;

		},

		getPointersCount: function () {

			return this.listOfPointers.length;

		},

		toString: function () {

			return "--H#" + this.id + "-" + TipTap.Gesture.statusMatchCode[this.status].code;

		}

	};

	Hics.debug = true;
	Hics.debugColor = "#" + (Math.round(Math.random() * Math.pow(2, 24))).toString(16);

	Hics.id = function () {

		Hics._id++;

		return Hics._id;

	};

	Hics._id = 0;


	// namespaces the thing
	TipTap.Hics = Hics;

}(window.TipTap, _));

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
			// todo: do we need second "this" binding?? (the one from add()). Same question for other signals
			pointer.pressed.add(_.bind(this.allocateHics, this, TipTap.Gesture._PRESSED, pointer), this);
			pointer.tapped.add(_.bind(this.allocateHics, this, TipTap.Gesture._TAPPED, pointer), this);
			pointer.tipped.add(_.bind(this.allocateHics, this, TipTap.Gesture._TIPPED, pointer), this);
			pointer.untipped.add(_.bind(this.allocateHics, this, TipTap.Gesture._UNTIPPED, pointer), this);
			pointer.swiped.add(_.bind(this.allocateHics, this, TipTap.Gesture._SWIPED, pointer), this);
			pointer.dragStarted.add(_.bind(this.allocateHics, this, TipTap.Gesture._DRAG_STARTED, pointer), this);
			pointer.dragged.add(_.bind(this.allocateHics, this, TipTap.Gesture._DRAGGED, pointer), this);
			pointer.dragStopped.add(_.bind(this.allocateHics, this, TipTap.Gesture._DRAG_STOPPED, pointer), this);
			pointer.released.add(_.bind(this.allocateHics, this, TipTap.Gesture._RELEASED, pointer), this);
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

(function (TipTap, _) {

	var Pointer = function (tiptapEvent) {
		
		var debug = true && Pointer.debug && TipTap.settings.debug;

		this.direction = Pointer._DIR_NONE;

		this.identifier = tiptapEvent.identifier;

		// the flag is set if the Pointer has tipped before doing other things. Simplifies FSM logic a lot!!
		this.isTipping = false;

		// to store the list of "pointer" informations for this Pointer during its life
		this.listOfPositions = [];

		// used to store details about the absolute drag: distance (x, y, total), speed (x, y, total), duration
		this.dragDetailsAbsolute = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// used to store details about the relative drag (between two last positions)
		this.dragDetailsRelative = { dx: 0, dy: 0, d: 0, spx: 0, spy: 0, spd: 0, duration_ms: 0 };

		// reference to the timer used to switch from tap to tip, allows to kill it when Pointer up early
		this.pressedToTippedTimer = 0;

		// index of the positions list of when the swipe started (to calculate values)
		this.swipeStartPositionIndex = 0;

		// keep a reference to the initial target to force it to new Pointers (fast moves can make mouse move outside of it)
		this.target = this.$target = null;
		this._setTarget$(tiptapEvent.getTarget$());

		// create the Signals to send to listeners
		this.createSignals();

		// we store all positions
		this.storePosition(tiptapEvent);

		md(this + ".new()", debug);

	};

	/* "stateless" finite state machine, shared by all Pointers. Stateless means that each Pointer's state is stored in
	 the Pointer itself. Advantage: ONE FSM for all Pointers => don't recreate the SAME FSM for each Pointer, EACH TIME
	 a new Pointer is created, which wastes some CPU time, and means more GC in the end.
	 */
	Pointer.fsm = new TipTap.Fsm(TipTap.Fsm.DONT_SAVE_STATE);

	// todo: factor similar actions in functions (tip-startDragging-drag and startDragging-drag for example)
	// todo: dragStopped ?
	// in this FSM, all callbacks' "this" refers to the Pointer calling.
	Pointer.fsm.init(
		[
			{
				from:        "start",
				isStart:     true,
				transitions: [
					{
						signal: "pressed",
						to:     "pressing",
						action: function () {
							var debug = true && Pointer.debug && TipTap.settings.debug;
							var position = this.getPosition();

							// start the timer which after the time limit transforms the press (potential tap) to a sure tip
							this.startPressedToTippedTimer();

							// let's tell the world we pressed !
							this.pressed.dispatch();

							md(this + "-fsm(start-pressed-pressing),(" + position.pageX + "px, " + position.pageY + "px)", debug);

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
							var debug = true && Pointer.debug && TipTap.settings.debug;

							md(this + "-fsm(pressing-pressedToTipped-tipping)", debug);

							/*
							 swipe and dragStop are fully similar and can be done from press or tip. But in the case of coming
							 after a tip, we need to send untip at the end. A flag allows to avoid FSM states duplication
							 */
							this.isTipping = true;

							this.tipped.dispatch();

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

							var debug = true && Pointer.debug && TipTap.settings.debug;

							this.cancelPressedToTippedTimer();

							md(this + "-fsm(pressing-ended-end)", debug);

							this.tapped.dispatch();

							this.released.dispatch();

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
							var debug = true && Pointer.debug && TipTap.settings.debug;

							md(this + "-fsm(tipping-ended)", debug);

							this.untipped.dispatch();

							this.released.dispatch();

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
							var debug = true && Pointer.debug && TipTap.settings.debug;

							md(this + "-fsm(dragging-dragged-1)", debug);

							this.dragged.dispatch();

						}
					},
					{
						signal: ["ended", "cancelled"],
						to:     "end",
						action: function () {
							var debug = true && Pointer.debug && TipTap.settings.debug;

							this.dragStopped.dispatch();

							md(this + "-fsm(dragging-ended-1)", debug);

							// usage of this flag simplifies the Fsm
							if (this.isTipping) {

								this.untipped.dispatch();

							}

							this.released.dispatch();

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
							var debug = true && Pointer.debug && TipTap.settings.debug;

							// if the movement is too much for being a swipe, convert it down to a normal drag
							if (!this.notSwipingAnymore()) {

								return TipTap.Fsm._SELF;

							}

							this.dragStarted.dispatch();

							md(this + "-fsm(swiping-dragged-1)", debug);

							this.dragged.dispatch();

							return "dragging";
						}

					},
					{
						signal: ["ended", "cancelled"],
						to:     "end",
						action: function () {
							var debug = true && Pointer.debug && TipTap.settings.debug;

							md(this + "-fsm(swiping-ended-1)", debug);

							this.swiped.dispatch();

							// usage of this flag simplifies the Fsm
							if (this.isTipping) {

								this.untipped.dispatch();

							}

							this.released.dispatch();

						}
					}
				]
			}
		]
	);

	Pointer._DIR_NONE = 0;
	Pointer._DIR_TOP = 1;
	Pointer._DIR_RIGHT = 2;
	Pointer._DIR_BOTTOM = 4;
	Pointer._DIR_LEFT = 8;

	Pointer.prototype = {

		addPosition: function (position) {

			this.listOfPositions.push(position);

		},

		cancelPressedToTippedTimer: function () {

			var debug = true && Pointer.debug && TipTap.settings.debug;

			md(this + ".cancelPressedToTippedTimer-1", debug);

			if (this.pressedToTippedTimer) {

				md(this + ".cancelPressedToTippedTimer-2", debug);

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
			var debug = true && Pointer.debug && TipTap.settings.debug;
			var state;

			// if not really dragged, move away without doing anything
			if (this.wasAnUncontrolledMove()) {

				return TipTap.Fsm._SELF;

			}

			md(this + "-fsm(pressing-dragged-1)", debug);

			// because we moved for good, we cancel the planned change of state. Useless in the case of transiting from TIP
			this.cancelPressedToTippedTimer();

			// detects if the move is a swipe
			state = this.isSwipingOrDragging();

			md(this + "-fsm(pressing-dragged-2)", debug);

			// if we detect a swipe, we must go to the corresponding state
			if (state === "swiping") {

				return state;

			}

			md(this + "-fsm(pressing-dragged-3)", debug);

			// tell the world we started a drag :-)
			this.dragStarted.dispatch();

			// and that we dragged
			this.dragged.dispatch();

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
			var debug = true && Pointer.debug && TipTap.settings.debug;

			var settings = TipTap.settings;
			var dx, dy, adx, ady;

			dx = this.dragDetailsRelative.dx;
			adx = Math.abs(dx);
			dy = this.dragDetailsRelative.dy;
			ady = Math.abs(dy);

			//md(this + ".isSwipingOrDragging-1: " + this.dragDetailsAbsolute.duration_ms + "px", debug)

			md(this + ".isSwipingOrDragging-2", debug);

			if (adx >= ady) {

				md(this + ".isSwipingOrDragging, adx: " + adx, debug, "#0F0")

				if (adx >= settings.swipeMinDisplacement_px) {

					if (dx > 0) {

						md(this + ".isSwipingOrDragging > swipe-r", debug);

						this.direction = Pointer._DIR_RIGHT;

					} else {

						md(this + ".isSwipingOrDragging > swipe-l", debug);

						this.direction = Pointer._DIR_LEFT;

					}

					this.swipeStartPositionIndex = this.listOfPositions.length - 1;

					return "swiping";

				}
			} else {

				if (ady >= settings.swipeMinDisplacement_px) {

					if (dy > 0) {

						md(this + ".isSwipingOrDragging > swipe-b", debug);

						this.direction = Pointer._DIR_BOTTOM;

					} else {

						md(this + ".isSwipingOrDragging > swipe-t", debug);

						this.direction = Pointer._DIR_TOP;

					}

					this.swipeStartPositionIndex = this.listOfPositions.length - 1;

					return "swiping";

				}

			}

			return "tipping";

		},

		notSwipingAnymore: function () {
			var debug = true && Pointer.debug && TipTap.settings.debug;
			var settings = TipTap.settings;

			md(this + ".notSwipingAnymore: " + this.dragDetailsAbsolute.duration_ms + "ms, " + this.dragDetailsAbsolute.d + "px", debug);

			return (
				this._computeMove(
					this.swipeStartPositionIndex,
					this.listOfPositions.length - 1).duration_ms >
					settings.swipeDuration_ms
				) || (this.dragDetailsAbsolute.d > settings.swipeMaxDistance_px);
		},

		onDrag: function (tipTapEvent) {
			var debug = true && Pointer.debug && TipTap.settings.debug;

			this.storePosition(tipTapEvent);

			// computes all the important movement values: distance, speed, duration_ms...
			this.dragDetailsAbsolute = this.computeAbsMove();
			this.dragDetailsRelative = this.computeRelMove();

			Pointer.fsm.dragged.call(this);
		},

		onEnd: function (tipTapEvent) {

			this.storePosition(tipTapEvent);

			Pointer.fsm.ended.call(this);

		},

		onStart: function () {
			Pointer.fsm.pressed.call(this);
		},

		pressedToTipped: function () {

			Pointer.fsm.pressedToTipped.call(this);

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
			var debug = true && Pointer.debug && TipTap.settings.debug;

			md(this + ".startPressedToTippedTimer-1", debug);

			if (!this.pressedToTippedTimer) {

				md(this + ".startPressedToTippedTimer-2", debug);

				// start the timer
				this.pressedToTippedTimer = setTimeout(_.bind(this.pressedToTipped, this),
				                                       TipTap.settings.tapMaxDuration_ms);

			}
		},

		storePosition: function (tipTapEvent) {

			this.addPosition(new TipTap.Position(tipTapEvent));

		},

		toString: function () {
			return "---Ptr#" + this.identifier;
		},

		wasAnUncontrolledMove: function () {
			var debug = false && TipTap.settings.debug && Pointer.debug;

			var settings = TipTap.settings;

			md(this + ".wasAnUncontrolledMove(" +
				   Math.abs(this.dragDetailsAbsolute.dx) + "px, " +
				   Math.abs(this.dragDetailsAbsolute.dy) + "px)", debug);

			return ((Math.abs(this.dragDetailsAbsolute.dx) <= settings.moveThreshold_px) &&
				(Math.abs(this.dragDetailsAbsolute.dy) <= settings.moveThreshold_px));
		}

	};

	Pointer.debug = true;

	Pointer.use$ = function (use$) {

		if (use$) {

			this.prototype.getTarget$ = this.prototype.get$Target;
			this.prototype._setTarget$ = this.prototype._set$Target;

		} else {

			this.prototype.getTarget$ = this.prototype.getTarget;
			this.prototype._setTarget$ = this.prototype._setTarget;

		}


	};


	// namespacing
	TipTap.Pointer = Pointer;

}(window.TipTap, _));

(function (TipTap) {
	// TODO: management of two buttons. click, clack, unclick, clickl, clickr, clackl, clackr

	// namespaces the thing
	Mouse = {
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

			//md("Mouse up:" + e.timeStamp, debug);
			this.mouseDown = false;

		},

		onCancel: function (tiptapEvent) {

			this.onEnd(tiptapEvent);

		},

		shouldCaptureDrag: function () {

			// whether or not a move event should be captured (we deal with dragging only for now)
			return this.mouseDown;

		},

		use$: function (use$) {

			TipTap.MouseEvent.use$(use$);

		},

	};

	TipTap.Mouse = Mouse;

}(window.TipTap));

/**
 * User: marcbourlon
 * Date: 11/10/12
 * Time: 18:46
 */
(function (TipTap, $) {

		// namespaces the thing
	MouseEvent = function (event) {

		this.identifier = 1;

		// exists in both original even and in jQuery event (I hope in all browsers/OS/platforms... :-s)
		this.pageX = event.pageX;
		this.pageY = event.pageY;

		// preallocating both to null might help optimizers / JIT
		this.target = null;
		this.$target = null;
		this._setTarget$FromEvent(event);

		this.timeStamp = event.timeStamp;

	};

	MouseEvent.prototype = {

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget$FromEvent: null,

		_setTargetFromEvent: function (event) {

			this.target = event.target;

		},

		_set$TargetFromEvent: function (event) {

			// add jQuery object wrapper for the DOM
			this.$target = $(event.target);

		},

	};

	MouseEvent.use$ = function (use$) {

		if (use$) {
			// replaces methods. I know, I "should" use decorators, but it's a bit heavy for this.
			this.prototype._setTarget$FromEvent = this.prototype._set$TargetFromEvent;
			this.prototype.getTarget$ = this.prototype.get$Target;

		} else {

			this.prototype._setTarget$FromEvent = this.prototype._setTargetFromEvent;
			this.prototype.getTarget$ = this.prototype.getTarget;

		}

	};

	TipTap.MouseEvent = MouseEvent;

}(window.TipTap, window.jQuery));

(function (TipTap, _) {

	var PointerInfos = function (pointer, status) {

		this.identifier = pointer.identifier;

		this.target = null;
		this.$target = null;
		this._setTarget$(pointer.getTarget$());

		this.pageX = pointer.getPosition().pageX;

		this.pageY = pointer.getPosition().pageY;

		this.status = status;

		this.direction = pointer.getDirection();

	};

	PointerInfos.prototype = {

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget$: null,

		_setTarget: function (target) {

			this.target = target;

		},

		_set$Target: function ($target) {

			this.$target = $target;

		},

		toString: function () {

			return "Ptr#" + this.identifier;

		}

	};

	PointerInfos.use$ = function (use$) {

		if (use$) {

			this.prototype._setTarget$ = this.prototype._set$Target;
			this.prototype.getTarget$ = this.prototype.get$Target;

		} else {

			this.prototype._setTarget$ = this.prototype._setTarget;
			this.prototype.getTarget$ = this.prototype.getTarget;

		}

	};

	// namespaces the thing
	TipTap.PointerInfos = PointerInfos;

}(window.TipTap, _));

(function (TipTap) {

	var Position = function (tipTapEvent) {

		this.timeStamp = tipTapEvent.timeStamp;

		this.pageX = tipTapEvent.pageX;

		this.pageY = tipTapEvent.pageY;

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

		var debug = true && RotoZoomer.debug && TipTap.settings.debug;

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

			md("<b>" + this + ".new, data read(m: [" + $target.data("rotoZoomer-matrix") + "], rotateable: " + $target.data("rotoZoomer-rotateable") + ", zoomable: " + $target.data("rotoZoomer-zoomable") + ", autoApply: " + $target.data("rotoZoomer-autoapply") + ")</b>", debug);

		} else {

			this.matrix = [1, 0, 0, 1, 0, 0];

			this.rotateable = rotateable;

			this.zoomable = zoomable;

			this.autoApply = autoApply;

			md("<b>" + this + ".new, data (m: [1, 0, 0, 1, 0, 0], rotateable: " + rotateable + ", zoomable: " + zoomable + ", autoApply: " + autoApply + ")</b>", debug);


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
			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			md(this + ".getTouchVector-1", debug);

			md(this + ".getTouchVector-1(x1: " + position1.pageX + ", y1: " + position1.pageY + ", x2: " + position2.pageX + ", y2: " + position2.pageY + ")", debug);

			var vec = {

				x: position2.pageX - position1.pageX,

				y: position2.pageY - position1.pageY

			};

			// todo: rename in len, rot
			vec.length = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

			vec.rotation = Math.atan2(vec.y, vec.x);

			vec.cx = position2.pageX + vec.x / 2;

			vec.cy = position2.pageY + vec.y / 2;

			md(this + ".getTouchVector-2: l: " + vec.length + ", r: " + vec.rotation + ", cx: " + vec.cx + ", cy: " + vec.cy, debug);

			return vec;
		},

		onDrag: function (gesture) {

			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			md(this + ".onDrag-1", debug);

			var lop = gesture.listOfPointers;

			var touch0;

			var touch1;

			var rotation;

			var zoom;

			var vector;


			if (lop.length >= 2) {

				md(this + ".onDrag-2", debug);

				touch0 = this.getTouch(lop[0].identifier);

				touch1 = this.getTouch(lop[1].identifier);

				vector = this.getTouchVector(
					{pageX: lop[0].pageX, pageY: lop[0].pageY},
					{pageX: lop[1].pageX, pageY: lop[1].pageY}
				);

				md(this + ".onDrag-2, vector.length = " + vector.length + ", vector.rotation = " + vector.rotation, debug);

				zoom = vector.length / this.touchDist;

				md(this + ".onDrag-2, this.touchDist = " + this.touchDist + ", this.touchRot = " + this.touchRot, debug);

				if (this.rotateable) {

					rotation = this.touchRot - vector.rotation;

				}

				md(this + ".onDrag-3(rot:" + rotation + ", zoom:" + zoom + ")", debug);

				this.setMatrix(rotation, zoom, 0, 0);

				/*		this.setMatrix(rotation, zoom, -(touch0.pageX + touch1.pageX) / 2, -(touch0.pageY + touch1.pageY) / 2);

				 var globalTouch0 = this.getTouchPos(touch0.identifier);

				 var globalTouch1 = this.getTouchPos(touch1.identifier);

				 this.matrix[4] = -(globalTouch0.pageX + globalTouch1.pageX) / 2;

				 this.matrix[5] = -(globalTouch0.pageY + globalTouch1.pageY) / 2;
				 */
				md(this + ".onDrag-4", debug);

				this.applyTransform();

			}

			md(this + ".onDrag-end", debug);

		},

		onPressed: function (gesture) {

			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

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

			md(this + ".onPressed: lopl = " + lop.length, debug);

			// if enough active pointers
			if (lot.length >= 2) {

				// always take the two first pointers
				// todo: move this to onStartedDragging? And deal with 3 pointers?
				touch0 = lot[0];

				for (var key in touch0) {

					if (touch0.hasOwnProperty(key)) {

						md(this + ".onPressed:touch0 = " + key, debug);

					}

				}

				touch1 = lot[1];

				md(this + ".onPressed: calc vector()", debug);

				vector = this.getTouchVector(touch0, touch1);

				md(this + ".onPressed: calc transform()", debug);

				transform = this.getTransform();

				this.touchDist = vector.length / transform.scale;

				md(this + ".onPressed: touchDist = " + this.touchDist, debug);

				if (this.rotateable) {

					this.touchRot = transform.rotation + vector.rotation;

				}

			}

			md(this + ".onStartedDragging-2", debug);

		},

		onReleased: function (gesture) {

			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			_.each(gesture.listOfPointers, function (ptr) {

				md(this + ".onReleased, removing:" + ptr, debug);

				this.unsetTouchPos(ptr);

			}, this);

		},

		onStoppedDragging: function (gesture) {

			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			var lop = gesture.listOfPointers;

			var i;

			var lopl = lop.length;

			var $target = this.$target;

			md(this + ".onStoppedDragging-1", debug);

			for (i = 0; i < lopl; i++) {

				this.unsetTouchPos(lop[i]);

			}

			// whatever, it's a marker
			$target.data("rotoZoomer-matrix", this.matrix.join(","));

			$target.data("rotoZoomer-rotateable", this.rotateable);

			$target.data("rotoZoomer-zoomable", this.zoomable);

			// if the transformation must be applied automatically to the target
			$target.data("rotoZoomer-autoapply", this.autoApply);

			md(this + ".onStoppedDragging-2, data read(m: [" + $target.data("rotoZoomer-matrix") + "], rotateable: " + $target.data("rotoZoomer-rotateable") + ", zoomable: " + $target.data("rotoZoomer-zoomable") + ", autoApply: " + $target.data("rotoZoomer-autoapply") + ")", debug);
		},

		setTouchPos: function (pointer) {

			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			md(this + ".setTouchPos-1", debug);

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

			md(this + ".setTouchPos-4", debug);

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
			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			var matrix = "matrix(" + this.matrix.join(",") + ")";

			if (this.autoApply) {

				md(this + ".autoApply", debug);

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
			var debug = true && RotoZoomer.debug && TipTap.settings.debug;

			this.matrix[0] = Math.cos(rotation) * scale;

			this.matrix[2] = Math.sin(rotation) * scale;

			this.matrix[1] = -Math.sin(rotation) * scale;

			this.matrix[3] = Math.cos(rotation) * scale;

			this.matrix[4] = translateX;

			this.matrix[5] = translateY;

			md(this + ".setMatrix([" + this.matrix.join(',') + "])", debug);

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

	RotoZoomer.debug = false;

	// namespaces the thing
	TipTap.RotoZoomer = RotoZoomer;

}(window.TipTap, _));

/*
* The Router takes in charge all the interactions attached to one DOM element.
 */

(function (TipTap, _, $) {

	var Router = function (el$) {

		// el$ is DOM or jQuery element
		this._setElement$(el$);

		this.listOfCallbacks = {};
		this.listOfFilters = [];
		this.listOfActions = [];    // list of all Actions for this Router

		this.hasGlobalCallbacks = false;  // special case when callback is set with no filter.

	};


	Router.prototype = {

		addActionListeners: function (action) {
			// todo: do we need second "this" binding?? (the one from add()). Same question for other signals
			action.pressed.add(_.bind(this.callComboCallback, this, action), this);
			action.sendCombo.add(_.bind(this.callComboCallback, this, action), this);
			action.dragStarted.add(_.bind(this.callComboCallback, this, action), this);
			action.dragged.add(_.bind(this.callComboCallback, this, action), this);
			action.dragStopped.add(_.bind(this.callComboCallback, this, action), this);
			action.released.add(_.bind(this.callComboCallback, this, action), this);
			action.finished.add(_.bind(this.deallocateAction, this, action), this);
		},

		allocateAction: function (pointer) {
			var debug = true && Router.debug && TipTap.settings.debug;

			var action;

			// can be DOM element or jQuery!
			var target$ = pointer.getTarget$();

			md(this + ".allocateAction-1", debug);

			// look for an existing Action on the same target
			action = this._findActionByTarget(target$);

			// if no matching Action found, we create a new one
			if (!action) {

				md(this + ".allocateAction-couldn't find Action by target", debug);

				action = new TipTap.Action(target$);

				md(this + ".allocateAction-new Action created", debug);

				this.listOfActions.push(action);

				this.addActionListeners(action);

			}

			action.addPointerListeners(pointer);

			md(this + ".allocateAction-end(" + action + ")", debug);

		},

		_areTheseTheSameNode$: null,

		_areTheseTheSameNode: function (node1, node2) {

			return node1.isSameNode(node2);

		},

		_areTheseTheSame$Node: function ($node1, $node2) {

			return $node1.is($node2);

		},

		bindCombos: function (combosList, filter, callback, context) {
			var comboRegexp;

			// beware, filter can be empty string from the app call, so it's necessary to test this anyway
			if (!filter) {

				this.hasGlobalCallbacks = true; // makes event callback test faster

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

			var debug = true && Router.debug && TipTap.settings.debug;

			md("<b>" + this + ".callComboCallback(" + action + ", " + combo + ", " + action.gesture + ")</b>", debug);

			// HACK: can be a DOM element or jQuery, depending if we use jQuery or not
			var target$ = action.getTarget$();

			// if target$ is the global container, and some actions are global, set to true
			var globalAction = this._isElementTheTarget$(target$) && this.hasGlobalCallbacks;

			// finds all the callbacks based on combo matching
			_.each(this.listOfCallbacks, function (listOfCallbacksForThisCombo) {

				if (listOfCallbacksForThisCombo.regex.test(combo)) {

					// for each matched combo, find the first filter matching the element (=> declare more restrictive filters first)
					var comboObject = _.find(listOfCallbacksForThisCombo.callbacks, function (element) {

						// if we are on an element catching some events, or if some global actions defined
						return this._matchesFilter$(target$, element.filter);

					}, this);

					// if couldn't find a sub-element specific callback, but global effect is defined, look for global callback
					if (!comboObject && globalAction) {

						// variable just for speed, to avoid two lookups each time
						var class_filler = TipTap.GLOBAL_CLASS_FILTER;

						comboObject = _.find(listOfCallbacksForThisCombo.callbacks, function (element) {

							// if we are on an element catching some events, or if some global actions defined
							return (element.filter === class_filler);

						});
					}

					if (comboObject) {

						// uses given context
						comboObject.callback.call(comboObject.context, action);

					}

				}

			}, this);

		},

		deallocateAction: function (action) {

			var debug = true && Router.debug && TipTap.settings.debug;

			md(this + ".deAllocateAction(" + action + ")", debug)

			this.listOfActions.splice(this.listOfActions.indexOf(action), 1);

		},

		_isElementTheTarget$: null,

		_isElementTheTarget: function (target) {

			return target.isSameNode(this.el);

		},

		_isElementThe$Target: function ($target) {

			return $target.is(this.$el);

		},

		_findActionByTarget: function (target$) {

			// todo: allow several simultaneous Actions on a same target, differentiate by distance of the pointers
			return _.find(this.listOfActions, function (action) {

				return this._areTheseTheSameNode$(action.getTarget$(), target$);

			}, this);

		},

		findMatchingFilterForEvent: function (target$) {


			// check if target is really allowed to capture events (matching filter BEFORE global callbacks)
			var filter = _.find(this.listOfFilters, function (fltr) {

				return this._matchesFilter$(target$, fltr);

			}, this);

			// if filter was not matched, but the whole target is capturing, sends back the "-" filter
			if (!filter && this.hasGlobalCallbacks) {

				return TipTap.GLOBAL_CLASS_FILTER;

			}

			// either the matched filter, or "undefined" if filter not found and no global capture
			return filter;

		},

		getElement$: null,

		getElement: function () {

			return this.el;

		},

		get$Element: function () {

			return this.$el;

		},

		isOnNode$: null,

		isOnNode: function(node) {

			return this.getElement().isSameNode(node);

		},

		isOn$Node: function($node) {

			return this.get$Element().is($node);

		},

		_matchesFilter$: null,

		_matchesFilter: function (node, className) {

			return (' ' + node.className + ' ').indexOf(' ' + className + ' ') >= 0;

		},

		_matches$Filter: function ($node, filter) {

			return $node.is(filter);

		},

		_setElement$: null,

		_setElement: function (el) {

			this.el = el;

		},

		_set$Element: function ($el) {

			this.$el = $el;

		},

		toString: function () {
			return "R";
		},

	};

	// Utilitarians functions for either format
	Router.comboToRegExp = function (fullCombo) {

		var debug = true && Router.debug && TipTap.settings.debug;

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

	Router.transformComboIntoRegex = function (combo) {
		var comboLength = combo.length - 1;

		// analyze the combo from the end, because it's the way we must construct the regexp
		var index = 0;

		// the $ is added at the end of the inner most matching pattern!!
		return "^" + Router.recursiveTransformCombo(combo, comboLength, index);

	};

	Router.use$ = function (use$) {

		// replaces a method. I know, I "should" use decorators, but it's a bit heavy for this.
		if (use$) {

			this.prototype._areTheseTheSameNode$ = this.prototype._areTheseTheSame$Node;
			this.prototype.getElement$ = this.prototype.get$Element;
			this.prototype._isElementTheTarget$ = this.prototype._isElementThe$Target;
			this.prototype.isOnNode$ = this.prototype.isOn$Node;
			this.prototype._matchesFilter$ = this.prototype._matches$Filter;
			this.prototype._setElement$ = this.prototype._set$Element;

		} else {

			this.prototype._areTheseTheSameNode$ = this.prototype._areTheseTheSameNode;
			this.prototype.getElement$ = this.prototype.getElement;
			this.prototype._isElementTheTarget$ = this.prototype._isElementTheTarget;
			this.prototype.isOnNode$ = this.prototype.isOnNode;
			this.prototype._matchesFilter$ = this.prototype._matchesFilter;
			this.prototype._setElement$ = this.prototype._setElement;

		}
	};

	Router.debug = true;

	// namespaces the thing
	TipTap.Router = Router;

}(window.TipTap, _, window.jQuery));

(function (TipTap) {

	// namespacing
	Touch = {
		START_EVENT_NAME:  'touchstart',
		DRAG_EVENT_NAME:   'touchmove',
		END_EVENT_NAME:    'touchend',
		CANCEL_EVENT_NAME: 'touchcancel',

		buildEventList: function (event) {

			var touchesList = this._getTouches$(event);

			var tipTapEventsList = [];

			for (var i = 0, l = touchesList.length; i < l; i++) {

				var touch = touchesList[i];

				tipTapEventsList.push(new TipTap.TouchEvent(touch, event));

			}

			return tipTapEventsList;

		},

		_getTouches$: null,

		_getTouches: function (e) {

			return e.changedTouches;

		},

		_get$Touches: function (e) {

			return e.originalEvent.changedTouches;

		},

		onStart: function (tipTapEvent) {
		},

		onDrag: function (tipTapEvent) {
		},

		onEnd: function (tipTapEvent) {
		},

		onCancel: function (tipTapEvent) {
		},

		use$: function (use$) {

			if (use$) {

				this._getTouches$ = this._get$Touches;

			} else {

				this._getTouches$ = this._getTouches;

			}

			TipTap.TouchEvent.use$(use$);

		},

		shouldCaptureDrag: function (e) {

			return true;

		}

	};

	TipTap.Touch = Touch;

}(window.TipTap));
