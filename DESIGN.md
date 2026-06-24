# CCC Design System

> The design direction for Claude Command Central. This is the source of truth for
> visual identity, the theme architecture, and the motion system. Art and code
> changes should conform to this document; when they diverge, fix the code or
> update this doc in the same change.

CCC's goal as an open-source project is to be **genuinely delightful and clear at a
glance**. The product *is* the visuals — the robots, the office, the motion. So
design is not decoration here; it is the core feature, and it is held to a
correspondingly high bar.

---

## 1. Design philosophy

Three principles, aligned with Anthropic's published "avoid AI-slop" design guidance
and validated against what already works in this repo:

1. **Distinctive over safe.** Committed fonts (JetBrains Mono + Orbitron, never
   Arial/Inter), a dominant palette with sharp accents (neon-on-deep-ink, never
   "safe grays and subtle blues"), real texture (grids, scanlines, volumetric
   light). Nothing generic.
2. **Motion is information, not garnish.** Every animation must justify its
   existence. Motion marks *what is alive right now* — the active room, the running
   mission, a state change — and recedes everywhere else. (See §4.)
3. **Depth through layering, not glow alone.** Elevation comes from stacked,
   *varied* shadows (rim highlight + inner shadow + floor hairline + drop), the way
   the mission cards already do it. Uniform shadows read as flat; flat reads as
   slop.

### Core patterns already proven (keep these)

- **Substrate flip** (`K-PAT-002`): a project's hue is an *accent* (rail, badge
  glyph, breathing halo), never the body fill. Body stays deep ink so text reads as
  crisp near-white. Peak halo alpha capped at `55`, never `AA`+.
- **Motion beats static** (`K-PAT-001`): a running card is distinguished by *motion*
  (a 2.4s breathing halo on a non-aligned period), not by being brighter. This
  scales without a brightness arms-race.

---

## 2. Token system — the single source of truth

Today, color lives in **three** places that can drift:

| Source | Examples | Retintable at runtime? |
| --- | --- | --- |
| `web/src/styles/globals.css` `@theme` block | `--color-ink-900`, `--color-neon-cyan` | ✅ via CSS var override |
| `web/src/types.ts` `PHASE_HEX` | `BUILD: '#ffb400'` | ❌ hardcoded TS |
| Inline hex in components | `LiveFeed.tsx` `#00f5ff`, `ProjectChip.tsx` HSL hash | ❌ hardcoded TS |

**Target:** one canonical token table that both CSS and TS read from, so a theme
switch retints *everything* — including the robots (whose `color` prop is derived
from `PHASE_HEX`) and the live feed.

### Token tiers

```
tier 0  raw palette     --ccc-ink-950 … --ccc-ink-600, --ccc-accent-{cyan,blue,…}
tier 1  semantic roles   --ccc-bg, --ccc-surface, --ccc-surface-raised,
                         --ccc-text, --ccc-text-muted, --ccc-border, --ccc-grid
tier 2  phase roles      --ccc-phase-prompt … --ccc-phase-deploy  (→ tier 0 accents)
tier 3  motion           --ccc-ease-contact, --ccc-ease-settle, --ccc-ease-ambient,
                         --ccc-dur-fast, --ccc-dur-loop, --ccc-motion-scale
```

- **Tailwind** utilities continue to map to tier 0/1 via the `@theme` block, but the
  `@theme` values reference the tier vars (e.g. `--color-ink-900: var(--ccc-ink-900)`).
- **TS** gets a generated/maintained `theme.ts` exporting the same tokens, with
  `PHASE_HEX` and `projectColor()` reading from the active theme rather than
  literals. JS that needs a live value reads `getComputedStyle(root)` once per theme
  change (cheap, on switch only).

---

## 3. Theme architecture (the headline feature)

CCC ships **multiple switchable visual styles**, selectable at runtime and
persisted to `localStorage`. This is a design-quality win and a genuinely fun
feature ("…wait, it has skins?").

### Mechanics

- A theme is a plain object: `{ id, name, tokens, typography, texture, motion, sprite }`.
- Themes live in `web/src/themes/` — one file per theme + an `index.ts` registry.
- Applying a theme sets `document.documentElement.dataset.theme = id` and writes the
  tier-0/1/2/3 CSS variables under `:root[data-theme="<id>"]` (authored in CSS) **or**
  injects them from the registry object (authored in TS). We pick **one** authoring
  home — TS registry — and generate the CSS var block, so there is no second source.
- A `ThemeProvider` (React context) exposes `theme` + `setTheme`; a compact switcher
  lives in `TopBar` (cycle / dropdown).
- `prefers-reduced-motion` and a `sprite` flag let a theme opt into a different robot
  renderer (see §5).

### Proposed themes (v1 set — for review)

| id | Name | Mood | Palette direction | Sprite style |
| --- | --- | --- | --- | --- |
| `neon-noir` | **Neon Noir** *(default, current)* | Cyberpunk control room | Deep indigo-black ink + saturated neon accents | Current SVG humanoid |
| `amber-crt` | **Amber CRT** | Retro-terminal, 1980s ops | Near-black + monochrome amber/green phosphor, heavier scanlines, glow bloom | Same geometry, phosphor palette + flicker |
| `clay` | **Clay** | Warm "terracotta dusk" | Deep warm substrate + earthy accents (teal/ochre/mauve/sage/rust) that glow on the dusk background | Current SVG humanoid (warm-tinted) |

> The bold mood shift is `clay` (warm dusk) and `amber-crt` (single-phosphor retro);
> `neon-noir` is the elevated current style. All three share geometry; only
> palette/texture/motion change. **Note:** `clay` was initially attempted as a *light*
> theme, but the scenes are built for a dark stage (additive light washes/glows), so
> light mode read as bright-on-bright. Clay is therefore a warm *dark* theme; a true
> light mode is a separate per-scene lighting effort (see SCENE-DEFECTS.md).

---

## 4. Motion system

Motion is currently excellent per-animation but **ad hoc**: ~40 keyframes with
inlined easings, all looping always-on, no orchestrated entrance, no reduced-motion
path. The system below keeps the craft and adds structure.

### Named easings (promote the existing curves to tokens)

| Token | Value | Use |
| --- | --- | --- |
| `--ccc-ease-contact` | `cubic-bezier(0.55, 0.06, 0.35, 1.1)` | weighted impact — hammer, arm swing |
| `--ccc-ease-settle` | `cubic-bezier(0.34, 1.2, 0.5, 1)` | poses settling — done cross, error slump |
| `--ccc-ease-ambient` | `ease-in-out` | breathing, halos, idle loops |

### Motion budget (the one real gap)

- **Focal hierarchy.** The *active* phase room runs full choreography. Idle/resting
  rooms drop to a slow ambient breath only. Today five resting rooms compete with the
  one that's working; they should recede. (Extend `K-PAT-001` from cards to the grid.)
- **Orchestrated entrance.** On mount, rooms cascade in (~60ms stagger) and agents
  "boot up" rather than snapping in. One well-orchestrated arrival beats scattered
  always-on micro-motion. This is the highest-impact missing piece.
- **`--ccc-motion-scale`.** A global multiplier (0–1) per theme and per
  `prefers-reduced-motion`. At `0` (reduced motion): entrance only, no perpetual
  loops. Themes can dial intensity (e.g. `amber-crt` heavier, `clay` calmer).

### Reduced motion

`@media (prefers-reduced-motion: reduce)` must disable all looping keyframes and keep
only discrete state feedback. Non-negotiable; currently absent.

---

## 5. Robot & office art direction

The robots are the product's face and are **underweighted** in the current layout
(small sprites, lots of empty floor). Direction:

- **Bigger, more characterful sprites** — increase sprite-to-room ratio so the
  character is the focal point of each room, not set dressing.
- **Silhouette readability** — a robot must be legible at small size and instantly
  distinguishable by *what it's doing* (pose/tool), not just color.
- **Per-room set dressing should make rooms feel like different places** — intake bay
  vs stunt lab vs launchpad should differ in architecture and props, not just hue.
- **Depth** — foreground/midground/parallax layers; ambient lighting that responds to
  whether the room is active.
- **Sprite skinning** — `AgentSprite` takes a `sprite` style from the theme so
  `clay` can render matte rounded robots and `amber-crt` a phosphor wireframe, while
  `neon-noir` keeps the current chrome. Shared rig, swappable skin.

Scene contract, layout rules, and how to add a phase end-to-end remain governed by
the `ccc-scene-architecture` skill — this doc sets the *visual* bar; that skill sets
the *structural* one.

---

## 6. Typography

- **Display:** Orbitron. **Body/mono:** JetBrains Mono. (Per theme, `clay` may swap
  display to a warm editorial serif.)
- **Letter-spacing as signal** (apply the scale): `-0.01em` on hero/display headings
  (confident, dense), `0.08em` on uppercase category/phase labels (breathing tags),
  `0.01em` on body. Phase labels and project codes are the immediate candidates.

---

## 7. From design to a usable example (how the work pays off)

Design quality only lands once it's *captured and trivially tryable*. Order:

1. **Theme architecture + elevated `neon-noir`** — the switchable-skins feature.
2. **Second + third themes** (`amber-crt`, `clay`) — proves the system, gives the
   "it has skins!" hook.
3. **Hero artifact** — a looping GIF/MP4 at the top of the README of a full mission
   flowing PROMPT→DEPLOY, plus a theme-switch beauty shot. This communicates the
   project faster than any code.
4. **Zero-friction try** — one-command demo (`npx … demo`) and ideally a live web
   deploy people can click.
5. **Repo polish** — README hook, screenshots (✅ started in `docs/screenshots/`),
   license, topics, tagline.

---

## Status

- ✅ Philosophy, token-tier plan, theme set, and motion system specified (this doc).
- ✅ Screenshots captured (`docs/screenshots/`).
- ✅ Token consolidation — single source of truth in `web/src/theme/registry.ts`;
  Tailwind `--color-*` overridden at runtime; `phaseHex` fed via context.
- ✅ Theme registry + `ThemeProvider` + TopBar switcher (persists to localStorage).
- ✅ `neon-noir`, `amber-crt`, `clay` themes ship and switch live.
- ✅ Reduced-motion gate (`prefers-reduced-motion`) + named easing tokens.
- 🟡 **Follow-up: robot hues are theme-independent.** Agents are colored by
  `projectColor()` (an HSL hash), so they stay vivid across themes. Route project
  color through the active theme (sat/lightness bounds or a per-theme hue map) so
  robots feel native to `clay`/`amber-crt`.
- ✅ **`clay` reworked to warm-dark "terracotta dusk".** The first (light) attempt
  read bright-on-bright because scenes are dark-stage. Fixed + verified. A true
  light mode remains a separate per-scene lighting effort (see SCENE-DEFECTS.md).
- 🟡 **Follow-up: sprite skinning.** `AgentSprite` still renders one chrome style;
  add a per-theme `sprite` skin (matte for `clay`, phosphor wireframe for `amber-crt`).
- 🟡 **Follow-up: remaining inline accents.** `LiveFeed.tsx` and parts of `TopBar`
  still hardcode `#00f5ff`; migrate to `var(--ccc-accent)` for full retint.
- ⬜ Motion budget (focal hierarchy + orchestrated entrance).
- ⬜ Hero GIF + frictionless try + README rewrite.
