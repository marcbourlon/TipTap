# TipTap
## Introduction

Javascript library to ease mouse and touch gestures management, as well as provide a unified way of managing different
input devices systems: mouse, touch systems and their specific data structure (iOS, Android, Windows...), Leap Motion
hopefully, etc.

This library was meant to fill a hole that I couldn't fill immediately with any other initiative around here,
see this page for a quite comprehensive list of touch libs around: https://github.com/bebraw/jswiki/wiki/Touch
Please forgive the poor code quality, and consider the library in early alpha, not because of functionalities, but
because of this quality: I went back to coding only recently, and you can _smell_ it.  

## So, what does it do?
Essentially, the goal is to:
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

## Status
Currently, the library is usable, but is still missing few things, which doesn't make it suitable for immediate production
use. However, it lets curious people to start playing with it and give feedback (mommy I'm scared!). Known missing
points:
* cleaner/better coding, like using the Markus Gundersen's work-(strongly) inspired rotation-zoomer class as a plugin
* making it more a module than a plugin (see Miller Medeiros' articles about this), and have jQuery pluginification as
	a plus (it's more or less done, but not great)
* unit tests: I need to take a deep dive into this, and didn't have the time (courage?) to do it yet

Consider this as a 0.4 release, not ready for production.
