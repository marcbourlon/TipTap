/**
 * Created with IntelliJ IDEA.
 * User: marcbourlon
 * Date: 19/10/12
 * Time: 16:42
 * To change this template use File | Settings | File Templates.
 */
module("Pointer Infos");
test("PointerInfos has $/no $ methods set", function () {
	TipTap.PointerInfos.use$(false);
	ok(typeof TipTap.PointerInfos.prototype._setTarget$ === "function", "_setTarget$ is a function");
	ok(typeof TipTap.PointerInfos.prototype.getTarget$ === "function", "getTarget$ is a function");
});

test("new PointerInfos", function () {
	var fakeFinger = {
		identifier:   1,
		target:       null,
		$target:      null,
		getTarget$:   function () {
			return "whatever";
		},
		getPosition:  function () {
			return {
				pageX: 10, pageY: 12
			}
		},
		status:       2,
		getDirection: function () {
			return 3;
		}

	};

	var pi = new TipTap.PointerInfos(fakeFinger, 3);
	ok(pi.identifier, "Pointer Infos has a defined identifier");
	ok(pi.identifier > 0, "Pointer Infos has an identifier whose value is > 0");
});
