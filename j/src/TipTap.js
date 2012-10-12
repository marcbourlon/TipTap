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
		CANCEL_BUBBLING:     true,
		DEVICE_DEFAULT:      0, // if nothing specified, will bind device events (mouse OR touch)
		DEVICE_MOUSE:        1, // allows to force usage of mouse device input
		DEVICE_TOUCH:        2, // allows to force usage of touch device input
		GLOBAL_CLASS_FILTER: "-", // char used internally for global container class
		KEEP_BUBBLING:       false,
		listOfFingers:       [],
		listOfRouters:       [], // list of all Routers objects
		// Stolen the touch test from Modernizr. Including 49KB for just this was a bit overkill, to me
		touch:               ('ontouchstart' in window) || (window.DocumentTouch && document instanceof DocumentTouch),
		TOUCH_REFRESH_ms:    1000 / 60, // iOS touch devices frequency is 60Hz

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

		buildNamespacedEventName: function (eventBasename) {

			return  eventBasename + '.TipTap';

		},

		init: function (options) {

			this.settings = _.extend(this.settings, options);

			if (this.settings.useBorisSmusPointersPolyfill) {

				this.device = this.Pointer;

			} else {

				if ((this.settings.deviceType === this.DEVICE_TOUCH) || this.touch) {

					this.device = this.Touch;

				} else {

					this.device = this.Mouse;

				}

			}

			// if user asks to use jQuery but this is not present, deny it
			this.settings.use$ = this.settings.use$ && !!$;

			if (this.settings.use$) {

				// instead of doing "if (jQuery)" everywhere, just set methods. I luv' it :)
				this._propagateUse$();

			}

			// set drag, end and cancel callbacks
			this._setCallbacks();

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

			// make single value a list to unify treatment later. isArray test in case it's not present.
			if (Object.prototype.toString.call(nodesList) !== "[object Array]") {

				nodesList = [nodesList];

			}

			for (var nodeIdx = 0, nodesCount = nodesList.length; nodeIdx < nodesCount; nodeIdx++) {

				var curNode = nodesList[nodeIdx];

				var router = null;

				for (var routerIdx = 0, routersCount = this.listOfRouters.length; routerIdx < routersCount; routerIdx++) {

					var rt = this.listOfRouters[routerIdx];

					// if attaching to same element than a previous one, then use same Router
					if (rt.isSameNode(curNode)) {

						router = rt;

						continue;

					}

				}

				// No router found, create new and keep in list
				if (!router) {

					router = new this.Router(curNode, this.device);

					this.listOfRouters.push(router);

					// no support for old IEs
					curNode.addEventListener(this.device.START_EVENT_NAME, _.bind(this.onStart, this, router));

				}

				for (var combosIdx = 0, combosCount = combosFiltersCallbacksList.length; combosIdx < combosCount; combosIdx++) {

					var comboFilterCallback = combosFiltersCallbacksList[combosIdx];
					var combo = comboFilterCallback.combo;
					var filter = comboFilterCallback.combo || "";
					var callback = comboFilterCallback.callback;

					// attach combo and related callbacks to the Router
					router.bindCombos(combo, filter, callback, context);

				}

			}

			// return TipTap for chaining
			return this;

		},

		jQueryOn: function (nodesList, combosList, filter, callback, context) {

			// if "filter" is a function, then we have no filter defined, and the filter var is the callback
			if (typeof filter === "function") {

				context = callback;

				callback = filter;

				filter = "";

			}

			// could use "TipTap", but cleaner.
			var tipTap = this;

			// todo jQuery; how to attach when no jQuery?
			return nodesList.each(function () {

				// the jQuery wrapped DOM element we're working on
				var $this = $(this);

				var router = null;

				for (var routerIdx = 0, routersCount = tipTap.listOfRouters.length; routerIdx < routersCount; routerIdx++) {

					var rt = tipTap.listOfRouters[routerIdx];

					// if attaching to same element than a previous one, then use same Router
					if (rt.$el.is($this)) {

						router = rt;

						continue;

					}

				}

				// No router found, create new and keep in list
				if (!router) {

					router = new tipTap.Router($this, tipTap.device);  // otherwise, create new

					tipTap.listOfRouters.push(router);

					$this
						.bind(
						tipTap.buildNamespacedEventName(tipTap.device.START_EVENT_NAME),
						_.bind(tipTap.onStart, // calls onStart from TipTap
						       tipTap, // positioning "this" to TipTap
						       router)
					);       // and sending router as 1st param

				}

				// attach combo and related callbacks to the Router
				router.bindCombos(combosList, filter, callback, context);

				return $this;

			});

		},

		onStart: function (router, event) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var t = Date.now();

			md(this + ".onStart-1: " + t + "<hr/>", debugMe);

			// Pass "keep bubbling", that the _.reduce will transform into "cancel bubbling" if a matching event is found
			if (TipTap.CANCEL_BUBBLING === _.reduce(this.device.buildEventList(event),
			                                      _.bind(this.onStartDo, this, router),
			                                      TipTap.KEEP_BUBBLING,
			                                      this)) {

				this.stopEvent(event);

			}

			md(this + ".onStart-2: " + (Date.now() - t) + " ms", debugMe);

		},

		onStartDo: function (router, bubblingStatus, eventTouch) {
			var debugMe = true && this.debugMe && TipTap.settings.debug;
			var finger;
			var filter;

			md(this + ".onStartDo-1", debugMe);

			// check if the event target element is matching at least one defined filter
			filter = router.findMatchingFilterForEvent(eventTouch.getTarget());

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
			var debugMe = true && this.debugMe && this.settings.debug;

			var cancelBubbling = TipTap.KEEP_BUBBLING;

			var t = Date.now();

			// todo: onMove which also tracks mouse move (not drag). for this, check if an Action exists, and if not, create one
			if (!this.device.shouldCaptureDrag()) {

				return;

			}

			// in case the device has something to do with the ET
			this.device.onDrag(e);

			// buildEtList unifies mouse and touch events/touchs in a list
			_.each(this.device.buildEventList(e), function (eventTouch) {

				// we store the touch identifier in the Finger, so we can match new incoming events. Obvious.
				var finger = this.findFingerByIdentifier(eventTouch.identifier);

				// not found (can't happen...)
				if (!finger) {

					return;

				}

				md(this + ".onDrag: " + t + ",l=" + this.device.buildEventList(e).length + "<hr/>", debugMe);

				cancelBubbling = TipTap.CANCEL_BUBBLING;

				finger.onDrag(eventTouch);

			}, this);

			if (cancelBubbling) {

				this.stopEvent(e);

			}
		},

		onEnd: function (e) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			// odd (?) usage of _.reduce(): calls finger.end() on all fingers concerned
			if (_.reduce(this.device.buildEventList(e), _.bind(this.onEndDo, this), TipTap.KEEP_BUBBLING, this)) {

				md(this + ".onEnd", debugMe);

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

		_setCallbacks: function () {

			// only one global listener for move/end/cancel. Because fast mouse movement can move cursor out of element, and
			// because end can be fired on another element, dynamically created during drag (same as in drag'n'drop, etc.)
			document.addEventListener(this.device.DRAG_EVENT_NAME, _.bind(this.onDrag, this));
			document.addEventListener(this.device.END_EVENT_NAME, _.bind(this.onEnd, this));
			document.addEventListener(this.device.CANCEL_EVENT_NAME, _.bind(this.onCancel, this));

		},

		_setCallbacks$: function () {

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

		unlinkFinger: function (finger) {

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			var l = this.listOfFingers.length;

			this.listOfFingers.splice(this.listOfFingers.indexOf(finger), 1);

			md(this + ".unlinkFinger: " + l + " -> " + this.listOfFingers.length, debugMe);

		},

		_propagateUse$: function () {

			this._setCallbacks = this._setCallbacks$;

			this.device.use$();
			this.Action.use$();
			this.PointerInfos.use$();
			this.Router.use$();

		},

	};

	TipTap.settings = {

		comboAlternateOperator: "|", // char to define alternate combos: press/tip

		comboEndTimer_ms: 100, // delay accepted before next tap or swipe to keep it in the gesture (like in dblclick)

		comboGesturesSep: ">", // char to separate combos: tap2>tap2

		comboParallelActionOperator: "-", // char to show simultaneous actions: tip2-tap2

		debug: true,

		deviceType: TipTap.DEVICE_MOUSE, // which kind of device do we use

		moveThreshold_px: TipTap.touch ? 8 : 0, // min distance to consider that the move was intentional

		rotoZoom: false, // whether to activate the hack of CSS3 rotation/zoom

		simultaneousMovesTimer_ms: 3 * TipTap.TOUCH_REFRESH_ms, // delay accepted between similar events/moves to be considered  as simultaneous

		swipeDuration_ms: 8 * TipTap.TOUCH_REFRESH_ms, // max move duration to still be a swipe

		swipeMaxDistance_px: 160, // max distance to still be considered as swipe

		swipeMinDisplacement_px: 16, // minimal distance of first move to consider as swipe

		tapMaxDuration_ms: 150, // if down without move for longer than this, it's a tip. Otherwise, move or tap

		useBorisSmusPointersPolyfill: false, // use Boris Smus pointers polyfill

		use$: false, // whether to use jQuery or not

		useTipPrefixes: false, // include or not the "tip" prefixes in complex gestures: "tip-tap" or just "tap"

	};

	// there's more elegants way to do so, but I'll do when I'm a grown up js developer :-P
	window.TipTap = TipTap;

	// jQuery "pluginification"
	var methods = {

		activate: function () {

			return TipTap.activate(this);

		},

		on: function (combosList, filter, callback, context) {

			return TipTap.jQueryOn(this, combosList, filter, callback, context);

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
