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
