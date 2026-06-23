# K-PAT-001: Motion (not static glow) is what makes one card stand out among similar siblings

**Category:** Pattern
**Created:** 2026-04-27
**Tags:** ui, dashboard, dispatch-design, mission-strip, peripheral-vision, framer-motion

## Context
The MissionStrip showed five sibling cards (DL, HS, CCC, ET, GB) — one running, four done. The original "running" treatment was a slightly stronger static glow than "done". The user couldn't tell at a glance which project was actually being worked on; all cards looked the same.

## Insight
Static visual emphasis (brighter border, stronger glow, bigger color saturation) **can be matched** by static treatment on the sibling cards. To win peripheral vision unambiguously among siblings of similar shape, use **motion** — a moving element on one card next to still ones is impossible to miss.

Two stacked motion layers with **non-aligned periods** feel alive without ever beating in sync:
- A breathing halo (~25 BPM, 2400ms cycle) — slow enough to live on screen for an hour without irritation.
- A perimeter scanner beam (3200ms orbit) — the load-bearing element; the moving line is what catches the eye even if the user is looking elsewhere.

## Why it matters
Anywhere a dashboard renders "one of these N cards is the active one" — project tiles, agent rosters, build queues, environment cards — this is the pattern that wins. Trying harder with static treatment is a losing arms race once the calmer states already use color and glow.

## Example
```css
/* globals.css — namespaced ccc- so they don't collide with scene keyframes */
@keyframes ccc-mission-running-halo {
  0%, 100% { box-shadow: 0 0 14px var(--ccc-run-c55), 0 0 28px var(--ccc-run-c22), inset 0 0 10px var(--ccc-run-c28); }
  50%      { box-shadow: 0 0 26px 2px var(--ccc-run-caa), 0 0 56px 4px var(--ccc-run-c55), inset 0 0 14px var(--ccc-run-c40); }
}
@keyframes ccc-mission-running-scan { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.ccc-mission-running { animation: ccc-mission-running-halo 2400ms cubic-bezier(.4,0,.6,1) infinite; }
.ccc-mission-scan {
  position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 290deg, var(--ccc-run-cff) 340deg, #fff 355deg, var(--ccc-run-cff) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude; padding: 1.5px;
  animation: ccc-mission-running-scan 3200ms linear infinite; mix-blend-mode: screen;
}
```

```tsx
// React side — drive the project hue via CSS custom properties so the keyframe
// stays color-agnostic and reusable across projects.
const runningVars = running ? {
  '--ccc-run-c22': `${color}22`, '--ccc-run-c28': `${color}28`,
  '--ccc-run-c40': `${color}40`, '--ccc-run-c55': `${color}55`,
  '--ccc-run-caa': `${color}AA`, '--ccc-run-cff': color,
} as React.CSSProperties : {};

<motion.div
  className={`relative overflow-hidden ${running ? 'ccc-mission-running' : ''}`}
  animate={{ scale: running ? 1.015 : 1 }}
  style={{ ...runningVars, zIndex: running ? 1 : 0 }}
>
  {running && <span aria-hidden className="ccc-mission-scan" />}
  {/* card body */}
</motion.div>
```

## Application
Trigger: a row/grid of similar cards where exactly one (or a few) needs to read as ACTIVE/RUNNING/HOT and the existing static styling isn't cutting it. Reach for motion before reaching for more saturation. Keep periods coprime-ish (e.g. 2.4s × 3.2s — ratio not a small integer) so the layered motion never feels mechanical.

Avoid: high-frequency strobes, anything under ~1s cycle, or motion that uses the same period as a sibling indicator (e.g. another `pulse-glow` already in the row) — they'll beat against each other and look broken.
