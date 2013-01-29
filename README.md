# Introduction

## What is the _TipTap_ library?

The _TipTap_ library is a javascript library to ease mouse and touch complex gestures definition and management on HTML
DOM elements (so, though not tested, on SVG and Canvas too), as well as to provide a unified way of managing different
input devices systems: mouse, touch systems and their specific data structure (iOS, Android, Windows...), Leap Motion
hopefully, etc. In fact, it's mostly a present & future based library, mostly aimed at multi-pointers interactivity,
instead of our old-fashioned and already outdated mouse. But it of course supports mouse!

This library was meant to fill a hole that I couldn't fill immediately with any other initiative around here,
see [this page](https://github.com/bebraw/jswiki/wiki/Touch) for a quite comprehensive list of touch libs around. See
it as a mix between [Hammer.js](http://eightmedia.github.com/hammer.js/), [Touchy](https://github.com/HotStudio/touchy),
[Dojox.gesture](http://dojotoolkit.org/reference-guide/1.7/dojox/gesture.html#dojox-gesture), and coming from the same
statement as done by Boris Smus about "broken" touch events in browsers, leading him to create his
[pointers](http://smus.com/mouse-touch-pointer/) library. You could see TipTap as a more complete version of "pointers",
except that Mr Smus codes much better than me :-D


# License

Let's give back to a community who gives me so much: [MIT License](http://www.opensource.org/licenses/mit-license.php)


# The TipTap library

## So, what is it meant to do?

Essentially, its goal is to:
* provide a unified, input-device agnostic events capturing system: dealing with Mouse, Touch, Augmented Gestures
(see [Jérôme Etienne's work](https://github.com/jeromeetienne/augmentedgesture.js)), Leap Motion, etc.
* compensate for human lack of accuracy, leading to almost-simultaneous actions of pointers, instead of simultaneous.
Think of double bi-tap for example, chances are that you will not tap both fingers twice exactly simultaneously.
Even if you do sometimes, you will not always. And now, try with tri-tap, or worse, double tri-swipe! This inaccuracy
was one of the main reason to create this lib, and by far the biggest technical issue to solve. To do this, when a
pointer event occurs, it will wait for a tiny amount of time to see if other similar events come. If it happens,
it will group the event together, a bit like what is done natively by iOS with its touch events and the touches\*
arrays. Let's call this HIC (Human Inaccuracy Compensation).
* despite the previous step, not miss any event! 
* differenciate simply between tap, tip (long tap), swipe, move, pinch, spread, rotate...
* give a rich but simple language to define complex gestures, in an Event-like syntax. Example:
	$('#element').jTiptap ('on', 'tap', <callback>);
	allowing gestures like: double two fingers tap, double finger tip plus simultaneous swipe, etc.
* allow attachment of such listeners to several elements in the same page
* allow attachment of several such listeners to a same element
* allow delegation, attaching to a parent element, with a filter to define which children it applies. As you would expect,
	it lets you attach the callback to a container in which elements will be added dynamically


## Dependencies

The library currently relies on:
- [Underscore](http://underscorejs.org) by Jeremy Ashkenas, or [Lodash](https://github.com/bestiejs/lodash) by John-David Dalton
- [Signals](http://millermedeiros.github.com/js-signals/) by Miller Medeiros

Dependency on [jQuery](http://jquery.com/) is now optional. It has been proven to work with 1.7.2+ versions,
and could probably work with older ones.

I would love to have no dependency at all, but...


## Current status

Currently, the library is usable, but is still missing few things, which could make it not suitable for immediate production use. However, it gives curious people (or people in the need for such a lib) the ability to start playing with it and give feedback (mommy I'm scared!). Known missing points:
* real (usable) handling of rotation and zoom
* cleaner/better coding, like using the Markus Gundersen's work-(strongly) inspired rotation-zoomer class as a plugin
* identify a gesture by the proximity of the pointers: it will prevent two almost simultaneous taps at both ends of the
surface to be considered as a same gesture, which is in general never the case. Will be even more important on large
interaction surface like Microsoft Surface tables
* give ability to the application using the lib to split a gesture into several ones
* making it more a module than a plugin (see Miller Medeiros' articles about this)
* unit tests: I need to take a deep dive into this, and didn't have the time (courage?) to do it yet
* making it both script-tag and AMD-compatible (I shamefully failed to do this)


# The elements

All gestures and combos are defined for a DOM element. I didn't use Events for this, but a simple callback system.
(Should it be reworked as Events? **Feedback welcome**) You can define gestures and combos for an element, or for its
descendants, by using a selector string (for now, because of the use of jQuery, this selector can be complex, but if I
remove this dependency, I think I would have to go to simpler things like class or id matching, wouldn't I?)


# The gestures

## Simple gestures supported

### Normal gestures

The basic gestures supported by the library are the ones you expect (don't deny, I know it!). I'll use the vocabulary of
a touch screen to define the movements to be done:
- _tap_: you touch briefly the sensitive surface, and remove your finger almost instantly. Like a mouse _click_.
- _tip_: you touch the sensitive surface, and stay on it. Like a mouse _down_.
- _swipe_: it's like a fast-moving tap. You move the pointer fast in one direction (top, right, bottom or left) and while
	moving fast, you tap the screen. Your pointer draws a "U" in the air, tangenting the screen at the bottom of the curve,
	gently (but quickly and briefly, after all, I said "tangenting") gliding on it. Of course, the library corrects any not
	perfect direction, and keeps the direction of the biggest movement
- _rotate_: current managing of rotation is not nice. I mean, I quickly hacked a modified version of Markus Gundersen
	touch demo, to allow for zoom and rotate. But it's not yet as efficient as was my previous implementation, and I have
	to merge both. Rotation can be done with two or three (or more, but well..) pointers down, and we'll see why it matters.
- _pinch_: aka _zoom_, it's, well allowing you to do what you expect. Same comment as for rotate: count of pointers may
	differ, and this can be used efficiently.
- _drag_: it's simply moving a pointer while _tipping_
- _move_: **not yet implemented**, but should probably be in the future. It's moving without tipping. Impossible on a
	touchscreen, but for a mouse, and for other devices, it is.


### Notification gestures

In addition to these "real" gestures, exist few "notification" gestures. Complete understanding of such gestures comes
with the explanation of combos. The notification gestures are the following:
- _press_: fired when a pointer touches the screen (_touchstart_ event), a mouse is pressed, etc.
- _started_dragging_: fired when a pointer starts moving, a mouse with button pressed starts moving, etc.
- _stopped_dragging_: fired when a pointer IS RELEASED FROM THE SCREEN after some dragging, a mouse with button is
released after it was dragged, etc. Whether I should implement a timer to detect the end of the motion is not decided
yet (sounds cool and logical, but maybe difficult, so, as usual, **feedback welcome**)
- _release_: as expected, fired when pointers are removed from the screen (mouse released, etc.)

See below for explanation of the [difference between normal simple gestures and notification gestures](#1).


## Combining simple gestures on multi-pointers devices

If it was only for simple gestures, this lib wouldn't be very useful, since lots of others do this quite well (Hammer.js,
Touchy, etc.) It's main interest lies in the ability to create complex gestures (and [_combos_](#2)). A complex gesture
is defined by several simple gestures happening simultaneously:
Few examples:
- bi-tap
- tri-tap
- tip **and** swipe: one pointer is tipping, while the other is swiping
- bi-tip
- etc.


<a name="2" />
## Combining gestures in combos

Combos (as in Street Fighter-like games) are lists of gestures (simple or complex), happening with a short period
of time between each. A combo is ended by any lack of activity during a period of time longer than this accepted
duration for a combo, or by any number of _tips_. Examples of combos:
- double _tap_ then _tip_
- triple _tap_
- double bi-tap: by "bi-tap", I mean tapping two pointers at once
- double _tip_ followed by _swipe_: can be a trigger of an action in an application, or a special attack combo in a game
- combinations are almost endless (in fact, no, some decisions had to be taken due to technical constraints, and
	the uselessness of the related possibilities), mostly limited by the convenience of the combo (let's say that "triple
	quad-tap followed by bi-tap simultaneously with triple-swipe" wouldn't exactly be a very usable combo :-D)


<a name="1" />
## Difference between simple gestures and notification gestures

Gestures that can be part of combos are not sent immediately to the app. Indeed, the goal being to be a "black-box"
for the app using the library, the idea is to not bother the app till we don't have a combo, that we match with
definitions of callbacks. So, after a n-tap, for example, the lib wil wait for a few fractions of a second, in case a
new event is happening, to chain it in a combo. That's of course ok, but if you want to react on mouse press/touchstart,
this small amount of time to react will appear to the user as an eternity, or, let's say, will make the UI appear as
sluggish. So, the solution is to use what I called "notification" gestures. They are sent immediately, and "in parallel" of normal gestures, and can't be in combos, that they would pollute. Examples:
- if you touch a screen, move immediately, then release, you will get: press, dragStart, drag (few times),
dragStop, release.
- if you double tap a screen, while a pointer is already touching, you will get: tip-press, tip-release, tip-tap. **In this
order**. Remember: tap and swipe being "combo-able", they aren't sent right away. That's why release arrives first. This
said, it's up to the app to decide which "event" to use.


## Mono-pointers (mouse) fallbacks

For now, there's not exactly any _fallbacks_, in the way that you could magically simulate multi-pointers with mono-pointer
system. Sorry. I'm thinking of some key-button combination, like shift-click to place the center of the rotation, then
click and drag to rotate... feedback welcome!

So, what fallbacks mean is that you can define combos which react to both touch or mouse events, simply masking you the
difference. So, yes, only single pointer interactions can be done with mouse.


# Syntax for defining gestures

## Defining simple gestures

The syntax for defining simple gestures is, well, simple:
- the base is simply the gesture name: _tip_, _tap_, _swipe_t_, _swipe_r_, _swipe_b_, _swipe_l_, _pinch_ *, _rotate_ *,
_drag_
- add to this the count of pointers involved. Want to signify a tap of two pointers? _tap2_. A tri-swipe to the right?
_swipe_r3_. Dragging with 2 pointers? _drag2_.
- as the smart readers will have noticed, no need to put "1" when only one pointer is involved.

(*) pinch and rotate are not yet implemented like this in this alpha release. I'm still not decided on whether I should
enhance the object returned to the drag callback with some rotation and zoom values, or define _pinch_ and _rotate_ as
gestures. Indeed, any two (or more) pointers dragging involves some zoom (we are not robots), so either we have a _zoom_ gesture, for which we can define precision-triggering threshold, or we have only _drag_ gesture and values of rotation and zoom, and the application decides what to do with. **Feedback and suggestions welcome**


## Defining complex gestures

As we saw before, complex gestures are a combination of simultaneous simple gestures. In fact, it's even more reduced
than this, since you can't really combine _any_ kind of gestures. And it quite makes sense: though we can imagine doing
some rotation with both hands, chances are that they will happen on different elements, and will as such be defined as
two different gestures. What is more realistic is combination of _tips_ and (_taps_ or _swipes_).

### With "tip" prefix
Depending on your usage, you may or not want the lib to use "tip prefixing" (see [Settings](#3). By this, I mean include in the complex gestures definition, the "tip" count for tipping pointers. Example, if you want to trigger an action for every tap happening while two pointers are tipping, you would use: "tip2-tap". This is convenient for some quick application, or some demo, not using any robust routing or finite state machine to deal with complex things. Examples: _tip2-tap2_ (two pointers down, tap with two others), _tip-swipe\_b_, etc.

### Without "tip" prefix
You define combos and complex gestures without taking into consideration the count of tipping pointers,
because, somehow, you already deal with this with your routing system, FSM, etc. So,
since you will already know that you are in the state "tip2", for example, you just define the combo as _tap2_,
for dealing with a _tip2-tap2_.

## Pattern matching

Sometimes, you want to catch a move, whatever the context (translate: whatever count of tips). Some other time, you may
want to trigger something whatever the count of pointers tapping simultaneously. Etc. In all these cases, you should use
a joker, as in regular expressions. And, what a chance, we use the same modifiers as in RegExp!
- __*__: any number of times (== "0 or more")
- __+__: any number of times > 0 (== "1 or more")
- __?__: 0 or 1 occurrence

Examples:
- with any count of pointers tipping, act when exactly one is removed: _tip\*-untip_. (Why _tip\*_, not _tip+_?
Because when you untip, the untipped pointer is not tipping anymore (brilliant, I know, I know). So, untipping a single
pointer returns only "untip", not "tip-untip")
- with any count of pointers tipping, act when some new pointers start tipping: tip*-tip+
- etc.


## Defining combos

As you know, combos being few gestures in a row, we only need a separator between gestures (which is also overloadable,
but can't be omitted). I went for greater than: ">"
Examples:
- double tap: tap>tap
- double bi-tap followed by bi-swipe right: tap2>tap2>swipe_r2
- same as above, but requiring that there are first 3 pointers touching the screen: tip3-tap2>tip3-tap2>tip3-swipe_r2
- etc.

# Callbacks on intersecting combos

The library allows to define several callbacks on a same combo, or, let's say, on __intersecting combos__. If it may not
sound useful at first, it's in fact adding a real comfort (and was added for this reason :-p). Let's take the example
of the simple demo. We must catch all the pointers touching each picture, either when tipping, or when touching and moving
right away; for this reason, we catch: __tip\*-tip+/tip\*-press+__. However, highlighting the picture ONLY when you
want it (that is, when you select or drag it) in this callback would be tricky (I know, I tried :-)): if you do so, the
__press__ "event" caught means that when you double-tap, the picture will highlight, de-highlight (supposing we have the
symmetrical logic for de-highlighting), highlight again, de-highlight again. Not nice. Adding the ability to test, within
the callback, which "event" was really caught (if event == "tip") is not elegant for the app coder. So instead, you add
another callback on __tip+/dragStart+__ in which you define the highlight. You'll notice that there's no __tip\*__,
which means we DO want only the first pointer action here (for this, it wouldn't hurt to do it at each pointer, but it
would be useless, so why waste CPU cycles?). Similarly, to de-highlight, we catch: __untip+/dragStop+__. This time
however, not putting __tip\*__ is important, because we want to signify that we remove the highlight ONLY when the LAST
pointer(s) is(are) removed.


# Coding

## TipTap initialization
You must first call TipTap.init(), passing an optional settings object. The list of fields and their default value:

```javascript
comboAlternateOperator: "|",
```

Char to define alternate combos: press|tip

```javascript
comboEndTimer_ms: 100,
```

Max delay between two actions in a same combo (like time between two clicks in a double-click)

```javascript
comboGesturesSep: ">",
```

Separator of gestures in combos: tap2**>**tap2 (double bi-tap)

```javascript
comboParallelActionOperator: "-",
```

Separator of simple gestures in complex gesture: tip2-tap2 (bi-tap while bi-tipping)

```javascript
debug: true
```

Global flag to "trace" the code (this and related code should be remove from production use, but quite convenient for understanding what's happening in your gestures)

```javascript
deviceType: TipTap.DEVICE_MOUSE,
```

Can be TipTap.DEVICE_MOUSE or TipTap.DEVICE_TOUCH. If you want to force the type of device on which to work. In practice,
it doesn't make sense to force it, and you should let the library define by itself what type of device to use.

```javascript
moveThreshold_px: TipTap.touch ? 8 : 0,
```

When you think your pointer is perfectly still on the screen, it's in fact moving, most of the time. This is another tolerance factor.

```javascript
rotoZoom: false,
```

Global flag to activate or not the rotation and zoom "demo" effect. Will be replaced by more specific flag when these effects are correctly implemented.

```javascript
simultaneousMovesTimer_ms: 3 * TipTap.TOUCH_REFRESH_ms,
```

Delay accepted between similar events/moves to be considered as simultaneous. It's one of the key reasons of this library,
compensating for not perfect simultaneity of pointers tapping for example.

```javascript
swipeDuration_ms: 8 * TipTap.TOUCH_REFRESH_ms,
```

Longest move duration to still be considered as a swipe (moving the pointer, even fast, all along the screen is not a swipe)

```javascript
swipeMaxDistance_px: 160,
```

Maximum dragged distance to still be a swipe.

```javascript
swipeMinDisplacement_px: 8,
```

Speed being distance / time, define the minimal distance covered by the first drag to consider as swipe. It's not
retina friendly. In fact, it's not multi-DPI friendly, and needs improvement!

```javascript
tapMaxDuration_ms: 150,
```

If the pointer goes down without moving / releasing for longer than this, it's a tip.

```javascript
useBorisSmusPointersPolyfill: false,
```

Uses Boris Smus ["pointers.js"](https://github.com/borismus/pointer.js) polyfill. Defaults to false. BE CAREFUL: you have to modify the library, to deactivate the Gestures management, fully not compatible with TipTap.

<a name="3" />
```javascript
useTipPrefixes: false,
```

Include or not the "tip" prefixes in combos for matching: "tip-tap" or just "tap". DEFAULTS TO FALSE because,
in fact, in a serious application, using some finished state system, it doesn't really make sense,
and just makes combos definitions counter-intuitive.


## Setting a callback

#### Without jQuery

When the lib is used without jQuery, the biggest (only?) drawback is the fact that the "filter" option for delegation only accepts classname. Beware: it's "_classname_", and not "_.classname_"!

The syntax is the following:
``` javascript
TipTap.on(
	<DOM element|DOM elements list>,
	[   // if you attach a single combo/callback, you don't need to use an array. Use the object right away
		{
			combo:    '<combo>',
			filter:   '<filter aka a classname>',
			capture:  TipTap.CAPTURE_CAPTURE|TipTap.CAPTURE_BUBBLE,
			callback: <callback>
		},
		// repeat the above structure for all the combos you need
	],
	<bound object>
);
```

- _DOM element_ \*: as retrieved by document.getElementById()
- _DOM elements list_ \*: Should allow to work on list of DOM elements sent back by getElementByClassName, getElementByTagName, querySelectorAll, etc. **NOT TESTED AT ALL**
- _combo_ \*: any string defining a valid combo (syntax validation is, let's be fair, inexistant): 'tap',
'tip-tap', 'tap2>tap3', 'tip2-swipe_r', 'press|tip', 'tip\*-dragStart', etc.
- _filter_: only a string being a classname. DO NOT include the "." in opposition to jQuery (because there, it's
a CSS syntax...), don't set if you want the elements passed to be the ones dealing with the "events"
- _capture_: defines if the combo must be treated by parents first (like in DOM2 even model "capture",
or by children first (bubbling)). It allows to benefit TipTap's HIC, while still, managing multi-pointers gestures on a container full of elements with gestures attached. Say that you touch your container area with 3 pointers simultaneously. If you didn't use this _capture_ mode, then chances are high that each pointer touches a child element, which will then capture the event, meaning your 3 pointers gesture won't work anymore once the container is filled. Using _capture_ lets you define higher-level gestures (like, 3 pointers pinch to zoom the whole) even when the touchable area is crowded. In other words, using **TipTap.CAPTURE_CAPTURE** when attaching a gesture to a parent element gives the gesture a higher priority than the ones of its children. If not specified, defaults to **TipTap.CAPTURE_BUBBLE**, which is the opposite.
- _callback_ \*: the callback receiving the Action as parameter (_function(action) { <do something> }_)
- _bound object_: will be set as the _this_ in the callback.

Elements with \* are mandatory.

Example, one combo:
``` javascript
TipTap.on(
	document.getElementById('myDiv'),
	{
		combo:    'tap',
		filter:   '',
		callback: function(action) { alert("Tapped !"); }
	},
	this
);
```

Example, few combos:
``` javascript
TipTap.on(
	document.getElementById('myDiv'),
	[
		{
			combo:    'tap',
			filter:   '',
			callback: function(action) { alert("Tapped !"); }
		},
		{
			combo:    'tip',
			filter:   '',
			callback: function(action) { alert("Tiiiip !"); }
		},
		{
			combo:    'tap>tap',
			filter:   '',
			callback: function(action) { alert("Double tap !"); }
		}
	],
	this
);
```


#### With jQuery

```javascript
$(<targets filter>).jTipTap(
  "on",
  [
    {
      combo:    '<combo>',
      filter:   '<filter aka a classname>',
      capture:  TipTap.CAPTURE_CAPTURE|TipTap.CAPTURE_BUBBLE,
      callback: <callback>
    },
    // repeat the above structure for all the combos you need
  ],
  bound object);
```
- _"on"_ \*: means we created a new TipTap "event". "off" doesn't exist yet.
- _filter_: here, any CSS/jQuery valid filter, to define which objects will really receive be targeted by the
call. This is very like event delegation: ".myclass", "not:input", etc.

Other comments are the same.

### A simple callback on an element

Setting up a callback is a simple as this:
```javascript
$('#myID').jTipTap(
	'on',
	{
		combo: 'tap',
		callback: function (action) { alert('You tapped me!'); }
	}
);
```

As you could guess, this will pop an alert when you **tap** the element of id **myID**. Defining more complex gestures and combos is as simple as this, and this is why this library was made for.

### A callback delegated to sub-elements

This is hardly harder:
```javascript
$('#myID').jTipTap(
	'on',
	{
		combo: 'tap',
		filter: 'sub'
		callback: function (action) { alert("You tapped element: " + action.getPointer(0).target.id); }
	}
);
```

The method **getPointer()** from parameter **action** retrieves the pointer by the given number FROM THE LAST GESTURE.
This is important to know that we can get such informations only for the last gesture done. We could keep track of all the gestures which made the combo, but I didn't have the usage yet, so it will remain this way for now.

### The Pointer object

The Pointer structure is quite simple, the four more important properties for the user being:
```javascript
identifier
```
The pointer identifier. Either given by the system for Touch devices, or created by TipTap library for the Mouse (but 
meaningless in this case except for internal stuff)

```javascript
$target
```
The jQuery object wrapping the DOM element which received the gesture

```javascript
pageX
```
The pageX (like in DOM) where the gesture happened

```javascript
pageY
```
The pageY (like in DOM) where the gesture happened


## The included demo

### Dependencies

To run the demo, you need to have a /libs/ folder containing the following files:
- jquery-1.8.1.min.js (if you use demo-jQuery.js)
- lodash.min.js
- signals.min.js
They were not included in this repo because I think it's not the way to do.

### Content

The small demo shows the basics of TipTap, like attaching some callbacks to a main element, and to its not yet existing
children, pretty much like event delegation. Because the only events created are attached to the main container, no need
to clean anything when removing these sub elements. It also shows some small tips, like using
**tip\*-tip\+\|tip\*-press\+** and **tip\+\|dragStart\+** to deal with highlighting the selected image correctly (only
on tip or dragStart (in case the user moves the pointer too fast for a **tip**), while the recording of the pointer must
happen during tip or press (in case of fast drag start, again). If highlighting was set for **press** for example, a double tap would flash the highlighting because of the two **press** events sent.
The "demo.js" version use jquery internally (I was too lazy to change the code), but it uses TipTap without jQuery at
 all.

### Actions
- tap the background to pop new images
- press+drag or tip+drag (press+drag means you touch the screen (click mouse) and move right away, tip means you wait till the image border gets highlighted and shadow shows up) to move the image. On iPad, you can use your ten pointers and your nose to move up to 11 at a time (device limit)
- with two or more pointers, you can zoom + rotate the pictures (however, as stated, this is not yet connected to decent usable system, it's only visual)
- double tap an image to zoom by 1.1
- triple tap an image to dezoom by 1.1
