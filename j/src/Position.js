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
