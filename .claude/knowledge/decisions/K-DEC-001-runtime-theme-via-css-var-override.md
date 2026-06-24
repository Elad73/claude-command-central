# K-DEC-001: Runtime themes via Tailwind v4 `--color-*` override + JS registry as source of truth

**Category:** Decision
**Created:** 2026-06-23
**Tags:** theming, tailwind-v4, css-variables, design-system, web

## Context
Adding switchable themes (neon-noir / amber-crt / clay). Colors lived in three
drifting places: globals.css `@theme`, `PHASE_HEX` in TS, and inline hex in
components.

## Insight
A TS theme registry (`web/src/theme/registry.ts`) is the single source of truth. A
`ThemeProvider` applies each theme by `documentElement.style.setProperty('--color-ink-900', …)`
etc. Tailwind v4 emits utilities as `var(--color-*)`, so overriding those vars at
runtime retints **every** utility-driven surface — no rebuild, no class swapping.

## Why it matters
Cheap, global, persisted (localStorage) retinting; new palettes are a data change.
Use `useLayoutEffect` to apply before paint (no FOUC).

## Trade-off
Phase/robot colors are consumed as hex strings with alpha-suffix concatenation
(`${color}AA`), which breaks if they become `var(...)`. So those stay **hex** and are
delivered via React context (`phaseHex`), NOT via CSS vars — a deliberate dual
channel (CSS vars for utilities, context hex for scene SVG). We also gave up true
"light mode": the scenes are a dark stage (additive glow/light-washes), so a light
clay read as bright-on-bright. Clay became a warm *dark* "terracotta dusk"; real
light mode needs a per-scene lighting pass (gate washes/glows behind a theme flag).

## Application
Trigger: adding/maintaining themes here. Add a theme = add an object to the registry.
Never reintroduce inline hex for themed surfaces; route them to `--color-*`/`--ccc-*`
vars or `useTheme().phaseHex`. Don't attempt a light theme without the scene pass.
