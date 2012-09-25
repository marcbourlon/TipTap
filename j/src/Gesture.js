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
