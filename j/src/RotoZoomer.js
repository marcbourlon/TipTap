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
