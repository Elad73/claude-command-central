# Project Status

Last updated: 2026-04-25

## Current Phase

**MVP shipped — tagged `v0.1.0` on private GitHub repo `Elad73/claude-command-central`.** The TypeScript + Ink + React (web) dashboard tails Claude Code hook events from multiple projects simultaneously. Build is green, **131 tests pass**, four projects currently wired into the registry. Repo is clone-and-activate ready: README, LICENSE, PRD, SECURITY, CONTRIBUTING all in place, project-level skills + agent pointers + slash commands ship in `.claude/`.

## What's running

- **`ccc serve`** on `localhost:7777` — Fastify server streaming SSE from all registered feeds, serving a Vite-built web dashboard.
- **`ccc watch`** — the original Ink TUI, still wired and functional.
- **`ccc init`** — idempotent hook installer; writes `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, **`SubagentStart`**, `SubagentStop`, `Stop` hook templates into a target project's `.claude/settings.json` with a `# ccc-hook` marker so it's safe to re-run and preserves user-authored hooks.
- **`ccc emit --from-hook`** — reads Claude Code hook stdin, translates to events, never fails loud.

## Registered projects

See `~/.claude-command-central/projects.json`. Currently: `claude-command-central`, `gmail-board`, `daily-logger`, `expense-tracker`.

## Recently completed (post-MVP)

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

## Open blockers / decisions

- None. The dashboard is observing live sessions across four projects.

## Next up

- **Bounded event history ring buffer** with a replay scrubber.
- **Per-project tab filtering** in the dashboard (currently all projects share one office).
- **Sparkline widgets** for per-room throughput.
- **Distribution** — publish to npm as `claude-command-central` so install becomes `npm install -g` instead of `npm link`.

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
