(function (TipTap, _, $) {

	var Router = function (el$, device) {

		this.debugMe = true;

		this.device = device;

		// el$ is DOM or jQuery element
		this._setElement$(el$);

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

			// can be DOM element or jQuery!
			var target$ = finger.getTarget$();

			md(this + ".allocateAction-1", debugMe);

			// look for an existing Action on the same target
			action = this._findActionByTarget(target$);

			// if no matching Action found, we create a new one
			if (!action) {

				md(this + ".allocateAction-couldn't find Action by target", debugMe);

				action = new TipTap.Action(target$);

				md(this + ".allocateAction-new Action created", debugMe);

				this.listOfActions.push(action);

				this.addActionListeners(action);

			}

			action.addFingerListeners(finger);

			md(this + ".allocateAction-end(" + action + ")", debugMe);

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

			// HACK: can be a DOM element or jQuery, depending if we use jQuery or not
			var target$ = action.getTarget$();

			// if target$ is the global container, and some actions are global, set to true
			var globalAction = this._isElementTheTarget$(target$) && this.nofilter;

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

			var debugMe = true && this.debugMe && TipTap.settings.debug;

			md(this + ".deAllocateAction(" + action + ")", debugMe)

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
			if (!filter && this.nofilter) {

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
			this.prototype._matchesFilter$ = this.prototype._matches$Filter;
			this.prototype._setElement$ = this.prototype._set$Element;

		} else {

			this.prototype._areTheseTheSameNode$ = this.prototype._areTheseTheSameNode;
			this.prototype.getElement$ = this.prototype.getElement;
			this.prototype._isElementTheTarget$ = this.prototype._isElementTheTarget;
			this.prototype._matchesFilter$ = this.prototype._matchesFilter;
			this.prototype._setElement$ = this.prototype._setElement;

		}
	};

	// namespaces the thing
	TipTap.Router = Router;

}(window.TipTap, _, window.jQuery));
