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
