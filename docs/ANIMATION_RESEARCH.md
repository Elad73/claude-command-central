# Animation Upgrade Research — `AgentSprite` and Scene Choreography

Goal: raise visual fidelity and "aliveness" of the agent characters in the
`web/` Vite + React 19 + framer-motion app, without paying performance,
licensing, or pipeline costs that don't fit a side-project terminal-themed
dashboard.

Current baseline (verified in repo, 2026-04-20):

- Bundle: ~409 KB JS / ~31 KB CSS gzipped.
- Sprite: hand-rolled SVG humanoid in `web/src/components/AgentSprite.tsx`
  (355 lines), animated with framer-motion `<motion.*>` + ~60 named
  `@keyframes` rules in `web/src/styles/globals.css`.
- Scenes: six per-phase compositions in `web/src/components/scenes/`.
- Sizes today: `sm` 52×78 and `md` 80×120 (see `AgentSprite.tsx:11-15`).
- Multiplicity: up to 4 agents per room, 6 rooms — i.e. up to 24 sprites
  on screen.

---

## 1. Tier-by-tier landscape

### Tier A — Vector animation runtimes (Rive, Lottie)

These are the closest seam to what `AgentSprite` already is: vector art that
animates. They replace one component, leave the rest of the app intact.

**Rive** — `@rive-app/react-canvas` v4.28.0 (published March 2026) [1].
The runtime package `@rive-app/canvas` is at v2.35.3, with releases roughly
weekly and ~500 GitHub stars on the JS side [2][3]. License: MIT runtime,
free editor (Cadet plan $9/mo, Voyager $32/mo for team collaboration —
single creators stay on the free tier) [4]. Renders to `<canvas>`, no DOM
churn. Bundle: Bundlephobia is the canonical answer but did not render via
WebFetch; community references put `@rive-app/canvas` around 90–110 KB
gzipped including the WASM stub, with `@rive-app/react-canvas-lite`
materially smaller at the cost of dropping some features [1]. A `.riv` file
for one character is typically 30–80 KB.

**Why Rive matters for THIS app**: state machines map cleanly to our
`status × phase` matrix. A Rive state machine accepts three input types —
`Boolean`, `Number`, `Trigger` — exposed in React via the
`useStateMachineInput` hook [5][6]. Concretely we'd model:

- `phase` as a `Number` input in `[0, 5]` (PROMPT…DEPLOY; same order as
  `PHASES` in `src/events/types.ts`).
- `status` as a `Number` in `[0, 3]` (idle / active / blocked / done) or
  three booleans.
- `errored` as a `Trigger` to fire the warning glyph.

Transitions between BUILD-hammer-loop and DEPLOY-arms-up become editor
work — no React re-renders, no CSS keyframes to babysit. The Pixel Point
post on optimizing Rive in React covers the perf footguns (don't recreate
`Rive` instances on rerender, share artboards) [7].

**Lottie** — `lottie-react` v2.4.1 wrapping `lottie-web` v5.13.0 (MIT,
31.4k stars on `airbnb/lottie-web`) [8][9][10]. Bundle is the well-known
sore point: `lottie-web` is ~237 KB minified / ~60 KB min+gz (per the
project's own bundle-size issue, still cited as the live number) [11].

A modern alternative is `@lottiefiles/dotlottie-react` v0.19.0 (April 2026)
which uses a WASM rendering core fetched from CDN to keep the JS bundle
small (initial ~16–51 KB JS, with WASM lazy-loaded over network) [12][13].
Asset ecosystem is the killer feature: LottieFiles has 800k+ animations,
500k+ free, under the Lottie Simple License [14].

**Verdict for Tier A**: Lottie is great for one-shot decorative
animations but every state change is essentially "play the right segment",
which is brittle for our 24-axis matrix. Rive's state machine is the
purpose-built fit. Lottie wins on free pre-made characters; Rive wins on
expressive interactivity.

### Tier B — 2D skeletal rigging (Spine, DragonBones, PixiJS)

**Spine** (`@esotericsoftware/spine-pixi-v8` v4.2.108) is the industry
standard for game-style 2D skeletal animation with IK and mesh
deformation [15]. License is the gotcha: Spine *runtimes* require every
integrating developer/team to hold a paid Spine *Editor* license (Essential
$69, Professional $399 one-time per seat) [16]. Runtime adds Pixi.js (~100
KB gz) plus the spine runtime (~50 KB gz) plus rig+atlas assets.

**DragonBones** is effectively dead — the editor is unmaintained and the
community is migrating to Spine or to "Webcraft" (a 2025 PWA successor) [17].

**Verdict for Tier B**: capability-wise this is a clear step up from Rive
for organic motion (cloth, fluid IK), but the price + asset-pipeline cost
is wrong for a single-developer terminal dashboard. Skip unless we hire a
2D animator. Rive covers ~85% of what Spine covers, free, with a faster
learning curve.

### Tier C — 3D / WebGL (`@react-three/fiber` + `drei`, Spline, Mixamo)

`@react-three/fiber` v9.6.0 + `@react-three/drei` v10.7.7 [18][19].
Free / MIT. But: Three.js is ~155 KB gzipped on its own [20], r3f adds on
top, drei adds more (a single `OrbitControls` import from drei pushed one
real-world bundle to 988 KB unminified / 273 KB gzipped) [21]. Add a
glTF/GLB rig (1–5 MB) per character and you're now shipping multiple MB
just to render a robot.

Multiplicity is the harder problem. We render up to 24 agents
simultaneously across six adjacent canvases. Twenty-four animated rigs,
each with their own bones/morphs, in the same browser tab will compete for
a single GPU context. Sharing a context across rooms is doable in r3f but
forces a layout rewrite of the office grid.

**Verdict for Tier C**: a 3D look would be impressive but moves us out of
the "terminal aesthetic" lane the design lives in (`globals.css` scanlines,
monospace, neon hex). Skip — see §5.

### Tier D — Animation orchestration (GSAP, Theatre.js, Motion v12)

These don't replace the figure; they replace the *director*. Our current
choreography is hand-rolled `@keyframes` (~60 of them, see line listing in
`globals.css`) plus framer-motion props on `<motion.div>` wrappers.

**GSAP** v3.13 (May 2025 release) is now 100% free including all premium
plugins (SplitText, MorphSVG, DrawSVG, MotionPath) post Webflow's
acquisition [22][23]. License is "free-to-use", not OSS — you can't fork
it and you can't build a competing animation library on top of it, but
commercial and SaaS use are explicitly fine [22]. Core gzip is small
(community references in 23–30 KB range, latest 3.14.2 on bundlephobia)
[24]. The `useGSAP` hook handles React 19 cleanup correctly [25].

**Why GSAP matters here**: the BUILD scene already has six `@keyframes`
loops plus `animationPlayState` toggling for resting (`BuildScene.tsx`
~lines 295–671 reference: `build-hammer-swing`, `build-nail-sink`,
`build-saw-slide`, `build-sawdust`, `build-drill-press`, `build-drill-bit`,
`build-shaving`, `build-paint-stroke`, `build-paint-fill`). DEPLOY is
worse — `deploy-thrust`, `deploy-shake`, `deploy-agent-visibility`,
`deploy-ground-agent`, `deploy-box-drop`, `deploy-star-halo`. These are
*sequences*, not loops, and CSS keyframes are a bad authoring surface for
sequences. A GSAP timeline expresses them as one declarative script with
labels, easing curves, and pause/resume from a single ref.

**Motion v12** (`motion.dev`, the rebrand of framer-motion) tree-shakes
to a 2.3–2.5 KB "mini" `useAnimate` if you avoid the hybrid layout
features [26]. We're already on framer-motion 12.38.0, so this is more of
an "import smarter" win than a switch.

**Theatre.js** is in pre-1.0 (last npm publish 0.7.2, two years old; main
repo had activity in Jan 2026) [27]. Editor-driven keyframing is gorgeous
but the maintenance signal is weak for a load-bearing dependency.

**Verdict for Tier D**: GSAP for sequenced choreography (DEPLOY rocket,
INTAKE walk-cycle), keep framer-motion for layout/presence transitions
(`AnimatePresence` in `BuildScene.tsx:75`). Skip Theatre.js until 1.0.

---

## 2. Side-by-side comparison

| Tool | Approach | Bundle Δ vs current (gzipped) | Files / agent | States/transitions native | Editor required | License | Migration risk for THIS repo |
|---|---|---|---|---|---|---|---|
| Rive (`@rive-app/react-canvas`) | Vector + state machine, canvas | +~90 KB JS + ~30–80 KB per `.riv` | 1 `.riv` (shared across colors via runtime tinting) | Yes — `Number`/`Boolean`/`Trigger` inputs | Yes (free Cadet, $9/mo) [4] | MIT runtime; editor proprietary | Low — replaces one component |
| Lottie (`lottie-react` + `lottie-web`) | After Effects JSON, SVG/canvas | +~60 KB JS + 5–40 KB per `.json` | 1 file *per state* (no native FSM) | No (segment playback only) | After Effects + Bodymovin (or LottieFiles editor) | MIT [10] | Low–Medium — state matrix forces many JSONs |
| Lottie (`@lottiefiles/dotlottie-react`) | Same, WASM core via CDN | +~16–51 KB JS, WASM lazy [12] | 1 `.lottie` per state | No | LottieFiles / AE | MIT | Low; CDN dependency for WASM |
| Spine (`spine-pixi-v8`) | Skeletal + IK + mesh | +~150 KB JS + ~200–500 KB per skeleton/atlas | 1 skeleton + atlas + JSON | Yes (animation graph) | Yes — Spine Editor, paid | Spine license; runtime per-license [16] | High — Pixi.js stack + paid editor + animator |
| `@react-three/fiber` + drei + glTF rig | Full 3D | +~155 KB three + ~30–60 KB r3f + 1–5 MB rigs | 1 `.glb` per character archetype | Yes (AnimationMixer / clips) | Blender + Mixamo (rigs) | MIT | High — aesthetic + perf rewrite |
| GSAP 3.14 + `useGSAP` | Sequencing only (keep current SVG) | +~25 KB | 0 (timelines live in code) | Manually authored | No | Free-to-use, all plugins free [22][23] | Very low — keep `AgentSprite`, replace `globals.css` keyframes |

---

## 3. Specific code seams in this repo

The following lines are the surgical entry points. Numbers verified
against current files at time of writing.

- **`web/src/components/AgentSprite.tsx`** (355 lines):
  - `DIMENSIONS` table at L11–15 — any replacement runtime needs to
    accept `sm`/`md` numeric sizes.
  - Resting/active/errored derivation L32–34 — these become Rive state
    machine inputs.
  - Per-phase animation flags L50–56 — these collapse into a single
    `phase` Number input in a Rive state machine.
  - The 24 SVG groups (helmet L100–158, arms L185–223, reactor L244–256,
    legs L285–308) all retire under Tier A.

- **`web/src/components/scenes/SceneHost.tsx`** (35 lines): pure
  dispatcher, untouched by any of these changes — it forwards `phase` and
  `agents`. Whatever sprite component we plug in stays behind this seam.

- **`web/src/components/scenes/BuildScene.tsx`** (674 lines): the most
  complex scene. The `Station` / `ToolInHand` / `Target` components
  L322–671 are the *scene-level* animation that GSAP would replace. The
  `<AgentSprite>` slot at L105–110 is the seam Rive plugs into. Note the
  size-down to `sm` when 3+ agents (L84) — Rive must hit the same
  responsive breakpoint.

- **`web/src/styles/globals.css`** (546 lines): the keyframe inventory
  starts at L68 (`pulse-glow`) and runs through L537
  (`ccc-mission-sheen-sweep`). Roughly 47 of the 52 `@keyframes` rules
  are scene/sprite choreography; only `pulse-glow`, `flicker`, and a
  handful of UI-chrome animations would survive a GSAP migration.

- **`web/package.json`**: today's deps are `framer-motion ^12.38.0`,
  `react ^19.2.5`, `react-dom ^19.2.5` (verified). Adding `@rive-app/react-canvas`
  and `gsap` is two `npm install`s.

---

## 4. Recommendation: a 2-step path (with optional 3rd)

### Step 1 — Replace `AgentSprite` with a Rive character (low risk, ~3 days)

Build one `.riv` file: a single artboard with a state machine
`AgentMachine` exposing inputs `phase: Number`, `status: Number`,
`errored: Trigger`. Animate the six phase loops + idle + blocked once
inside the editor, then render via `useRive` + `useStateMachineInput`
hooks behind the same `<AgentSprite>` API the rest of the app already
consumes. Tint the sprite by passing the project hex into a Rive
"colorTint" custom property (Rive 2024 added runtime color overrides).

- **Cost**: ~90 KB gz runtime + a single ~50 KB `.riv` shared by all
  agents.
- **Files changed**: `AgentSprite.tsx` (rewrite, ~50 LOC), one new asset
  in `web/public/agents/agent-v1.riv`, `package.json` (one dep).
- **Visual gain**: smoother motion (Rive interpolates on canvas instead
  of CSS keyframes restarting on rerender), facial expressions and arm
  IK become trivial to add later, multi-agent renders share a single
  `RiveFile` instance for free.
- **Risks**: (a) requires a Rive Editor account (free tier is fine for a
  single creator); (b) accessibility — canvas isn't screen-reader
  friendly, mitigate by keeping the existing `<AgentLabel>` text.
  (c) Bundle goes from 409 KB to ~500 KB gz; budget for it.

### Step 2 — Move scene choreography to GSAP timelines (mid, 1–2 weeks)

Rewrite the scene-level loops (`BuildScene` tools, `DeployScene` rocket,
`IntakeScene` walk cycle, `TestScene` dunk-tank) as GSAP timelines
authored once per scene with labels (`"hammer-up"`, `"hammer-strike"`,
`"sawdust-fall"`). Pause/resume the timeline based on per-agent `resting`
instead of toggling `animationPlayState` on every animated node.

- **Cost**: +~25 KB gz, retires ~40 of the ~52 `@keyframes` rules in
  `globals.css`.
- **Files changed**: each `*Scene.tsx`, big chunk of `globals.css`
  deleted, `package.json` (`gsap` + `@gsap/react` for `useGSAP`).
- **Visual gain**: choreography becomes composable — you can stagger
  agents joining a bay, sequence the rocket countdown ("3-2-1-thrust"
  with text appearing in time), nest scene transitions inside agent
  movements. Today this is impossible without thrashing CSS.
- **Risks**: GSAP is free-to-use but proprietary [22] — vendor lock-in
  if they ever change terms. Mitigation: timelines are authored as
  declarative data; porting back to CSS or framer-motion is mechanical.

### Step 3 (optional, scope-permitting) — Add a Lottie "ambient" layer

If after Steps 1–2 the office still feels "engineered", drop in 2–3
free LottieFiles ambient assets per scene (steam from a coffee mug,
flickering monitor, falling code rain) as `<DotLottieReact>` decorations
behind the agents. `@lottiefiles/dotlottie-react` 0.19 is the right
choice because the WASM is fetched lazily from CDN, not bundled [12].

- **Cost**: ~20 KB gz JS + ~5–15 KB per ambient Lottie + one network
  fetch for WASM.
- **Visual gain**: ambient "life" without authoring it ourselves.
- **Risks**: CDN fetch on first paint, mitigated by self-hosting the
  WASM.

---

## 5. What to skip and why

- **Three.js / `@react-three/fiber`**: technically possible, philosophically
  off. The product is a six-room office with up to 24 agents at 60 fps and
  a deliberately flat terminal aesthetic. Switching to WebGL multiplies GPU
  memory, forces glTF rigs (1–5 MB each [20][21]) and rigging-artist
  labor we don't have, and abandons the scanline/monospace look. Spline
  and Mixamo are useful in a 3D-shop project; they don't fit here.

- **Spine 2D**: best-in-class, but the per-developer Spine Editor license
  ($69–$399 one-time) [16] plus the artist labor to rig and skin a robot
  is wrong for a side project where Rive covers ~85% of the use case for
  free. Revisit only if we hire a 2D animator.

- **DragonBones**: dead [17]. Don't touch.

- **Theatre.js**: pre-1.0, last npm publish ~2 years ago [27]. Wrong
  maturity for a load-bearing dependency. Revisit at 1.0.

- **`react-spring`**: not bad, but our problem is not the spring physics,
  it's the choreography of long sequences. GSAP timelines are the
  correct tool; adding a third animation library would just compound
  bundle and mental load.

---

## 6. Open questions for the user

1. **Authoring tooling** — are you OK adding the (free, but proprietary)
   Rive Editor to your authoring workflow, or do you want everything to
   live in the repo as code (which would push us toward "GSAP only,
   keep the SVG")?
2. **Bundle headroom** — current ~409 KB gz; is +90 KB (Rive) acceptable,
   or do we need to hit a hard ceiling? This decides Rive vs. GSAP-only.
3. **Character direction** — do you want the agents to look more
   *human/realistic* (Rive can do soft anime-leaning faces; Lottie has
   stock libraries) or more *expressive cartoon robot* (the current
   direction, just smoother)? Affects asset effort by ~5x.
4. **Per-project skinning** — today every agent is the same silhouette
   tinted by `projectColor`. Do you ever want per-project *silhouettes*
   (project-A is a courier-bot, project-B is a scientist-bot)? If yes,
   Rive's "skins" feature is the cheap way; otherwise stick with tinting.
5. **A11y / motion-reduce** — should resting/animations honor
   `prefers-reduced-motion`? GSAP has `gsap.matchMedia()` for this; Rive
   needs a manual `pause()`. Worth confirming the policy now so Step 1
   ships with it.

---

## Sources

[1] @rive-app/react-canvas on npm — https://www.npmjs.com/package/@rive-app/react-canvas
[2] @rive-app/canvas on npm — https://www.npmjs.com/package/@rive-app/canvas
[3] Snyk advisor for @rive-app/canvas — https://snyk.io/advisor/npm-package/@rive-app/canvas
[4] Rive pricing — https://rive.app/pricing
[5] Rive State Machine Inputs guide — https://help.rive.app/editor/state-machine/inputs
[6] Rive runtime state machines — https://rive.app/docs/runtimes/state-machines
[7] Optimization techniques for Rive in React (Pixel Point) — https://pixelpoint.io/blog/rive-react-optimizations/
[8] lottie-react on npm — https://www.npmjs.com/package/lottie-react
[9] lottie-web on npm — https://www.npmjs.com/package/lottie-web
[10] airbnb/lottie-web on GitHub (MIT, 31.4k stars) — https://github.com/airbnb/lottie-web
[11] lottie-web bundle-size issue (237.5 KB min / 60.5 KB min+gz) — https://github.com/airbnb/lottie-web/issues/1184
[12] @lottiefiles/dotlottie-react on npm — https://www.npmjs.com/package/@lottiefiles/dotlottie-react
[13] dotlottie-web size-limit config — https://github.com/LottieFiles/dotlottie-web/blob/main/.size-limit.cjs
[14] LottieFiles marketplace + Simple License — https://lottiefiles.com/
[15] @esotericsoftware/spine-pixi-v8 on npm — https://www.npmjs.com/package/@esotericsoftware/spine-pixi-v8
[16] Spine purchase / runtimes license — https://esotericsoftware.com/spine-purchase
[17] DragonBones / Webcraft alternatives (Slant, 2026) — https://www.slant.co/options/15725/alternatives/~dragonbones-pro-alternatives
[18] @react-three/fiber on npm — https://www.npmjs.com/package/@react-three/fiber
[19] @react-three/drei on npm — https://www.npmjs.com/package/@react-three/drei
[20] React Three Fiber vs Three.js (creativedevjobs, 2026) — https://www.creativedevjobs.com/blog/react-three-fiber-vs-threejs
[21] drei OrbitControls bundle issue #2292 — https://github.com/pmndrs/drei/issues/2292
[22] GSAP Standard License — https://gsap.com/community/standard-license/
[23] "GSAP is now completely free" (CSS-Tricks) — https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/
[24] gsap on Bundlephobia (v3.14.2) — https://bundlephobia.com/package/gsap
[25] useGSAP advanced timeline orchestration — https://gsap.com/community/forums/topic/40358-usegsap-with-advanced-timeline-orchestration/
[26] Motion bundle-size docs — https://motion.dev/docs/react-reduce-bundle-size
[27] theatre-js/theatre on GitHub — https://github.com/theatre-js/theatre
