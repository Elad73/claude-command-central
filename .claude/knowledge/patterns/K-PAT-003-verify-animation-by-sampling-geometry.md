# K-PAT-003: Verify animations by sampling element geometry, not eyeballing screenshots

**Category:** Pattern
**Created:** 2026-06-23
**Tags:** verification, playwright, animation, scenes, getBoundingClientRect

## Context
A redesigned QA-lab fall "looked" wrong in screenshots but the cause was ambiguous —
single frames kept catching the agent high, and it was unclear whether it was a
timing, z-order, or geometry problem. Static screenshots couldn't confirm where the
agent actually travelled over a cycle.

## Insight
For looping motion, assert on **measured geometry over a full cycle**, not a frame.
Use Playwright `browser_evaluate` with an async loop that samples
`getBoundingClientRect()` every ~250ms for one cycle, and compare the min/max to the
target element's box. Numbers are unambiguous where a screenshot is not.

## Why it matters
Turns "this looks off" into "feet travel 130→249px, mat top is 229" — a falsifiable
check that pinpoints the bug and proves the fix. It also enforces the project's
hard-won rule: browser-verify visual changes before claiming done (see the post-Rive
note in STATUS.md). A single glance is how the broken clay theme shipped this session.

## Example
```js
// playwright browser_evaluate
async () => {
  const rr = room.getBoundingClientRect();
  const feet = [];
  for (let i=0;i<32;i++){ feet.push(sprite().getBoundingClientRect().bottom - rr.top);
    await new Promise(f=>setTimeout(f,250)); }      // ~one 7.5s cycle
  return { min: Math.min(...feet), max: Math.max(...feet), matTop: 229 };
}
```

## Application
Trigger: verifying any keyframed travel/landing/alignment (falls, walks, docking).
Sample the moving element's rect across the cycle and assert min/max against the
target it should meet. Pair with element-scoped screenshots for the look.
