---
name: ccc-hook-wiring
description: Use when modifying `src/hooks/template.ts`, `src/hooks/from-hook.ts`, or adding hook-driven features. Captures what this repo learned about Claude Code's hook lifecycle — especially the non-obvious gap in `PreToolUse` / `PostToolUse` coverage for the `Agent`/`Task` tool, and the idempotency + non-breaking contracts hooks must uphold.
---

<objective>
Wiring new hook-driven behavior in CCC without falling into the three traps this repo hit during its v2 build: (1) assuming the wrong hooks fire for subagents, (2) forgetting to re-run `ccc init` after changing hook templates, (3) accidentally making hooks fail loud and breaking the user's Claude session.
</objective>

<critical_facts>
- **`PreToolUse` / `PostToolUse` do NOT fire for the `Agent`/`Task` tool.** Any "the main Claude is dispatching a subagent" logic hung off these hooks is dead code. Subagent visibility comes in via `SubagentStart` and `SubagentStop`, whose payloads include `agent_id`, `agent_type`, `agent_transcript_path`, and (for Stop) `last_assistant_message`.
- The tool → phase heuristic lives in `TOOL_PHASE` in `src/hooks/from-hook.ts`. `BUILD` for authoring/execution (Edit, Write, Bash, NotebookEdit), `PLAN` for investigation/research (Read, Grep, Glob, WebFetch, WebSearch, TodoWrite). Extend this map when adding a new tool — the fallback is `BUILD`.
- The humanized task text (`summarizeTool` + `humanizeBash`) goes to agent bubbles; the Live Feed shows raw post-tool summaries. Keep the two layered: humanize for bubbles, redact for feed (`redactSensitive` exists — see `src/hooks/from-hook.ts`).
</critical_facts>

<workflow>
1. **Read first.** Before editing, scan:
   - `src/hooks/template.ts` — the hook names installed and the `# ccc-hook` marker.
   - `src/hooks/from-hook.ts` — the translator: `translateHook(hookName, payload, options)` is the single entry point.
   - `tests/from-hook.test.ts` — the contract for the translator. If you change its behavior, update the tests.

2. **Adding a new hook name.**
   - Add it to `ClaudeHookName` + `HOOK_NAMES` in `src/hooks/template.ts`.
   - Add a case to `translateHook` in `src/hooks/from-hook.ts`.
   - Add a test in `tests/from-hook.test.ts`.
   - **Re-run `ccc init` in every registered project** so their `.claude/settings.json` picks up the new hook. Projects registered before the change won't get it otherwise.

3. **Adding a new tool → phase mapping.**
   - Extend `TOOL_PHASE` in `src/hooks/from-hook.ts`.
   - If the tool's `tool_input` shape is new, extend `summarizeTool` so the agent bubble reads something human-friendly (follow existing patterns: `Edit` → "Editing X", `Grep` → "Searching for X").

4. **Sensitive-data handling.** Any code path that writes to the feed from `tool_input.command` or user prompts MUST go through `redactSensitive`. This is defense-in-depth for screenshots / browser views of the feed. Do not bypass it.

5. **Failure contract — the most important rule.** Hooks MUST NEVER fail loud. Every translator path and emit path is wrapped in `try/catch` with `process.exit(0)` on any error. A thrown exception in a hook breaks the user's Claude session. When adding new logic, preserve this contract. Validate via: throw deliberately in your new case, run `echo '{}' | ccc emit --from-hook <name> --feed /tmp/x.jsonl --project test`, confirm exit code is 0 and stderr is silent.

6. **Debugging: turn on the sidecar.** Export `CCC_HOOK_DEBUG=1` in the shell before your Claude Code session starts, then watch `~/.claude-command-central/hook-debug.jsonl` to see the raw payloads Claude Code is actually sending. Invaluable when a hook looks broken — the first question is always "is Claude Code even firing it?".
</workflow>

<gotchas>
- A fresh Claude Code session is required to pick up a changed `.claude/settings.json`. Running `ccc init` updates the file, but a session that was already open is still using its own loaded config.
- `SubagentStart` was added to CCC on 2026-04-20. If you see an older `.claude/settings.json` that lacks it (six hooks instead of seven), run `ccc init` in that project — the marker-based merge is idempotent and preserves user-authored hooks.
- `tool_name: 'Task'` still appears in older hook payloads — it was renamed to `Agent` in Claude Code 2.1.63 and kept as an alias. Your code should match either; the helpful thing is that neither one fires `PreToolUse` / `PostToolUse`, so it's moot.
</gotchas>

<references>
- Memory: `~/.claude/projects/-home-eladr-personal-space-playground-claude-command-central/memory/hook-behavior.md`
- `src/hooks/from-hook.ts`, `src/hooks/template.ts`
- Tests: `tests/from-hook.test.ts` — 14+ cases covering the full translator.
</references>
