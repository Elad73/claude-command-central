# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Claude Command Central is a terminal-native dashboard that renders an agentic workflow as a live 2D "command office" (rooms, agents, pipeline strip, event feed). It is currently mid-rewrite from stdlib Python (v1) to TypeScript + Ink + React (v2). See `PRD.md` for the full product spec and `README.md` for user-facing docs.

## Status

- **Root** — v2 TypeScript package, **scaffolded only**. Commands are registered but not yet implemented.
- **`legacy/python/`** — working Python v1, archived. Do not add features here; it is a reference/rollback only.

The JSONL event schema is stable across v1 and v2.

## Tech Stack (v2)

- Node 20+, ESM
- TypeScript (strict) built with `tsup`
- `ink` + `react` for TUI rendering
- `commander` for CLI parsing
- `zod` for runtime event validation
- `chokidar` for file watching
- `vitest` + `ink-testing-library` for tests

## Common Commands

```bash
npm install              # one-time
npm run build            # compile src/ to dist/ (writes executable dist/bin.js)
npm run dev              # tsup --watch
npm run ccc -- watch     # run via tsx without building
npm test                 # vitest run
npm run typecheck        # tsc --noEmit
./dist/bin.js --help     # smoke test built binary
```

## Architecture (v2, in progress)

The product is a single Node CLI that exposes four subcommands (`watch`, `emit`, `demo`, `init`). The design mirrors v1: **one-way pipe** — producers append JSON lines to a feed file, the renderer tails and re-renders. The renderer never writes to the feed.

Module layout:

- `src/events/` — event types, Zod schemas, `EventFeed` byte-offset tailer.
- `src/state/` — `FlowState`, `AgentState`, pure reducer over events.
- `src/app/` — Ink React components composing the dashboard.
- `src/cli/` — subcommand wiring (`watch`, `emit`, `demo`, `init`).
- `src/bin.ts` — CLI entry, registers commands via `commander`.

### Canonical lookup tables

`PHASES` (ordered: `PROMPT → PLAN → BUILD → REVIEW → TEST → DEPLOY`), `ROOMS`, and `ROOM_BY_PHASE` live in `src/events/types.ts`. Adding a phase requires updating all three together.

### Event Schema

Three event types, all flat JSON objects on a single line:

- `flow` — mutates `FlowState` (title, objective, status, progress 0-100).
- `agent` — requires `agent` name; mutates that agent's phase/status/task.
- `log` — appends `message` to the bounded live feed.

Any event may carry an optional `message` field, which logs in addition to the type-specific effect. Events will also support optional `v` (schema version), `ts` (ISO8601), and `project` (slug) fields.

Phase names are normalized to uppercase on ingest.

## Integration Pattern (planned)

`ccc init` (to be implemented) edits the target project's `.claude/settings.json` to add hooks (`SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`) that shell out to `ccc emit` with the hook stdin. Users get a drop-in experience: install once, `ccc init` per project, `ccc watch` to observe.

## Conventions

- TypeScript strict mode is non-negotiable. `noUncheckedIndexedAccess` is on.
- All runtime dependencies must be justified — keep the install light.
- Keep the event schema backward-compatible: treat unknown fields as ignored rather than invalid.
- Preserve graceful degradation: malformed events, missing feeds, and narrow terminals must not crash.
- `legacy/python/` is frozen. Port features out of it, don't patch it.
- Before committing, strip any mention of Claude or Anthropic from commit messages (global user rule).

## Roadmap (in order)

1. ✅ Scaffold TS package, archive Python v1.
2. ✅ Formalize event schema (`v`, `ts`, `project`) + Zod validation + port state reducer.
3. ✅ Multi-feed watcher (`MultiFeedWatcher`) + `FeedReader` with partial-line buffering, prefix-hash replacement detection.
4. ✅ Ink renderer — Header, Pipeline, Roster, Office (2×3 rooms), LiveFeed; wired to `ccc watch`.
5. ✅ Project registry + `ccc init` + Claude Code hook templates (with CCC marker for idempotent re-run; preserves user-authored hooks).
6. ✅ `ccc emit --from-hook` — reads Claude Code hook JSON from stdin, maps tools → phases, never fails loud (protects the user's Claude session).
7. Timeline history buffer + sparkline widgets (polish).
