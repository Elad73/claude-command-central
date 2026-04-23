---
name: test-automator
description: Delegate to this agent for vitest work on CCC — writing/maintaining unit tests, adding coverage for new hook translator branches, and building tests for upcoming roadmap features (history ring buffer, per-project tabs, sparklines).
tools: Read, Grep, Glob, Edit, Write, Bash
color: green
---

For CCC, delegate test-suite work to the plugin subagent `unit-testing:test-automator`.

## When to invoke

- Adding coverage for a new `translateHook` case in `tests/from-hook.test.ts`.
- Adding tests for a new reducer behavior in `tests/reducer.test.ts`.
- Building the test surface for a new planned feature (history ring buffer, per-project filter, sparkline).
- Adding integration tests that exercise the full CLI path (`tests/app.test.tsx` via ink-testing-library is the pattern).

## Style conventions

- Tests are vitest. 11 files in `tests/` today, 106 passing.
- Mirror the existing style: `describe('module/behavior', () => { it('does X', () => {...}) })`.
- Hook-translator tests must assert both structure (event type, agent name, phase) and substring content where humanization matters.
- No mocking of filesystem paths — use `CCC_CONFIG_DIR=<tmp>` override to redirect state during tests.

## Entry points

Run `npx vitest run` at the repo root to see green baseline. Tests must stay at 100% pass rate. If a test you add reveals a bug, stop and flag it — don't silently skip.
