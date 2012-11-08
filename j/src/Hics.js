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
