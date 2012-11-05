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
