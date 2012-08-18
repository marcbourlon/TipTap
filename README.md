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
[Dojox.gesture](http://dojotoolkit.org/reference-guide/1.7/dojox/gesture.html#dojox-gesture)

Please forgive the poor code quality (intended to improve, of course!), and consider the library in early alpha, not
really because of functionalities, but because of this quality: I went back to coding only recently, and you can
_smell_ it.  

## So, was it meant to do?

Essentially, its goal is to:
* provide a unified, input-device agnostic events capturing system: dealing with Mouse, Touch, Augmented Gestures
	(see [Jérôme Etienne's work](https://github.com/jeromeetienne/augmentedgesture.js)), Leap Motion, etc.
* compensate for human lack of accuracy, leading to almost-simultaneous actions of fingers, instead of simultaneous.
	Think of double bi-tap for example, chances are that you will not tap both fingers twice exactly simultaneously.
	Even if you do, you will not always. And now, try with tri-tap, or worse, double tri-swipe! This inaccuracy was one of
	the main reason to create this lib, and by far the biggest technical issue to solve.
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
- [jQuery](http://jquery.com/) (tested with 1.7.2, probably 1.8.*) (may work with other "$" libraries like Zepto.js,
need to try)
- [Underscore](http://underscorejs.org) by Jeremy Ashkenas (may work with LoDash, I need to try)
- [Signals](http://millermedeiros.github.com/js-signals/) by Miller Medeiros

jquery and underscore dependencies shouldn't be so hard to remove, and is definitely something I'd like to do in the near
future.

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
- _move_: not yet implemented, but should probably be in the future. It's moving without tipping. Impossible on a
	touchscreen, but for a mouse, and for other devices, it is.

And that's all!

### Combining simple gestures on multi-pointers devices

If it was only for simple gestures, this lib wouldn't be very useful, since lots of others do this quite well (Hammer.js,
Touchy, etc.) It's main interest lies in the ability to create complex gestures (and [_combos_][1]). A complex gesture
is defined by several simple gestures happening simultaneously:
Few examples:
- bi-tap
- tri-tap
- tip **and** swipe: one pointer is tipping, while the other is swiping
- bi-tip
- etc.

### Combining gestures in combos

[1]: Combos (as in Street Fighter-like games) are lists of gestures (simple or complex), happening with a short period
of time between each. A combo is ended by any lack of activity during a period of time longer than this accepted
duration for a combo, or by any number of _tips_. Examples of combos:
- double _tap_ then _tip_
- triple _tap_
- double bi-tap: by "bi-tap", I mean tapping two pointers at once
- double _tip_ followed by _swipe_: can be a trigger of an action in an application, or a special attack combo in a game
- combinations are almost endless (in fact, no, some decisions had to be taken due to technical constraints, and
	the uselessness of the related possibilities), mostly limited by the convenience of the combo (let's say that "triple
	quad-tap followed by bi-tap simultaneously with triple-swipe" wouldn't exactly be a very usable combo :-D)

### Mono-pointers (mouse) fallbacks

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
gestures: _tip2-tap2_ (two fingers down, tap with two others), _tip-swipe_b_, etc.

## Pattern matching

Sometimes, you want to catch a move, whatever the context (translate: whatever count of tips). Some other time, you may
want to trigger something whatever the count of pointers tapping simultaneously. Etc. In all these cases, you should use
a joker, as in regular expressions. And, what a chance, we use the same modifiers as in RegExp!
- __*__: any number of times (== "0 or more")
- __+__: any number of times > 0 (== "1 or more")
Examples:
- with any count of fingers tipping, act when exactly one is removed: tip*-untip . (Why _tip*_, not _tip+_? Because when you untip,
the untipped finger is not tipping anymore (brilliant, I know, I know). So, untipping a single finger does return
"untip", not "tip-untip")
- with any count of fingers tipping, act when some new fingers start tipping: tip*-tip+
- etc.

## Defining combos

As you know, combos being few gestures in a row, we only need a separator between gestures (which is also overloadable,
but can't be omitted). I went for greater than: ">"
Examples:
- double tap: tap>tap
- double bi-tap followed by bi-swipe right: tap2>tap2>swipe_r2
- same as above, but with tri-tip: tip3-tap2>tip3-tap2>tip3-swipe_r2
- etc.

# Coding

## TipTap initialization


## Setting a callback


