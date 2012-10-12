(function (TipTap, _) {

	var PointerInfos = function (finger, status) {

		this.identifier = finger.identifier;

		this.target = null;
		this.$target = null;
		this._setTarget(finger.getTarget());

		this.pageX = finger.getPosition().pageX;

		this.pageY = finger.getPosition().pageY;

		this.status = status;

		this.direction = finger.getDirection();

	};

	PointerInfos.prototype = {

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget: function (target) {

			this.target = target;

		},

		_set$Target: function ($target) {

			this.$target = $target;

		},

		toString: function () {

			return "Ptr#" + this.identifier;

		}

	};

	PointerInfos.use$ = function () {

		this.prototype._setTarget = this.prototype._set$Target;

		this.prototype.getTarget = this.prototype.get$Target;

	};

	// namespaces the thing
	TipTap.PointerInfos = PointerInfos;

}(window.TipTap, _));
