/**
 * Created with IntelliJ IDEA.
 * User: marcbourlon
 * Date: 05/11/12
 * Time: 16:20
 */
function setDebugs() {
	$('#debug-global').bind('change', function () {
		TipTap.settings.debug = this.checked;
	});

	$('#debug-action').bind('change', function () {
		TipTap.Action.debug = this.checked;
	});

	$('#debug-gesture').bind('change', function () {
		TipTap.Gesture.debug = this.checked;
	});

	$('#debug-mouse').bind('change', function () {
		TipTap.Mouse.debug = this.checked;
	});

	$('#debug-pointer').bind('change', function () {
		TipTap.Pointer.debug = this.checked;
	});

	$('#debug-rotozoomer').bind('change', function () {
		TipTap.RotoZoomer.debug = this.checked;
	});

	$('#debug-router').bind('change', function () {
		TipTap.Router.debug = this.checked;
	});

	$('#debug-tiptap').bind('change', function () {
		TipTap.debug = this.checked;
	});
}

