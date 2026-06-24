# K-PIT-003: `translateY(%)` resolves against the element's OWN size, not the parent

**Category:** Pitfall
**Created:** 2026-06-23
**Tags:** css, svg, animation, transform, percentage, scenes, test-scene

## Context
The QA-lab (TEST) stunt-fall set the drop distance with a CSS var
`--fall: calc(100% - <spriteH>px)` used inside `translateY(var(--fall))`, intending
"fall the height of the lane minus the sprite". The agent barely moved and never
reached the crash mat.

## Insight
A `%` inside a `translate`/`translateY`/`translateX` resolves against the
**transformed element's own bounding box**, NOT its containing block. So
`translateY(calc(100% - 84px))` on a 78px-tall sprite = `78 - 84 = -6px`, not
"lane height minus 84". The fall collapsed to a few pixels.

## Why it matters
Any scene that animates travel "across the room" with a percentage transform is
silently broken — it looks like a timing/easing problem but is a geometry bug.
This pattern was copy-pasted across the original TEST scene, so check siblings.

## Symptom
Element jitters in place / travels a tiny fraction of the expected distance;
the value looks right in DevTools computed styles (it shows the `calc()`), because
the wrong resolution only happens at transform-apply time.

## Recovery
Compute the distance as an **absolute pixel value** in JS from real geometry and
pass it in: `style={{ '--fall': `${fallPx}px` }}`. Derive `fallPx` from the lane
height / target element position (or measure via `getBoundingClientRect`).

## Application
Trigger: any `translate*()` using `%` (directly or via a `calc()` var) where you
meant "percentage of the parent/lane". Replace with px computed from layout.
