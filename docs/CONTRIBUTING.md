# Contributing

Welcome to Claude Command Central (CCC). This project ships with a `.claude/` directory of skills and subagent pointers that tell Claude Code how this codebase expects to be worked on. If you're using Claude Code, those should activate automatically when their trigger conditions match. If you're working by hand, this doc is the short version.

## Workflow at a glance

- Read `CLAUDE.md` first. It is the authoritative source for conventions and the roadmap.
- Read `docs/STATUS.md` for current phase and in-flight work.
- For any non-trivial change, create a feature branch (`feature/…`, `fix/…`, `docs/…`, `refactor/…`, `test/…`, `chore/…`) off `main`. Never push directly to `main`.
- The repo ships three project-local skills under `.claude/skills/`:
  - **`ccc-parallel-fanout`** — Invoke when the task is "build N independent files" (e.g. a set of scenes, widgets, translators). Captures the one-subagent-per-file pattern we validated on the six theatrical room scenes. Lays down a dispatcher + stubs first, then fans out.
  - **`ccc-hook-wiring`** — Invoke when modifying `src/hooks/template.ts`, `src/hooks/from-hook.ts`, or any hook-driven feature. Codifies what Claude Code's hook lifecycle actually does (`SubagentStart` / `SubagentStop` for subagents, not `PreToolUse`), the tool→phase mapping, and the "never fail loud" contract.
  - **`ccc-scene-architecture`** — Invoke when editing `web/src/components/scenes/*` or adding a new room/phase. Captures the `SceneProps` contract, the multi-station layout rules, CSS keyframe namespacing, and how to add a new phase end-to-end.
- Trigger a skill explicitly when in doubt: `/skill ccc-hook-wiring` (or the equivalent in your client).

## Delegating to specialists

The repo wires four specialist subagent pointers in `.claude/agents/`. When Claude Code is acting on this project and the task matches, it will delegate:

- **`typescript-pro`** — advanced generics, conditional types, utility-type design. Delegate on anything shaped like "make this type precise" or "fix this type error I can't decipher". Forwards to the plugin subagent `javascript-typescript:typescript-pro`.
- **`test-automator`** — new vitest suites, fixture design, mocking strategy. Delegate when adding a hook translator test or a state-reducer test. Forwards to `unit-testing:test-automator`.
- **`debugger`** — stuck bugs where you've already tried the obvious. Delegate before thrashing for a third time. Forwards to `unit-testing:debugger`.
- **`architect-review`** — module-boundary, event-schema-evolution, or "does this belong here" questions. Delegate before committing a cross-cutting refactor. Forwards to `code-review-ai:architect-review`.

Visual / design work on `web/src/` is owned by the **`ui-designer`** plugin subagent (available globally in the user's Claude install; not re-exported here). Invoke it for palette shifts, scene polish, motion tweaks, or any "this feels ordinary" feedback.

## Keeping the server-side reducer in sync

`src/state/dashboard-reducer.ts` is a deliberate server-side duplicate of `web/src/reducer.ts`. The server uses it to maintain a derived `DashboardState` in memory so that `GET /api/snapshot` can return the full current picture to a freshly loaded browser. Because both copies consume the same event types and produce the same state shape, they must be kept in sync: any change to the event schema or the `DashboardState` shape requires updating both files together. When the shapes change, `.claude/skills/ccc-hook-wiring/SKILL.md` is the canonical reference for what the event schema implies and the right place to record the extension contract.

## Code conventions

- **TypeScript strict.** `strict: true` + `noUncheckedIndexedAccess: true`. Both are non-negotiable.
- **ESM only.** All imports end in `.js` in source (TypeScript ESM quirk). No CommonJS shims.
- **No `any`.** Use `unknown` and narrow, or write a proper type. The hook payload type in `src/hooks/from-hook.ts` is the reference pattern: a concrete interface with `[key: string]: unknown` for forward compatibility.
- **No new runtime dependencies without justification.** The install is intentionally light. If you must add one, call it out in the PR description with a one-line reason. Dev dependencies (types, tooling) are less scrutinized but still deliberate.
- **Event schema is backward-compatible.** Unknown fields are ignored, not rejected. Never break v1 feeds.
- **Graceful degradation.** Malformed events, missing feeds, narrow terminals — none of these may crash the app.

## Tests

- `vitest` is the runner. Tests live in `tests/` and mirror the `src/` layout.
- **Every change to `src/hooks/from-hook.ts` needs a test.** That file is called from the user's live Claude Code session via a hook; regressions are user-visible and fail silently by design (`process.exit(0)` on error). Tests are the only guardrail.
- Every new event-schema field needs a Zod parse test in `tests/events/schema.test.ts` (or wherever the suite lives) covering: valid value, invalid value, missing value (default/optional behavior).
- Before opening a PR:
  ```bash
  npx vitest run
  npx tsc --noEmit
  ```
  Both must pass. CI will reject otherwise.

## Build

```bash
npm install            # first time only
npm run build          # tsup → dist/, Vite → web/dist/, copy → dist/web/
./dist/bin.js --help   # smoke test
```

For web hot-reload while iterating on `web/src/`:

```bash
cd web && npx vite dev
```

Point it at a feed file (the SSE server running via `ccc serve` is the easiest path).

## Legacy

`legacy/python/` is the archived v1. It is **frozen**:

- Do not add features there.
- Do not patch bugs there — fix them in the TypeScript port instead.
- If you need v1 behavior as reference, read it; don't run it in production.

## Commits

- Branch before work, PR into `main`.
- Commit messages must describe the "why", not just the "what". Follow the style in `git log`.
- **Do not reference `Claude` or `Anthropic` in commit messages.** This is a global rule; strip any auto-generated attribution lines before committing.
- No `--no-verify`, no `--no-gpg-sign`. If a hook fails, fix the underlying issue and create a new commit.
- Prefer new commits over `--amend`. If you need to amend, make sure you're amending your own unpushed work, not someone else's.

## Questions

Open an issue, or drop a note into `docs/STATUS.md` under "Open blockers / decisions" if you're actively working and need a call.
