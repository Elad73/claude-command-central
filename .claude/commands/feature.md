---
name: feature
description: Full-cycle feature development workflow for Claude Command Central. Creates a feature branch, sequences planning -> implementation -> tests -> typecheck -> build -> PR.
arguments:
  - name: description
    description: Description of the feature to implement
    required: true
  - name: issue
    description: "Existing GitHub issue number (optional, e.g., #42 or 42)"
    required: false
---

# Feature Workflow - Claude Command Central

End-to-end feature workflow for CCC. Reads `CLAUDE.md`, `docs/STATUS.md`, and `docs/CONTRIBUTING.md` first; then runs the feature through plan -> implement -> test -> review -> PR.

## Input

- Feature description: $ARGUMENTS.description
- Existing issue (optional): $ARGUMENTS.issue

## Phase 0: Context load

```bash
cat CLAUDE.md
cat docs/STATUS.md
cat docs/CONTRIBUTING.md
git log --oneline -5
git branch --show-current
```

If `$ARGUMENTS.issue` is provided:

```bash
gh issue view $ARGUMENTS.issue --json number,title,state,labels,body 2>/dev/null
```

If no issue and the change is non-trivial, optionally open one:

```bash
gh issue create \
  --title "feat: $ARGUMENTS.description" \
  --body "## Description

$ARGUMENTS.description

## Acceptance criteria
- [ ] (filled during planning)

## Notes
(filled during planning)"
```

## Phase 1: Branch off main

Per `docs/CONTRIBUTING.md` — never push directly to `main`.

```bash
git checkout main
git pull origin main
git checkout -b feature/<short-slug>
```

Branch prefixes per the contributing guide: `feature/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`.

## Phase 2: Plan

Decide which surface the change touches and load the right project skill before writing code:

| Touches | Skill to invoke |
|---|---|
| `web/src/components/scenes/*` or a new room/phase | `.claude/skills/ccc-scene-architecture/SKILL.md` |
| `src/hooks/template.ts`, `src/hooks/from-hook.ts`, hook lifecycle | `.claude/skills/ccc-hook-wiring/SKILL.md` |
| Multiple independent files (e.g. N scenes, N translators, N widgets) | `.claude/skills/ccc-parallel-fanout/SKILL.md` |

Sketch the plan: which files in `src/` or `web/src/` change, what the event-schema implications are (if any), and which of the canonical lookup tables (`PHASES`, `ROOMS`, `ROOM_BY_PHASE` in `src/events/types.ts`) need updating together.

If the surface is "multiple independent files", lay down the dispatcher + stubs first per `ccc-parallel-fanout`, then fan out.

## Phase 3: Implement

Hard rules from `CLAUDE.md` and `docs/CONTRIBUTING.md`:

- TypeScript strict, `noUncheckedIndexedAccess` on. No `any` — use `unknown` and narrow.
- ESM only. All imports end in `.js` in source.
- Keep the event schema backward-compatible — unknown fields are ignored, not rejected.
- Hooks must never fail loud (`process.exit(0)` on error in `src/hooks/from-hook.ts`).
- If you change `web/src/reducer.ts`, mirror the change in `src/state/dashboard-reducer.ts` (server-side duplicate). The two must stay in sync.

Delegate when appropriate:

- Tricky generics / type errors -> `.claude/agents/typescript-pro.md`
- New vitest suite design / fixtures -> `.claude/agents/test-automator.md`
- Cross-cutting refactor or module-boundary question -> `.claude/agents/architect-review.md`
- Stuck bug after two attempts -> `.claude/agents/debugger.md`

Visual / motion polish on `web/src/` is owned by the global `ui-designer` plugin subagent.

## Phase 4: Test + verify

Every change to `src/hooks/from-hook.ts` requires a test (silent-failure surface). Every new event-schema field requires a Zod parse test (valid / invalid / missing).

```bash
npx vitest run
npx tsc --noEmit
npm run build
./dist/bin.js --help          # smoke
```

If web changes:

```bash
cd web && npx vite build && cd ..
rm -rf dist/web && cp -r web/dist dist/web
```

For web hot-reload during iteration: `cd web && npx vite dev`.

All four (vitest, tsc, build, smoke) must be green before phase 5.

## Phase 5: Security gate

```bash
git diff --cached | grep -iE "(api[_-]?key|password|secret|token|credential)" && echo "BLOCKED — review before commit" && exit 1
git diff --cached --name-only | grep -E "\.(env|pem|key)$" && echo "BLOCKED — sensitive file staged" && exit 1
```

## Phase 6: Commit

Commit message rules:

- Describe the **why**, not just the what.
- **Do not** mention `Claude` or `Anthropic` in commit messages. Strip any auto-generated attribution lines.
- Conventional-commit prefix: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- No `--no-verify`, no `--no-gpg-sign`. If a hook fails, fix the underlying issue and create a new commit.

```bash
git add <specific files>
git commit -m "feat: <one-line summary>"
```

## Phase 7: Push + PR

```bash
git push -u origin <branch-name>
gh pr create --title "feat: <summary>" --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Why
<one paragraph: the motivation, not the diff>

## Verification
- [x] npx vitest run
- [x] npx tsc --noEmit
- [x] npm run build
- [x] ./dist/bin.js --help

## Related issue
Closes #<issue-number>     # if applicable
EOF
)"
```

## Error handling

| Symptom | Action |
|---|---|
| Vitest fails | Read the failing test, fix; if hook-translator regression, see `ccc-hook-wiring` |
| `tsc --noEmit` fails | If type error is opaque, delegate to `.claude/agents/typescript-pro.md` |
| Web build fails | `cd web && npx vite build` to see the real error; check that imports end in `.js` in `src/` (not `web/src/`) |
| Server snapshot drifts from web reducer | You forgot to mirror `web/src/reducer.ts` into `src/state/dashboard-reducer.ts` |
| Hooks misbehave in target project | See `.claude/skills/ccc-hook-wiring/SKILL.md` — Claude Code fires `SubagentStart`/`SubagentStop` for subagents, not `PreToolUse` |
