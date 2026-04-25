---
description: Context recovery on session start. Reads CCC's CLAUDE.md, STATUS.md, PRD, recent commits, and announces where work left off.
---

# Wake-Up — Claude Command Central

Quick context sync for a fresh session. Implements the global `RECONNECTION PROTOCOL` from `~/.claude/CLAUDE.md`, scoped to this repo.

**Usage:** `/wake-up`

---

## Phase 1: Load the canonical context (run in parallel)

```bash
# Project conventions + roadmap
test -f CLAUDE.md && cat CLAUDE.md

# Current phase, in-flight work, blockers
test -f docs/STATUS.md && cat docs/STATUS.md

# Workflow + skill triggers
test -f docs/CONTRIBUTING.md && cat docs/CONTRIBUTING.md

# Product spec (long — skim the headings)
test -f PRD.md && head -100 PRD.md

# Public-facing docs
test -f README.md && head -60 README.md
```

## Phase 2: Git state (parallel)

```bash
git branch --show-current
git status --short
git log --oneline -8 --format="%h %s (%ar)"
git stash list
```

## Phase 3: GitHub state (best-effort, no fail-loud)

```bash
gh auth status 2>/dev/null && {
  gh issue list --state open --limit 5 --json number,title,labels 2>/dev/null
  gh pr list --state open --limit 5 --json number,title,headRefName 2>/dev/null
}
```

If `gh` isn't authed, skip silently — CCC doesn't depend on GitHub Issues for orchestration.

## Phase 4: Skill + agent inventory

```bash
ls .claude/skills/*/SKILL.md 2>/dev/null
ls .claude/agents/*.md 2>/dev/null
```

These are the project's codified workflows and delegate-pointers — reading their headers is enough to know what's available.

## Phase 5: Build / test baseline (only if asked)

```bash
# Optional — only run if the user wants to know the green-state right now
npx vitest run 2>/dev/null | tail -5
npx tsc --noEmit 2>/dev/null && echo "tsc: clean" || echo "tsc: errors above"
```

`docs/STATUS.md` already reports the canonical baseline (e.g. "98 tests, build green") — treat that as truth unless a recent commit suggests otherwise.

## Output format

Announce the recovered state in this shape:

```
+==============================================================================+
|                    CCC WAKE-UP — CONTEXT RECOVERED                            |
+==============================================================================+
|  Project : Claude Command Central
|  Branch  : <current-branch>
|  Status  : <clean | N uncommitted changes>
|  Last    : <most recent commit, short>
+==============================================================================+
|  Stack   : Node 20+ ESM | TS 6 (strict, noUncheckedIndexedAccess)
|            Ink 7 + React 19 (TUI) | Vite + React 19 + Tailwind 4 + framer-motion (web)
|            Fastify 5 SSE | Zod 4 | Vitest 4 | Tsup
+==============================================================================+
|  Phase   : <pulled from docs/STATUS.md "Current Phase">
|  Next up : <pulled from docs/STATUS.md "Next up">
|  Skills  : ccc-parallel-fanout · ccc-hook-wiring · ccc-scene-architecture
|  Agents  : architect-review · debugger · test-automator · typescript-pro
+==============================================================================+
|  RECENT COMMITS
|    <h1> <subject> (<rel>)
|    ...
|
|  OPEN ISSUES         (if gh authed; else "n/a")
|  OPEN PRs            (if gh authed; else "n/a")
|  STASH               (if any)
+==============================================================================+
|  SUGGESTED NEXT MOVE
|    <inferred from state — see logic below>
+==============================================================================+
```

Then, in plain prose to the user: "I read CLAUDE.md, docs/STATUS.md, and docs/CONTRIBUTING.md. We're in `<phase>`. Last commit: `<subject>`. Ready to continue from `<inferred-next>`."

## Suggested-next-move logic

| Observed state | Suggested action |
|---|---|
| Uncommitted changes on a feature branch | Suggest `/wrap-up` — finish the in-flight work |
| Clean tree on `main`, `docs/STATUS.md` "Next up" has a concrete item | Suggest `/feature "<that item>"` |
| Open PR with the user's name | Suggest `gh pr view <n>` and review-loop |
| Recent commits mention an unfinished refactor | Read those commits, summarize the open thread |
| Build / tests are red per `docs/STATUS.md` | Suggest `/bug-fix "<symptom>"` first |
| Nothing obvious | Ask the user what they want to drive |

## Quick-command reference

```
/feature "<description>"   - End-to-end feature workflow
/bug-fix "<symptom>"       - Reproduce, root-cause, fix, regression-test, PR
/wrap-up                   - Refresh STATUS.md, commit, push, PR
```

## What this command must NOT do

- Don't make any code edits.
- Don't run destructive git operations.
- Don't fabricate status — if `docs/STATUS.md` is missing or stale, say so explicitly.
- Don't reference `Claude` or `Anthropic` in any commit/PR side-effect (per global rule). This command shouldn't commit anyway.
