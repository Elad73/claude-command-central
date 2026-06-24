# Project Status

Last updated: 2026-06-24 (theming pass merged: theme system, scene fixes, hammer/nail, theme-aware robot color)

## ⚓ Rollback baseline — `v0.1.1`

**If anything breaks, this is the proven good state. One command to recover:**

```bash
git reset --hard v0.1.1
git push -f origin main   # private repo, force push is safe
```

`v0.1.1` is the post-MVP, pre-animation-revamp checkpoint. Includes everything:
mission strip + hover popover, snapshot-on-refresh, stale-agent GC, mission
completion celebration, sprite size caps, project-level slash commands. SVG
humanoid renders correctly in all six rooms. Tests 131/131. Build clean.

The Rive integration attempt (`marty.riv`, `AgentRender`, GSAP migration of
Intake/Strategy) was reverted on 2026-04-26 — the placeholder asset was the
wrong aesthetic and shipped without browser-verified rendering. Lesson logged
in `docs/ANIMATION_RESEARCH.md`. Don't ship visual changes without a real
preview again.

## Current Phase

**Design / theming pass — merged to `main` (PRs #7, #8, #9).**
Shipped: a runtime theme system (3 switchable, persisted themes neon-noir / amber-crt
/ clay) as a single source of truth + top-bar switcher + `prefers-reduced-motion`;
screenshots + README gallery; and verified scene fixes — Sherlock hat attached to the
head, build-bay header no longer occluded by the tool rack, clay reworked to a
readable warm-dark "terracotta dusk", QA-lab stunt-fall redesigned (upright feet-first
landing into an enlarged crash mat; fixed a `translateY(%)` fall-distance bug), the
build-bay hammer now strikes down onto the nail, and **theme-aware robot color** (hues
remapped into each theme's band). Every visual change browser-verified before commit.

Workflow now: one small branch per batch → PR → merge. Remaining design work in
`docs/SCENE-DEFECTS.md`: per-room set dressing, robot sprite quality, and two bugs
found in live use — ghost agents from un-closed sessions (`K-PIT-004`) and a
framer-motion `<circle> r` console error. Live single-port server (`node dist/bin.js
serve`) runs on :7777 watching the registry feeds. Typecheck clean; tests 131/131.

> Re-learned the post-Rive lesson the hard way: the clay theme was first committed
> after a single glance and shipped unreadable. Now re-verifying every visual change
> in the browser before claiming done.

**Prior:** Humanoid + room revamp shipped to `main` (sprite chrome, room
atmospherics, motion polish). Tests 131/131, build green. Ready for `v0.2.0` tag.

Background: the dashboard is a TypeScript + Ink + React (web) stack tailing
Claude Code hook events from multiple projects simultaneously. Repo is
clone-and-activate ready: README, LICENSE, PRD, SECURITY, CONTRIBUTING all in
place, project-level skills + agent pointers + slash commands ship in
`.claude/`. Six projects currently wired into the registry.

## What's running

- **`ccc serve`** on `localhost:7777` — Fastify server streaming SSE from all registered feeds, serving a Vite-built web dashboard.
- **`ccc watch`** — the original Ink TUI, still wired and functional.
- **`ccc init`** — idempotent hook installer; writes `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, **`SubagentStart`**, `SubagentStop`, `Stop` hook templates into a target project's `.claude/settings.json` with a `# ccc-hook` marker so it's safe to re-run and preserves user-authored hooks.
- **`ccc emit --from-hook`** — reads Claude Code hook stdin, translates to events, never fails loud.

## Registered projects

See `~/.claude-command-central/projects.json`. Currently: `claude-command-central`, `gmail-board`, `daily-logger`, `expense-tracker`.

## Recently completed (post-MVP)

- **Runtime theme system + scene-defect round 1** *(2026-06-23, branch — PR pending)* — single-source-of-truth theme registry (`web/src/theme/`) with three switchable, localStorage-persisted themes (neon-noir / amber-crt / clay); `ThemeProvider` overrides Tailwind `--color-*` at runtime and feeds `phaseHex` to rooms; TopBar switcher; named easing tokens + `prefers-reduced-motion`. Screenshots + README gallery. Scene fixes: deerstalker hat moved into the sprite head group so it tracks the head-scan (was a detached overlay); build-bay tool rack moved below the room header; clay reworked from a broken light palette into a readable warm-dark "terracotta dusk". Remaining work tracked in `docs/SCENE-DEFECTS.md`. All fixes browser-verified before commit.
- **Mission card redesign — deep substrate + accent rail + engraved badge** *(2026-04-27)* — replaced the saturated project-tinted card body with a deep ink substrate (`ink-900`/`ink-800`). Per-project hue now lives only on a 4 px neon-cored left rail, the badge glyph, and a 2.4 s breathing halo whose peak alpha is capped at `${color}55` (down from the prior `${color}AA`/`${color}DD` washes that drowned the body text). Real elevation comes from a 4-layer shadow stack (top-rim highlight, bottom inner shadow, floor hairline, drop). Badge moved from a flat tinted tile to an engraved plate sitting INTO the card, with the glyph in the project hue rather than white. Type hierarchy realigned so the objective body is the brightest element on the card. External component contract unchanged. Captured as `K-PAT-002` (substrate-flip pattern) and `K-PIT-002` (the `npm run build:web` ≠ deployable artifact gotcha that cost a debug round-trip during this work). Browser-verified before commit per the post-Rive lesson.
- **Mission strip — running emphasis + stale-card filter** *(2026-04-27)* — running mission cards (any project with `counts.live > 0`) now render with a static multi-tone gradient in the project hue, a 4 px left-edge accent stripe with neon drop-shadow, and a soft static halo. White text + heavy black text-shadow keeps the typography sharp over the saturated fill. The strip is now strictly "what's happening right now" — completed missions linger 4 s for the celebration burst then drop off entirely; the header counter (`N RUNNING · N DONE`) owns the historical tally. New `.claude/knowledge/` knowledge base bootstrapped with three entries (motion-vs-static dashboard pattern, `CLAUDE_CONFIG_DIR` migration pitfall, `.claude.json` per-project state quirk).
- **Subagent team visibility** — `SubagentStart` / `SubagentStop` hooks emit a dedicated agent card per subagent using `agent_type` as the name and auto-routing to a phase based on the subagent's role (`*-reviewer` → REVIEW, `*-test*` → TEST, `*-architect`/`explore` → PLAN, etc.). Each teammate shows up in the office under its own name.
- **Humanized task text** — bash commands and tool calls are translated into plain English for the thought bubbles (e.g. `npm test` → "Running tests", `git commit` → "Committing"), while the Live Feed keeps the raw technical text.
- **Per-project agent colors** — agents wear their project color (hex-stable short codes like `CCC`, `GB`, `DL`); rooms keep their phase color for identity.
- **Room occupancy lamps** — four corner lamps light only when at least one live agent is in the room; fade when the room is empty or only has resting agents.
- **Resting-agent dim state** — `done`/`idle` agents drop glow + opacity + all loops, so finished teammates read as clearly inactive.
- **Theatrical per-room scenes** (`web/src/components/scenes/*`) — each phase has its own animation:
  - INTAKE: agents walk lanes carrying trays from pallet to receiving table.
  - STRATEGY: seated at planner's desks with lamps, pen sweeps + ponder cycle.
  - BUILD: hash-picked tool per agent (hammer / saw / drill / paint), tool rack on back wall.
  - REVIEW: Sherlock in a wingback armchair, fireplace, deerstalker, magnifier + pipe with smoke.
  - TEST: stunt-fall from ceiling hatch into safety-cushion stack, splash → sprawl → stand → thumbs-up.
  - DEPLOY: launch pad + parabolic rocket arc to a pulsing star, box offloaded, returns, stack grows.
- **Mission Strip** — per-project mission cards under the Pipeline showing each project's current objective + team size (live / total). Agent bubbles stay tactical; this strip answers "what are they trying to accomplish?".
- **Resizable, collapsible Live Feed** — drag the left edge to widen/narrow; click `›` to collapse to a thin rail. Width + collapse state persist in `localStorage`. Project chips in the feed use compact short codes.
- **Warm-up button** — one click runs a demo agent through every room sequentially so you can verify animations + lamp cycling without needing a real session.
- **Hook debug sidecar** — `CCC_HOOK_DEBUG=1` env var tees raw hook payloads to `~/.claude-command-central/hook-debug.jsonl` for future investigations.
- **Cleanup pass** — dead `Task`-tool branches removed from `PreToolUse`/`PostToolUse` (Claude Code doesn't fire those hooks for `Agent`/`Task`). Unused `chokidar` dep removed. Data entries pruned. 98/98 tests green.
- **Stale-agent GC** — agents whose status is `done` or `idle` and whose `updatedAt` is more than 60 seconds old are automatically despawned. The exit uses the existing framer-motion exit animation. Runs client-side every 15 seconds. Applies to both subagents (finished via `SubagentStop`) and the main agent (finished via `Stop`). The server-side snapshot is pruned by the same logic so a fresh browser load never inherits ghost agents.
- **Snapshot-on-refresh (hydration)** — a new `GET /api/snapshot` endpoint returns the full derived `DashboardState` (flow, per-project missions, current agents, recent log lines). The Fastify server maintains this state in memory through the same reducer logic the browser uses. On mount or refresh the browser fetches `/api/snapshot` first and hydrates its state, then subscribes to the SSE `/events` stream for live deltas. Eliminates the "everything is blank until a new prompt fires" experience after a page refresh.
- **Mission hover popover** — full-mission detail card on hover, rendered via a React portal to `document.body` so it paints above Room stacking contexts (which were occluding the in-flow tooltip). Shows full project slug, complete objective text, status pip, team count, progress %, and a relative-time stamp.
- **Mission completion signal** — completed missions persist on the strip with a green ✓ badge, **DONE** pill, and a footer line `✓ duration · agents · actions`. Sorted running-first then by `completedAt` desc, capped at 8 visible. Running→done transition fires a one-shot celebration: scale spring + portaled particle burst + diagonal sheen sweep across the card. Snapshot hydration seeds the celebrated set so the burst doesn't replay on refresh.
- **TopBar aggregate state** — replaces the single-flow status field with `ALL CLEAR · N complete` when nothing is running, or `X running · Y done` otherwise. Lets a returning user read the whole picture from the chrome.
- **Mission lifecycle tracking** — `ProjectMission` now carries `startedAt`, `completedAt?`, and `actionCount`. The reducer latches `startedAt` on first running event, `completedAt` on the running→done transition (never overwritten), and increments `actionCount` for every project-tagged event. A new running event after done resets the lifecycle. Mirrored on the server-side reducer; snapshot-parity invariant preserved (round-trip JSON test still green).
- **Project-level slash commands** — four imported and adapted from `expense-tracker`: `/feature`, `/bug-fix`, `/wake-up`, `/wrap-up`. Each routes work to the project-local skills (`ccc-parallel-fanout`, `ccc-hook-wiring`, `ccc-scene-architecture`) and delegate-pointer agents. Six FinPilot-specific commands intentionally not imported (named-agent pipeline + GitHub-label task tracker — scaffolding CCC doesn't have).
- **Public release prep** — repo published privately to `Elad73/claude-command-central` on GitHub. History rewritten to use personal identity (`Elad73 <elad.ron.g@gmail.com>`) on all commits. Tagged `v0.1.0` as MVP-ready release.
- **Humanoid + room revamp** — three-pass visual upgrade merged into `main`
  via squash commits. Pass 1 sprite chrome (status-aware visor HUD, rim
  light, ground shadow, breathing, joint highlights). Pass 2 room
  atmospherics (perspective floor grid, volumetric light wash, ambient
  particles per phase). Pass 3 motion polish (distinct done/error rest
  poses, walking gait with bob in INTAKE, hammer-strike head dip + shoulder
  counter-rotate in BUILD, cubic-bezier easing across loop keyframes). All
  three passes Playwright-MCP-verified before commit.

## Open blockers / decisions

- None. All three passes of the humanoid + room revamp shipped to `main`
  via squash commits. Ready for `v0.2.0` tag.

## Next up

### Other queued work

- **Bounded event history ring buffer** with a replay scrubber.
- **Per-project tab filtering** in the dashboard (currently all projects share one office).
- **Sparkline widgets** for per-room throughput.
- **Distribution** — publish to npm as `claude-command-central` so install becomes `npm install -g` instead of `npm link`.
- **(Optional) Humanoid pose pass 4** — split the SVG arm group at the
  elbow so the DONE pose can render true crossed-arms-at-chest instead of
  the rigid stand-down approximation. Same approach for finer gait IK.

### Reference: Humanoid + room revamp passes (✅ all merged)

Three independently-shippable passes — each previewed via Playwright MCP
before commit, each reversible to `v0.1.1`.

- **Pass 1 — Humanoid sprite v2.** ✅ Squashed onto `main` (commit 74a5897).
  - Status-aware visor HUD: active scan beam, done check + halo, error red
    bars + bold `!` glyph, idle pulsing center eye.
  - Lit-from-above rim gradient on helmet, shoulders, chest, limbs, hip plate.
  - Soft ground shadow ellipse under the boots (tighter pool when resting).
  - Slow `sprite-breathing` scaleY on the upper-body group when resting.
  - Joint highlight specs on shoulders, elbows, knees + boot toe rim.
  - Helmet vents enriched (3 slats per side instead of 1).
  - Diagonal chest seams, reactor inner ring, helmet center crest seam.
  - Fixed pre-existing React 19 warning on right-leg `animation` shorthand.
- **Pass 2 — Room atmospherics.** ✅ Squashed onto `main` (commit 020a037).
  - New shared `<Atmosphere phase color />` component (web/src/components/scenes/Atmosphere.tsx).
  - Three additive layers: perspective floor grid, volumetric light wash
    (anchored per phase: REVIEW lower-left fireplace, STRATEGY top lamp,
    DEPLOY upper-right star, etc.), and ambient particles tuned per phase
    (PROMPT dust drift, PLAN thought sparks rising, BUILD welder sparks,
    REVIEW embers, TEST bubbles, DEPLOY twinkling stars).
  - Wired into all 6 scenes via a single new line at the top (5 of 6 scene
    edits fanned out to parallel subagents, one file each).
  - 5 new keyframes + 1 light-breathe loop. Pointer-events disabled on the
    whole stack so it never blocks scene chrome.
  - Verified: 131 tests pass, typecheck clean, build green.
- **Pass 3 — Motion polish + transitions.** ✅ Squashed onto `main` (commit af99a54).
  - Distinct **done pose**: both arms rotate ~52° to a "stand-down" position
    (700ms cubic-bezier-with-overshoot settle, then holds via `forwards`).
    True crossed-arms requires elbow bend in the SVG (deferred).
  - Distinct **error pose**: head + body slump forward (~14–20°) with a
    600ms cubic settle; arms hang slightly outward. Reads as "broken/defeated"
    instantly, not just "red eyes."
  - **Walking gait** in INTAKE — replaces the slide-translate-only
    `intake-walk` with `intake-walk-v2` that adds vertical bob on each step
    + rotational tilt at the lane endpoints. Drives with a real cubic-bezier
    so the strides feel weighted.
  - **Secondary motion** on BUILD: `build-head-dip` keyframe synced with the
    1.4s arm-swing strike, plus `shoulder-counter` so the upper body rocks
    opposite to the arm. Sells the hammer's weight.
  - **Cubic-bezier easing** on `arm-swing-left/right` (replaces ease-in-out)
    and on the new pose-cross / pose-slump animations (overshoot easing for
    a deliberate-but-natural settle).
  - Verified: 131 tests pass, typecheck clean, build green. Gallery
    screenshots show distinct silhouettes for active / done / idle / error.

Verification loop per pass: baseline screenshot → write code → comparison
screenshot → ship or iterate. No blind commits.

## Quick reference

```bash
# From this repo
npm install && npm run build && npm link

# In any target project
cd ~/your-project
ccc init                                               # one-time — installs hooks
ccc serve                                              # web dashboard on :7777
# or
ccc watch --feed ~/.claude-command-central/feeds/your-project.jsonl   # Ink TUI
```

- Tests: 131 across 14 files (`npm test`)
- Build: tsup + vite → `dist/` + `web/dist/` → copied to `dist/web/` for bundled serve
- CLI entry: `dist/bin.js`
- Config override: `CCC_CONFIG_DIR=/custom/path`
- Hook debug: `CCC_HOOK_DEBUG=1`

## Tech stack

Node 20+, TypeScript 6 (strict, `noUncheckedIndexedAccess`), Ink 7 + React 19 (TUI), Vite + React 19 + Tailwind 4 + framer-motion (web), Commander 14, Zod 4, Fastify 5 + `@fastify/static` + `@fastify/cors`, Vitest 4. Tsup for the CLI build.

## Repo layout

```
claude-command-central/
├── src/
│   ├── bin.ts                         # CLI entry
│   ├── cli/                           # watch · serve · emit · demo · init
│   ├── events/                        # types + zod + FeedReader + MultiFeedWatcher
│   ├── state/                         # reducer + TUI state shapes (dashboard-reducer.ts mirrors web/src/reducer.ts)
│   ├── hooks/                         # Claude Code hook translator + settings template
│   ├── app/                           # Ink TUI (ccc watch)
│   ├── server/                        # Fastify SSE server (ccc serve)
│   └── config/                        # paths + project registry
├── web/
│   └── src/
│       ├── App.tsx
│       ├── components/                # TopBar, Pipeline, Office, Room, LiveFeed, MissionStrip, …
│       │   └── scenes/                # Intake, Strategy, Build, Review, Test, Deploy + SceneHost
│       ├── hooks/useEventStream.ts
│       ├── reducer.ts + types.ts
│       └── styles/globals.css
├── tests/                             # 11 files, 98 tests (vitest)
├── docs/STATUS.md
├── legacy/python/                     # v1, frozen
├── CLAUDE.md · PRD.md · README.md
└── package.json · tsconfig.json · tsup.config.ts
```
