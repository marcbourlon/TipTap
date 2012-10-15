(function (TipTap, _) {

	var PointerInfos = function (finger, status) {

		this.identifier = finger.identifier;

		this.target = null;
		this.$target = null;
		this._setTarget$(finger.getTarget$());

		this.pageX = finger.getPosition().pageX;

		this.pageY = finger.getPosition().pageY;

		this.status = status;

		this.direction = finger.getDirection();

	};

	PointerInfos.prototype = {

		getTarget$: null,

		getTarget: function () {

			return this.target;

		},

		get$Target: function () {

			return this.$target;

		},

		_setTarget$: null,

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

	PointerInfos.use$ = function (use$) {

		if (use$) {

			this.prototype._setTarget$ = this.prototype._set$Target;
			this.prototype.getTarget$ = this.prototype.get$Target;

		} else {

			this.prototype._setTarget$ = this.prototype._setTarget;
			this.prototype.getTarget$ = this.prototype.getTarget;

		}

	};

	// namespaces the thing
	TipTap.PointerInfos = PointerInfos;

}(window.TipTap, _));
