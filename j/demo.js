var positionsList = [];
var imgFiles = [
	"Pagani-Zonda-R-3.jpg",
	"90923269786ec28b4432529457258d95.jpg",
	"012611_pagani_huayra_1.jpg",
	"citroen-gt-supercar_j2gtu_5965_uIGQC_5965.jpg",
	"e-wolf-supercar.jpg",
	"Shelby-Super-Cars-Ultimate-Aero-II-rear-view.jpg",
	"saleens7tt05.jpg",
	"vector-supercar-might-make-a-comeback.jpg",
	"2011-shelby-supercars-ultimate-aero-ii.jpg",
	"supercars.jpg",
	"Marussia_05.jpg",
	"Marussia_04.jpg",
	"Marussia_Russian_Supercar.jpg",
	"Supercars-Limited-Hulme-F1-Champion-SA-Top-1024x768.jpg",
	"shelby-supercars-ultimate-aero-tt-12.jpg",
	"veh_upcoming_furai_2.jpg",
	"koenigccx06_081600.jpg",
	"porsche-ruf-electric_msp11.jpg",
	"tesla-roadster_msp1.jpg",
	"fisker_karma_msp2.jpg",
	"shelby-aero_msp_1.jpg",
	"lightning_front_tall.jpg",
	"ronn-motors-hydrogen-hybrid_msp.jpg",
	"e13a06241c5071db29f29833874127cc.jpg",
	"audi r10 2.jpg",
	"audi r10.jpg"
];

$(function () {

	md("normal version", true, "#F00");

	TipTap.init(
		{
			rotoZoom:                     false,
			use$:                         false,
			useTipPrefixes:               false,
			useBorisSmusPointersPolyfill: false,
		}
	);
	var boxCount = 0;
	var zIndex = 1;

	$('#debug').bind('change', function () {
		TipTap.settings.debug = this.checked;
	});

	var box1 = document.getElementById('box1');

	TipTap.on(
		box1,
		[
			{
				combo:    'tap',
				callback: function (action) {
					var debugMe = true && TipTap.settings.debug;
					var $e;
					var $b = $('#box1');
					var pointer = action.getPointer(0);

					if (boxCount < imgFiles.length) {
						$e = $('<img class="test" id="' + boxCount + '" src="i/' + imgFiles[boxCount++] + '"/>');
					} else {
						$e = $('<div class="test"></div>');
						$e.css('backgroundColor', '#' + (Math.round(Math.random() * (256 * 256 * 256 - 1))).toString(16));
					}
					$e.css('zIndex', zIndex++);
					$b.append($e);
					$e.css('left', (pointer.pageX - $e.width() / 2) + 'px')
						.css('top', (pointer.pageY - $e.height() / 2) + 'px');

					md("app tap: (" + pointer + "-(" + $e.css("width") + " * " + $e.css("height") + ")", debugMe);

				}
			},
			{
				combo:    "tap3",
				catching: TipTap.CAPTURE_CAPTURE,
				callback: function (action) {
					var debugMe = true && TipTap.settings.debug;

					md("app tap3 caught on the main div!", debugMe, "#F00");
				}
			},
			{
				combo:    "tap2>tap2",
				filter:   "test",
				callback: function (action) {
					var debugMe = true && TipTap.settings.debug;
					var target = action.getTarget();
					var id = parseInt(target.id, 10);

					md("app change background(" + id + ")", debugMe);

					if (id < imgFiles.length) {
						target.src = 'i/' + imgFiles[Math.round(Math.random() * imgFiles.length)];
					} else {
						target.style.backgroundColor = '#' + (Math.round(Math.random() * (256 * 256 * 256 - 1))).toString(16);
					}
				}
			},
			{
				combo:    "swipe_r",
				filter:   "test",
				callback: function (action) {
					var debugMe = true && TipTap.settings.debug;
					var target = action.getTarget();

					md("app swipe_r", debugMe);

					target.parentNode.removeChild(target);

				}
			},
			{
				combo:    "tap>tap",
				filter:   "test",
				callback: function (action) {
					var target = action.getTarget();
					var style = window.getComputedStyle(target);

					target.style.width = (parseInt(style.getPropertyValue("width"), 10) * 1.1) + "px";
					target.style.height = (parseInt(style.getPropertyValue("height"), 10) * 1.1) + "px";
				}
			},
			{
				combo:    "tap>tap>tap",
				filter:   "test",
				callback: function (action) {
					var target = action.getTarget();
					var style = window.getComputedStyle(target);

					target.style.width = (parseInt(style.getPropertyValue("width"), 10) / 1.1) + "px";
					target.style.height = (parseInt(style.getPropertyValue("height"), 10) / 1.1) + "px";
				}
			},
			{
				combo:    "tip+|dragStart+",
				filter:   "test",
				callback: function (action) {
					var target = action.getTarget();

					// if classname does not contain "dragging", add it and change z index
					if ((' ' + target.className + ' ').indexOf(' dragging ') < 0) {

						target.style.zIndex = zIndex++;

						target.className += ' dragging';

					}

				}
			},
			{
				combo:    "untip+|dragStop+",
				filter:   "test",
				callback: function (action) {
					var target = action.getTarget();

					// if no more position, remove special class
					target.className = action.getTarget().className.replace(' dragging', '');

				}
			},
			{
				combo:    "tip+|press+",
				filter:   "test",
				callback: function (action) {
					var $target;
					var isMasterPointer;
					var debugMe = true && TipTap.settings.debug;

					_.each(action.listOfPointers, function (pointer) {
						$target = $(pointer.target);

						md("app tip-1: " + $target.attr('id') + ", " + pointer, debugMe);

						// the master pointer is the one allowed to drag the element
						isMasterPointer = !_.any(positionsList, function (position) {

							return position.$target.is($target);

						});

						positionsList.push(
							{
								$target:    $target,
								isMaster:   isMasterPointer,
								identifier: pointer.identifier,
								dx:         pointer.pageX - parseInt($target.css('left'), 10),
								dy:         pointer.pageY - parseInt($target.css('top'), 10)
							}
						);
					});
				}
			},
			{
				combo:    "drag",
				filter:   "test",
				callback: function (action) {
					dragResize(action.gesture, 1);
				}
			},
			{
				combo:    "untip+|release+",
				filter:   "test",
				callback: function (action) {
					var debugMe = true && TipTap.settings.debug;
					var dl = positionsList.length;
					var position;

					md("app untip", debugMe);
					_.each(action.gesture.listOfPointers, function (pointer) {
						md('app untip: ' + pointer + '.s: ' + pointer.status, debugMe);

						// why check this status? If it's untip, sooner or later, it'll need to get flushed from here. And
						// there's no other call, so how to remove if not now??
						positionsList = _.reject(positionsList, function (position) {

							md("app untip: position=" + position.identifier, debugMe);

							return position.identifier === pointer.identifier;

						});

						// once Master position removed, check if another one is still here
						position = _.find(positionsList, function (pos) {

							return pos.$target.is($(pointer.target));

						});

						if (position) {

							// arbitrarily makes the next Pointer the new Master
							position.isMaster = true;

						}

					});

					md('<span style="' +
						   (((dl === positionsList.length) && (positionsList.length > 0)) ? 'color: red; font-weight: bold;' : '') +
						   '"> app untip: pll=' + positionsList.length + '</span>', debugMe);

					if ((dl === positionsList.length) && (positionsList.length > 0)) {

						md('<b style="color: red; font-weight: bold;">******</b>', debugMe);

						md('<b style="color: red; font-weight: bold;">******</b>', debugMe);

						md('<b style="color: red; font-weight: bold;">******</b>', debugMe);

					}

				}
			},
		]
	);
});

function dragResize(gesture, factor) {
	var position;
	var x;
	var y;
	var pointersList = gesture.listOfPointers;
	var debugMe = false && TipTap.settings.debug;

	md("app drag-1", debugMe);

	var pointer = pointersList[0];

	var $target = $(pointer.getTarget());

	// find the position to apply
	position = _.find(positionsList, function (pos) {

		return ((pos.isMaster) && (pos.$target.is($target)));

	});

	// happens in case of, for example, a tap-tip...
	if (!position) {
		return;
	}

	md("app drag-2: $target=" + $target.attr('id') + ", #" + position.identifier + " is master", debugMe);

	pointer = _.find(pointersList, function (ptr) {

		return (position.identifier === ptr.identifier);

	});

	md("app drag-4", debugMe);

	// only the Master position is allowed to move the shape
	if (!pointer) {
		return;
	}

	md("app drag-5, $target = " + $target.attr('id'), debugMe);

	x = pointer.pageX - position.dx;
	y = pointer.pageY - position.dy;

	$target.css('left', x + 'px').css('top', y + 'px');

	$target.width($target.width() * factor);
	$target.height($target.height() * factor);
}
