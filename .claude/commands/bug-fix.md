---
name: bug-fix
description: Bug fix workflow for Claude Command Central. Reproduce, root-cause, regression-test, fix, verify, PR.
arguments:
  - name: bug
    description: "Bug description or GitHub issue number (e.g., #42 or 'Hook payload crashes on missing tool_input')"
    required: true
---

# Bug Fix Workflow - Claude Command Central

Read `CLAUDE.md`, `docs/STATUS.md`, and `docs/CONTRIBUTING.md` before touching code.

## Input parsing

```bash
BUG_INPUT="$ARGUMENTS.bug"

if [[ "$BUG_INPUT" =~ ^#?[0-9]+$ ]]; then
  ISSUE_NUMBER="${BUG_INPUT#\#}"
  IS_LINKED=true
  gh issue view $ISSUE_NUMBER --json number,title,state,labels,body
else
  BUG_DESCRIPTION="$BUG_INPUT"
  IS_LINKED=false
fi
```

## Phase 1: Reproduce

- If issue-linked: confirm the report still reproduces against `main`.
- If standalone: write down minimal repro steps. For TUI / web bugs, note terminal size or browser.
- Build a failing test **first** when feasible — vitest is the harness.

```bash
npx vitest run                  # establish baseline
git checkout main && git pull
```

## Phase 2: Root-cause

CCC's data flow is a one-way pipe: producer (Claude Code hook) -> JSONL feed -> `FeedReader` -> reducer -> Ink TUI / Fastify SSE / web reducer. Bugs typically live in one of:

| Symptom | Likely surface | Reference |
|---|---|---|
| Wrong agent room / phase mapping | `src/hooks/from-hook.ts` (tool -> phase) | `.claude/skills/ccc-hook-wiring/SKILL.md` |
| Event ignored or rejected | `src/events/*.ts` (Zod schema) — remember unknown fields ignore, not reject | `CLAUDE.md` event-schema notes |
| TUI render glitch | `src/app/*` (Ink components) | `tests/app.test.tsx` is the integration entry |
| Web visual glitch / scene bug | `web/src/components/scenes/*` | `.claude/skills/ccc-scene-architecture/SKILL.md` |
| Dashboard hydrates blank after refresh | snapshot drift between `web/src/reducer.ts` and `src/state/dashboard-reducer.ts` | `docs/CONTRIBUTING.md` "Keeping the server-side reducer in sync" |
| Hooks crash a target project's Claude session | `src/hooks/from-hook.ts` — must `process.exit(0)` on error | `.claude/skills/ccc-hook-wiring/SKILL.md` |
| Type error you cannot decipher | delegate to `.claude/agents/typescript-pro.md` | — |
| Bug resists two diagnostic attempts | delegate to `.claude/agents/debugger.md` | — |

If `CCC_HOOK_DEBUG=1` is set in a target project, raw hook payloads tee to `~/.claude-command-central/hook-debug.jsonl` — that's gold for hook bugs.

## Phase 3: Branch

```bash
git checkout main && git pull origin main

if [ "$IS_LINKED" = true ]; then
  git checkout -b "fix/issue-$ISSUE_NUMBER-<slug>"
else
  git checkout -b "fix/<slug>"
fi
```

## Phase 4: Fix

Hard rules from `CLAUDE.md` and `docs/CONTRIBUTING.md`:

- TS strict + `noUncheckedIndexedAccess`. No `any`.
- ESM only. Imports in `src/` end in `.js`.
- Hooks must never fail loud — `from-hook.ts` always exits 0.
- Event schema stays backward-compatible; unknown fields are ignored.
- If you patch `web/src/reducer.ts`, patch `src/state/dashboard-reducer.ts` to match. The two are deliberate duplicates and must stay in sync.
- Do not patch `legacy/python/` — it is frozen. Port the fix into the TS code.

## Phase 5: Regression test

The bug must be reproduced by a test that fails before the fix and passes after. Mirror the existing style — see `tests/from-hook.test.ts` for hook-translator tests, `tests/reducer.test.ts` for state, `tests/app.test.tsx` (ink-testing-library) for TUI integration.

If you need help designing the test surface, delegate to `.claude/agents/test-automator.md`.

## Phase 6: Verify

```bash
npx vitest run
npx tsc --noEmit
npm run build
./dist/bin.js --help
```

If web changes:

```bash
cd web && npx vite build && cd ..
rm -rf dist/web && cp -r web/dist dist/web
```

All green before phase 7.

## Phase 7: Security gate

```bash
git diff --cached | grep -iE "(api[_-]?key|password|secret|token|credential)" && echo "BLOCKED" && exit 1
git diff --cached --name-only | grep -E "\.(env|pem|key)$" && echo "BLOCKED — sensitive file staged" && exit 1
```

## Phase 8: Commit + PR

Commit messages:

- Describe the **root cause** and what the fix does.
- **Do not** mention `Claude` or `Anthropic` (global rule + `docs/CONTRIBUTING.md`).
- Prefix `fix:`. No `--no-verify`, no `--no-gpg-sign`.

```bash
git add <specific files>
git commit -m "fix: <root cause + remedy in one line>"
git push -u origin <branch>

gh pr create --title "fix: <summary>" --body "$(cat <<'EOF'
## Summary
- <what was broken>
- <what changed>

## Root cause
<one paragraph>

## Repro
<steps that fail before the fix, pass after>

## Verification
- [x] npx vitest run (regression test added)
- [x] npx tsc --noEmit
- [x] npm run build

## Related issue
Closes #<issue-number>     # if applicable
EOF
)"
```

## When in doubt

- Cross-cutting fix that crosses `src/` <-> `web/` -> consult `.claude/agents/architect-review.md` before committing.
- Repeated thrashing on the same symptom -> stop, hand off to `.claude/agents/debugger.md`.
