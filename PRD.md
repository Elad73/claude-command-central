# Claude Command Central - Product Requirements Document

## 1. Vision

Claude Command Central is a live mission-control dashboard for agentic coding workflows. It exists because modern sessions now routinely spawn subagent teams across multiple projects in parallel, and a developer has no way to see what that team is actually doing without it. The product turns an invisible, text-heavy execution stream into a glanceable 2D command office: rooms light up, agents move between phases, and a per-project mission strip answers the question "what are all these processes trying to accomplish?" at a glance. The core product is shipped and in daily use across four active projects.

---

## 2. Users and Use Cases

**Primary user:** a solo developer running agentic sessions across several projects simultaneously, who needs to know at a glance which agents are active, what phase they are in, and whether anything is blocked — without interrupting the session.

**Secondary user:** a team that wants passive visibility into what their automation is doing, surfaced as a shared browser tab.

**Use cases:**

- Observing a long-running subagent swarm across several repos without reading raw logs.
- Debugging hook wiring — confirming that `ccc init` wired the hooks correctly and that events are flowing.
- Demoing agentic workflows to stakeholders; the theatrical room animations make parallel agent activity readable to non-technical observers.
- Verifying that a finished agent is actually done and not silently stalled.

---

## 3. Scope: What It Is

### CLI subcommands

| Subcommand | Purpose |
|---|---|
| `ccc init` | Installs hook templates idempotently into a target project's `.claude/settings.json` and registers the project in the global registry. |
| `ccc serve` | Starts the Fastify server on `localhost:7777`, serves the Vite-built web dashboard, and streams events from all registered feeds via SSE. |
| `ccc watch` | Renders the Ink TUI dashboard in the terminal, tailing one or more JSONL feed files. |
| `ccc emit` | Appends a single validated event to a feed file from the command line, or translates a Claude Code hook payload from stdin via `--from-hook`. |
| `ccc demo` | Populates a feed with a scripted multi-agent, multi-phase sequence so the dashboard can be verified without a live session. |

### Web dashboard

A Vite + React + Tailwind + framer-motion single-page application, served as static files bundled into the CLI distribution. The browser connects to the Fastify server's `/events` endpoint via Server-Sent Events. The dashboard includes: a top bar showing overall flow status and progress, the Pipeline strip, the 2x3 Office grid, the Mission Strip, and the resizable Live Feed panel. The web dashboard is the primary visual surface.

### Ink TUI

`ccc watch` renders a terminal-native version of the same data using Ink and React. It is a functional secondary surface, useful when a browser is not available or when the developer prefers to stay in the terminal. It is not the primary surface for new features.

### Hook integration

`ccc init` writes seven hook entries into the target project's `.claude/settings.json`. Each hook shells out to `ccc emit --from-hook <HookName>`. A `# ccc-hook` marker is appended to every command so re-running `ccc init` can find and replace its own hooks without disturbing any user-authored hooks in the same file.

### Project registry

A JSON file at `~/.claude-command-central/projects.json` tracks all projects that have been initialized, mapping each to its slug, feed path, and working directory. `ccc serve` reads this registry at startup and can auto-reload it while running, so a new `ccc init` in another project attaches to an already-running server within seconds.

---

## 4. Scope: What It Is Not

- **No database.** The JSONL feed file is the event store. There is no persistence layer beyond that file.
- **No write-back.** The renderer is read-only relative to any project feed. Producers append; the dashboard only reads.
- **No historical replay.** The current session state is derived by replaying the feed on startup, but there is no scrubber, timeline, or playback UI. That is on the roadmap.
- **No cloud or multi-user features.** The server binds to `127.0.0.1` by default. There is no authentication. This is a local developer tool.
- **`legacy/python/` is frozen.** The Python v1 implementation in `legacy/python/` is an archived reference. It is not a parallel implementation and receives no new features.
- **No orchestration.** The product does not schedule, interrupt, or control any agent. It observes.

---

## 5. The Office Surface: Room Grid and Scenes

The office is a 2x3 grid of rooms. Each room corresponds to a workflow phase. Agents appear in the room that matches their current phase. The design principle: agents enter rooms based on the phase of the work; the room's scene expresses what that kind of work feels like.

| Room | Phase | Scene description |
|---|---|---|
| Intake | PROMPT | Agents walk lanes carrying trays from a pallet stack to a receiving table. |
| Strategy | PLAN | Seated agents at planner's desks with lit lamps; a pen sweeps documents and the agent pauses to ponder. |
| Build Bay | BUILD | A hash-picked tool per agent (hammer, saw, drill, or paint brush); tool rack mounted on the back wall. |
| Review | REVIEW | Sherlock in a wingback armchair next to a fireplace; deerstalker hat, magnifier, pipe with animated smoke. |
| QA Lab | TEST | Agents perform a stunt fall from a ceiling hatch into a safety-cushion stack, sprawl, stand, and give a thumbs-up. |
| Deploy | DEPLOY | A launch pad fires a parabolic rocket arc to a pulsing star; the delivery box is offloaded, the rocket returns, the stack grows. |

Each room has four corner occupancy lamps. A lamp lights when at least one live (non-done, non-idle) agent is in the room. Lamps fade when the room is empty or contains only resting agents. Agents in a `done` or `idle` state drop their glow, reduce opacity, and stop all animation loops so finished work reads as clearly inactive.

---

## 6. Mission Strip and Agent Identity

Below the Pipeline strip, a Mission Strip shows one card per registered project. Each card displays the project's current objective and a live/total agent count. This strip answers "what are all these agents trying to accomplish?" without requiring the viewer to decode agent bubbles.

Agent bubbles show a humanized current action derived from the raw hook payload: bash commands and tool names are translated to plain English (e.g. `npm test` becomes "Running tests", an Edit tool call becomes "Editing src/App.tsx"). The Live Feed retains the raw technical text for debugging.

Each project is assigned a short color code (e.g. `CCC`, `GB`, `DL`). Agents wear their project color so it is immediately apparent which project an agent belongs to. Room colors remain fixed to their phase identity and do not change with project.

---

## 7. Live Feed

The Live Feed panel shows a bounded stream of raw log lines from all registered projects. Each line carries a project chip using the compact short code. The panel is resizable: drag the left edge to widen or narrow it. Click the collapse toggle (`›`) to reduce it to a thin rail. Both the width and collapse state are persisted in `localStorage` so they survive page refreshes.

The feed is intentionally raw and technical. It complements the humanized agent bubbles in the Office rather than duplicating them.

---

## 8. Event Schema

Three event types, all flat JSON objects on a single JSONL line.

**Common envelope fields (all types):**

| Field | Type | Notes |
|---|---|---|
| `type` | `"flow" | "agent" | "log"` | Required. |
| `v` | number | Optional schema version. |
| `ts` | string | Optional ISO 8601 timestamp. |
| `project` | string | Optional project slug. |
| `message` | string | Optional. Any event may carry a message that appends to the Live Feed. |

**`flow`** — mutates top-level session state: `title`, `objective`, `status`, `progress` (0–100).

**`agent`** — requires `agent` (name string); optionally carries `phase`, `status`, `task`. Phase names are normalized to uppercase on ingest. Unknown fields are ignored, not rejected.

**`log`** — `message` is required. Appends directly to the Live Feed.

**Phases (in order):** `PROMPT → PLAN → BUILD → REVIEW → TEST → DEPLOY`

**Status values:** `idle`, `active`, `blocked`, `done`, `error`

Backward compatibility is non-negotiable: consumers must treat unknown fields as ignored rather than invalid.

---

## 9. Hook Integration Details

`ccc init` installs the following seven hooks into `.claude/settings.json`:

| Hook | What it captures |
|---|---|
| `SessionStart` | Emits a `flow` event marking the session as running and places the main agent in PROMPT/idle. |
| `UserPromptSubmit` | Captures the prompt text; emits a `flow` event updating the objective and an `agent` event marking the agent active in PROMPT. |
| `PreToolUse` | Emits an `agent` event with a heuristic phase and humanized task description derived from the tool name and input. |
| `PostToolUse` | Emits a `log` event confirming the tool completed. |
| `SubagentStart` | Emits an `agent` event creating a new card for the subagent, with its phase inferred from its `agent_type` name. |
| `SubagentStop` | Emits an `agent` event marking the subagent done and a `log` event confirming completion. |
| `Stop` | Emits a `flow` event marking the session done at 100% progress and moves the main agent to DEPLOY/done. |

**Known gotcha:** `PreToolUse` and `PostToolUse` do NOT fire for the `Agent` / `Task` tool. Subagent visibility relies entirely on `SubagentStart` and `SubagentStop`. Any feature that assumes tool-level hooks cover subagents will silently miss all subagent activity.

Tool-to-phase mapping is heuristic. Read/Grep/Glob/WebFetch/WebSearch/TodoWrite map to PLAN; Edit/Write/NotebookEdit/Bash/ExitPlanMode map to BUILD. Unknown tools default to BUILD.

Subagent-type-to-phase inference pattern: names matching `test|qa|automator` → TEST; `review|audit|critic|security-auditor|debug` → REVIEW; `deploy|cloud|release|devops` → DEPLOY; `architect|planner|explore|research|docs-architect|tutorial` → PLAN; everything else → BUILD.

The `--from-hook` path must never fail loud. A hook that exits non-zero can interrupt a user's coding session. Parse errors, missing fields, and unknown hook names all produce empty output, not an error exit.

The env var `CCC_HOOK_DEBUG=1` tees raw hook payloads to `~/.claude-command-central/hook-debug.jsonl` for diagnosing wiring issues without touching the main feed.

---

## 10. Non-Goals for v2

- No multi-user authentication or access control.
- No cloud persistence or remote telemetry export.
- No historical replay or event scrubbing. A bounded ring buffer with replay is on the roadmap but is not in scope for the current release; it will not require a database when it arrives.

---

## 11. Constraints

- TypeScript strict mode with `noUncheckedIndexedAccess` is non-negotiable. Zero `any` allowed.
- ESM-only module format throughout.
- Node 20+ minimum runtime.
- All runtime dependencies must be justified. The install footprint is intentionally light.
- Hook commands must never exit non-zero or write to stderr in a way that blocks the user's coding session.
- The JSONL event schema must remain backward-compatible: adding fields is safe, removing or renaming is not.
- Malformed events, missing feed files, and narrow terminals must not crash either surface.
- `legacy/python/` is frozen. Port features out; do not patch it.

---

## 12. Quality Bars

| Dimension | Bar |
|---|---|
| Build time | Under 1 second (`tsup` CLI build + `vite` web build). |
| Test suite | 98+ tests passing across 11 test files (`npm test`). |
| Type check | `tsc --noEmit` clean; no `any` escapes. |
| Multi-project load | Dashboard must handle 4+ simultaneous registered projects without visual regression or SSE backpressure. This is validated against the current four-project registry in active daily use. |
| Hook reliability | `ccc emit --from-hook` must exit 0 under all input conditions, including empty stdin, malformed JSON, and unknown hook names. |

---

## 13. Roadmap (Post-MVP)

- **Bounded event history ring buffer with replay scrubber** — retain a fixed window of past events per project so the dashboard can show what happened before the current viewport without requiring a database.
- **Per-project tab filtering** — add tab navigation so the operator can focus on one project's office view at a time; currently all projects share one undivided office grid.
- **Sparkline widgets** — per-room throughput sparklines showing event rate over the last N seconds, complementing the occupancy lamps.
- **npm publish** — publish as `claude-command-central` on npm so installation becomes `npm install -g claude-command-central` instead of `npm link` from a local clone.

---

## 14. Design Principles

These rules emerged from building and operating the product; they are not aspirational.

**One-way pipe.** Producers append to the JSONL feed; the renderer reads only. The renderer never writes. This separation makes it safe to have multiple watchers on the same feed and keeps the event store simple.

**Verify hook behavior empirically before building on it.** The `Agent`/`Task` tool does not fire `PreToolUse` or `PostToolUse`. Assuming hook coverage that does not exist in practice leads to silent gaps in the dashboard that are hard to debug after the fact. Always confirm against observed behavior, not documentation alone.

**Prefer parallel subagent fan-out for independent file-level tasks.** Sequential orchestration is slower and consumes more context than dispatching independent tasks to parallel subagents. The dashboard was designed specifically to make this fan-out legible, not to accommodate a sequential mental model.

**Agent activity state must be visually unambiguous.** A done agent must not look like an active one. Glow, opacity, and animation loops are all stripped from agents in `done` or `idle` status. Ambiguity about whether work is still happening is the core problem the product exists to solve; the UI cannot introduce the same ambiguity it is supposed to eliminate.

**Rooms must read as live or dormant at a glance.** Occupancy lamps exist precisely so a viewer does not need to read agent names to know whether a room has active work. Lamp state tracks live agents only; resting agents do not keep a room lit.
