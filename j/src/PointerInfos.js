(function (TipTap, _) {

	var PointerInfos = function (pointer, status) {

		this.identifier = pointer.identifier;

		this.target = null;
		this.$target = null;
		this._setTarget$(pointer.getTarget$());

		this.pageX = pointer.getPosition().pageX;

		this.pageY = pointer.getPosition().pageY;

		this.status = status;

		this.direction = pointer.getDirection();

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
