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


## So, was it meant to do?

Essentially, its goal is to:
* provide a unified, input-device agnostic events capturing system: dealing with Mouse, Touch, Augmented Gestures
	(see [Jérôme Etienne's work](https://github.com/jeromeetienne/augmentedgesture.js)), Leap Motion, etc.
* compensate for human lack of accuracy, leading to almost-simultaneous actions of fingers, instead of simultaneous.
Think of double bi-tap for example, chances are that you will not tap both fingers twice exactly simultaneously.
Even if you do, you will not always. And now, try with tri-tap, or worse, double tri-swipe! This inaccuracy was one of
the main reason to create this lib, and by far the biggest technical issue to solve. To do this, when a pointer event
occurs, it will wait for a tiny amount of time to see if other similar events come. If it happens, it will group the
event together, a bit like what is done natively by iOS with its touch events and the touches* arrays.
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
- [jQuery](http://jquery.com/) (1.7.2+)
- [Underscore](http://underscorejs.org) by Jeremy Ashkenas, or [Lodash](https://github.com/bestiejs/lodash) by John-David Dalton
- [Signals](http://millermedeiros.github.com/js-signals/) by Miller Medeiros

I would love to have no dependency at all, but...


## Current status

Currently, the library is usable, but is still missing few things, which doesn't make it suitable for immediate production
use. However, it gives curious people (or people in the need for such a lib) the ability to start playing with it and give
feedback (mommy I'm scared!). Known missing points:
* real (usable) handling of rotation and zoom
* cleaner/better coding, like using the Markus Gundersen's work-(strongly) inspired rotation-zoomer class as a plugin
* identify a gesture by the proximity of the pointers: it will prevent two almost simultaneous taps at both ends of the
surface to be considered as a same gesture, which is in general never the case. Will be even more important on large
interaction surface like Microsoft Surface tables
* give ability to the application using the lib to split a gesture into several ones
* making it more a module than a plugin (see Miller Medeiros' articles about this), and have jQuery pluginification as
	a plus (it's more or less done, but not great)
* unit tests: I need to take a deep dive into this, and didn't have the time (courage?) to do it yet
* making it both script-tag and AMD-compatible (I shamefully failed to do this)

Consider this as a something like a 0.4 release, not ready for production.


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
- _swipe_: it's like a fast-moving tap. You move the finger fast in one direction (top, right, bottom or left) and while
	moving fast, you tap the screen. Your finger draws a "U" in the air, tangenting the screen at the bottom of the curve,
	gently (but quickly and briefly, after all, I said "tangenting") gliding on it. Of course, the library corrects any not
	perfect direction, and keeps the direction of the biggest movement
- _rotate_: current managing of rotation is not nice. I mean, I quickly hacked a modified version of Markus Gundersen
	touch demo, to allow for zoom and rotate. But it's not yet as efficient as was my previous implementation, and I have
	to merge both. Rotation can be done with two or three (or more, but well..) fingers down, and we'll see why it matters.
- _pinch_: aka _zoom_, it's, well allowing you to do what you expect. Same comment as for rotate: count of fingers may
	differ, and this can be used efficiently.
- _drag_: it's simply moving a pointer while _tipping_
- _move_: **not yet implemented**, but should probably be in the future. It's moving without tipping. Impossible on a
	touchscreen, but for a mouse, and for other devices, it is.


### Notification gestures

In addition to these "real" gestures, exist few "notification" gestures. Complete understanding of such gestures comes
with the explanation of combos. The notification gestures are the following:
- _press_: fired when a finger touches the screen (_touchstart_ event), a mouse is pressed, etc.
- _started_dragging_: fired when a finger starts moving, a mouse with button pressed starts moving, etc.
- _stopped_dragging_: fired when a finger IS RELEASED FROM THE SCREEN after some dragging, a mouse with button is
released after it was dragged, etc. Whether I should implement a timer to detect the end of the motion is not decided
yet (sounds cool and logical, but maybe difficult, so, as usual, **feedback welcome**)
- _release_: as expected, fired when fingers are removed from the screen (mouse released, etc.)

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
sluggish. So, the solution is to use what I called "notification" gestures. They are sent immediately, and "in parallel" of normal 
gestures, and can't be in combos, that they would pollute. Examples:
- if you touch a screen, move immediately, then release, you will get: press, dragStart, drag (few times),
dragStop, release.
- if you double tap a screen, while a finger is already touching, you will get: tip-press, tip-release, tip-tap. **In this
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
- add to this the count of pointers involved. Want to signify a tap of two fingers? _tap2_. A tri-swipe to the right?
_swipe_r3_. Dragging with 2 pointers? _drag2_.
- as the smart readers will have noticed, no need to put "1" when only one pointer is involved.

(*) pinch and rotate are not yet implemented like this in this alpha release. I'm still not decided on whether I should
enhance the object returned to the drag callback with some rotation and zoom values, or define _pinch_ and _rotate_ as
gestures. Indeed, any two (or more) pointers dragging involves some zoom (we are not robots), so either we have a _zoom_ gesture,
for which we can define precision-triggering threshold, or we have only _drag_ gesture and values of rotation and zoom,
and the application decides what to do with. **Feedback and suggestions welcome** 


## Defining complex gestures

As we saw before, complex gestures are a combination of simultaneous simple gestures. In fact, it's even more reduced
than this, since you can't really combine _any_ kind of gestures. And it quite makes sense: though we can imagine doing
some rotation with both hands, chances are that they will happen on different elements, and will as such be defined as
two different gestures. What is more realistic is combination of _tips_ and _taps_ or _swipes_. You create complex
gestures by joining simple gestures with a dash (between you and me, not only the dash is changeable by config, but is
also optional, and was added only because I think it makes things more readable for the coder/user. With all these
informations, you will have come to the conclusion that most complex gestures will be some "tip-tap" or "tip-swipe"
gestures: _tip2-tap2_ (two fingers down, tap with two others), _tip-swipe\_b_, etc.


## Pattern matching

Sometimes, you want to catch a move, whatever the context (translate: whatever count of tips). Some other time, you may
want to trigger something whatever the count of pointers tapping simultaneously. Etc. In all these cases, you should use
a joker, as in regular expressions. And, what a chance, we use the same modifiers as in RegExp!
- __*__: any number of times (== "0 or more")
- __+__: any number of times > 0 (== "1 or more")
- __?__: 0 or 1 occurrence

Examples:
- with any count of fingers tipping, act when exactly one is removed: _tip\*-untip_. (Why _tip\*_, not _tip+_?
Because when you untip, the untipped finger is not tipping anymore (brilliant, I know, I know). So, untipping a single
finger returns only "untip", not "tip-untip")
- with any count of fingers tipping, act when some new fingers start tipping: tip*-tip+
- etc.


## Defining combos

As you know, combos being few gestures in a row, we only need a separator between gestures (which is also overloadable,
but can't be omitted). I went for greater than: ">"
Examples:
- double tap: tap>tap
- double bi-tap followed by bi-swipe right: tap2>tap2>swipe_r2
- same as above, but requiring that there are first 3 fingers touching the screen: tip3-tap2>tip3-tap2>tip3-swipe_r2
- etc.

# Callbacks on intersecting combos

The library allows to define several callbacks on a same combo, or, let's say, on __intersecting combos__. If it may not
sound useful at first, it's in fact adding a real comfort (and was added for this reason :-p). Let's take the example
of the simple demo. We must catch all the fingers touching each picture, either when tipping, or when touching and moving
right away; for this reason, we catch: __tip\*-tip+/tip\*-press+__. However, highlighting the picture ONLY when you
want it (that is, when you select or drag it) in this callback would be tricky (I know, I tried :-)): if you do so, the
__press__ "event" caught means that when you double-tap, the picture will highlight, de-highlight (supposing we have the
symmetrical logic for de-highlighting), highlight again, de-highlight again. Not nice. Adding the ability to test, within
the callback, which "event" was really caught (if event == "tip") is not elegant for the app coder. So instead, you add
another callback on __tip+/dragStart+__ in which you define the highlight. You'll notice that there's no __tip\*__,
which means we DO want only the first finger action here (for this, it wouldn't hurt to do it at each finger, but it
would be useless, so why waste CPU cycles?). Similarly, to de-highlight, we catch: __untip+/dragStop+__. This time
however, not putting __tip\*__ is important, because we want to signify that we remove the highlight ONLY when the LAST
finger(s) is(are) removed.


# Coding

## TipTap initialization
You must first call TipTap.init(), passing an optional settings object. The list of fields and their default value:

```javascript
deviceType: TipTap.DEVICE_MOUSE,
```

Can be TipTap.DEVICE_MOUSE or TipTap.DEVICE_TOUCH. If you want to force the type of device on which to work. In practice,
it doesn't make sense, and you should let the library define by itself what type of device to use.

```javascript
SIMULTANEOUS_MOVES_TIMER_ms: 3 * TipTap.TOUCH_REFRESH_ms,
```

Delay accepted between similar events/moves to be considered as simultaneous. It's one of the key reasons of this library,
compensating for not perfect simultaneity of fingers tapping for example.

```javascript
TAP_MAX_DURATION_ms: 150,
```

If the pointer goes down without moving / releasing for longer than this, it's a tip.

```javascript
SWIPE_START_DELAY_ms: 2 * TipTap.TOUCH_REFRESH_ms,
```

Define how fast the user must move his pointer so that the move is considered as a swipe, and not a simple move.

```javascript
SWIPE_DURATION_ms: 8 * TipTap.TOUCH_REFRESH_ms,
```

Max move duration to still be a swipe (moving the finger, even fast, all along the screen is not a swipe)

```javascript
SWIPE_MIN_DISPLACEMENT_px: 8,
```

Speed being distance / time, define the minimal distance covered by the first drag to consider as swipe. It's not
retina friendly. In fact, it's not multi-DPI friendly, and needs improvement!

```javascript
SWIPE_MAX_DISTANCE_px: 160,
```

Max dragged distance to still be a swipe.

```javascript
MOVE_THRESHOLD_px: TipTap.touch ? 8 : 0,
```

When you think your finger is perfectly still on the screen, it's in fact moving, most of the time. This is a tolerance
factor.

```javascript
COMBO_END_TIMER_ms: 100,
```

Max delay between two actions in a same combo (like time between two clicks in a double-click)

```javascript
COMBO_GESTURES_SEP: ">",
```

Separator of gestures in combos: tap2**>**tap2 (double bi-tap)

```javascript
COMBO_PARALLEL_ACTIONS_OP: "-",
```

Separator of simple gestures in complex gesture: tip2-tap2 (bi-tap while bi-tipping)
 
```javascript
COMBO_OR_OPERATOR: "|",
```

Char to define alternate combos: press|tip

```javascript
debug: true
```

Global flag to "trace" the code


## Setting a callback

### The syntax
```javascript
$(<jQuery filter>).jTipTap("on", <combo>[, <sub elements filter>], callback[, bound object])
```
- "on": means we created a new TipTap "event". "off" doesn't exist yet.
- combo: any string defining a valid combo (syntax correctness checking is, let's be fair, inexistant): "tap", "tip-tap",
"tap2>tap3", "tip2-swipe_r", "press|tip", "tip*-dragStart", etc.
- filter: any jQuery valid filter: .classname, #id, not:input, etc.
- callback: a function receiving an Action object as parameter
- object: if specified, the **this** in the callback will be valued to this object. Equivalent of $.bind or _.bind

### A simple callback on an element

Setting up a callback is a simple as this:
```javascript
$('#myID').jTipTap('on',"tap",
           function (action) {
           	alert("You tapped me!");
           });
```

As you could guess, this will pop an alert when you **tap** the element of id **myID**. Defining more complex gestures
and combos is as simple as this, and this is why this library was made for.
all is done so that the 

### A callback delegated to sub-elements

This is hardly harder:
```javascript
$('#myID').jTipTap('on',"tap", ".sub"
           function (action) {
           	alert("You tapped element: " + action.getPointer(0).$target[0].id);
           });
```
The third (optional) parameter is any valid jQuery filter (since all tests are made using jQuery **is()**), allowing some quite
rich way of choosing which elements to pick, including usage of **not:**, elements names, classes, ids...
The method **getPointer()** from parameter **action** retrieves the pointer by the given number FROM THE LAST GESTURE.
This is important to know that we can get such informations only for the last gesture done. We could keep track of all the
gestures which made the combo, but I didn't have the usage yet, so it is this way for now.

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

The small demo shows the basics of TipTap, like attaching some callbacks to a main element, and to its not yet existing
children, pretty much like event delegation. Because the only events created are attached to the main container, no need
to clean anything when removing these sub elements. It also shows some small tips, like using
**tip\*-tip\+\|tip\*-press\+** and **tip\+\|dragStart\+** to deal with highlighting the selected image correctly (only
on tip or dragStart (in case the user moves the finger too fast for a **tip**), while the recording of the finger must 
happen during tip or press (in case of fast drag start, again). If highlighting was set for **press** for example, a double
tap would flash the highlighting because of the two **press** events sent.
