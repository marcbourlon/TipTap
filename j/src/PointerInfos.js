(function (TipTap, _) {

	var PointerInfos = function (ptr, status) {

		this.identifier = ptr.identifier;

		// do not set target from eventTouch, because it can be (mouse) other than initial Finger target
		this.$target = ptr.$target;

		this.pageX = ptr.getPosition().pageX;

		this.pageY = ptr.getPosition().pageY;

		this.status = status;

		this.direction = ptr.getDirection();

	};

	PointerInfos.prototype = {

		toString: function () {

			return "Ptr#" + this.identifier;

		}

	};

	// namespaces the thing
	TipTap.PointerInfos = PointerInfos;

}(window.TipTap, _));
