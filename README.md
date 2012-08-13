# Introduction
## What is the _TipTap_ library?

The _TipTap_ library is a javascript library to ease mouse and touch complex gestures management, as well as to provide a
unified way of managing different input devices systems: mouse, touch systems and their specific data structure (iOS,
Android, Windows...), Leap Motion hopefully, etc. In fact, it's mostly a present & future based library, mostly aimed at
multi-pointers interactivity, instead of our old-fashioned and already outdated mouse. But it of course supports mouse!

This library was meant to fill a hole that I couldn't fill immediately with any other initiative around here,
see this page for a quite comprehensive list of touch libs around: https://github.com/bebraw/jswiki/wiki/Touch
Please forgive the poor code quality, and consider the library in early alpha, not because of functionalities, but
because of this quality: I went back to coding only recently, and you can _smell_ it.  

## So, was it meant to do?
Essentially, its goal is to:
* provide a unified, input-device agnostic events capturing system: dealing with Mouse, Touch, Augmented Gestures
	(see Jérôme Etienne's work), Leap Motion, etc.
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
The library currently relies on jQuery (or maybe replacement libs like Zepto.js, need to try) and Underscore (maybe
replaceable by LoDash, but I need to try) to work. Dependency shouldn't be so hard to remove, and is definitely something
I'd like to do in the near future.

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

Consider this as a something like a 0.4 release, not ready for production.

# Detailed concepts
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
And that's all!

### Combining simple gestures on multi-pointers devices
If it was only for simple gestures, this lib wouldn't be very useful, since lots of others do this quite well (Hammer.js,
Touchy, etc.) It's main interest lies in the ability to create multi-gestures and combos. The lib was created to make it
easy to deal with multi-pointers gestures and "combos" of gestures. Few examples:
- double-tap
- triple-tap
- double bi-tap: by "bi-tap", I mean tapping two pointers at once
- tip and swipe: one pointer is tipping, while the other is swiping
- double tip followed by swipe: can be a trigger of an action in an application, or a special attack combo in a game
- tip and rotate
- etc. combinations are almost endless (in fact, no, some decisions had to be taken due to technical constraints, and
	the uselessness of the related possibilities), mostly limited by the convenience of the combo (let's say that "triple
quad-tap followed by bi-tap simultaneously with triple-swipe" wouldn't exactly be a great combo :-D)

### Mono-pointers (mouse) fallbacks
For now, there's not exactly _fallbacks_. Sorry. Just, you can define combos which react to both touch or mouse events,
simply masking you the difference. So, yes, only single pointer interactions can be done with mouse.

## Syntax for combining simultaneous gestures


## Syntax for creating combos
