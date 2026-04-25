---
description: End-of-session protocol for CCC. Refresh docs/STATUS.md, run final test/typecheck/build, commit and push to a PR.
---

# Wrap-Up — Claude Command Central

End-of-session workflow. Captures what was accomplished, refreshes `docs/STATUS.md`, runs the final verification gate, commits cleanly, and opens a PR.

**Usage:** `/wrap-up [issue-number]`

---

## Phase 1: Gather context

```bash
git status
git branch --show-current
git diff --stat
git log --oneline -10
```

If branch matches `feature/issue-N-*` or `fix/issue-N-*`, capture `N` as the linked issue number. Otherwise use the optional `[issue-number]` arg.

## Phase 2: Refresh `docs/STATUS.md`

This is the wrap-up's distinctive job. Update the file with what changed in this session:

- Bump the `Last updated:` date stamp.
- Move completed items from "Next up" to "Recently completed".
- Note any newly-opened blockers under "Open blockers / decisions".
- Update test count / build state if it changed (e.g. `Tests: 98 -> 102 across 11 -> 12 files`).
- Keep entries terse; this file is read by future sessions on `/wake-up`.

If you're delegating cross-cutting checks before committing the STATUS update, see `.claude/agents/architect-review.md`.

## Phase 3: Safety scan

```bash
git status --short
git diff --cached --name-only | grep -E "\.env|\.sql|\.pem|\.key|credential|secret|backup" && {
  echo "BLOCKED — sensitive file staged. Unstage and retry."
  exit 1
}
git diff --cached | grep -iE "(api[_-]?key|password|secret|token|credential|webhook[_-]?secret)" && {
  echo "BLOCKED — possible secret in diff. Review before commit."
  exit 1
}
```

## Phase 4: Final verification gate

```bash
npx vitest run
npx tsc --noEmit
npm run build
./dist/bin.js --help
```

If the change touched `web/src/`:

```bash
cd web && npx vite build && cd ..
rm -rf dist/web && cp -r web/dist dist/web
```

All four (vitest, tsc, build, smoke) must be green. If any fail:

- Test failure: don't suppress. Fix the test or the code, recommit.
- Type error you can't decipher: hand off to `.claude/agents/typescript-pro.md`.
- Bug that resists two attempts: hand off to `.claude/agents/debugger.md`.

## Phase 5: Stage and review

Prefer specific paths over `git add -A` to avoid pulling in stray files. Then:

```bash
git status
git diff --cached --stat
git diff --cached         # eyeball before committing
```

## Phase 6: Commit

Commit-message rules from `~/.claude/CLAUDE.md` and `docs/CONTRIBUTING.md`:

- Describe the **why**, not just the what.
- **Never** mention `Claude` or `Anthropic`. Strip auto-generated attribution lines.
- Conventional-commit prefix: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- No `--no-verify`, no `--no-gpg-sign`. If a hook fails, fix the underlying issue and create a new commit.
- Prefer new commits over `--amend`.

```bash
git commit -m "$(cat <<'EOF'
<type>: <one-line summary, why-flavored> (#<issue> if linked)

<optional paragraph: context, tradeoffs, or follow-ups>
EOF
)"
```

If multiple logical changes are staged, split into multiple commits — each one tells one story.

## Phase 7: Push and open PR

Per `docs/CONTRIBUTING.md`: never push directly to `main`. Always go through a PR.

```bash
git push -u origin <branch-name>

gh pr create --title "<type>: <summary>" --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Why
<one paragraph: motivation>

## Verification
- [x] npx vitest run
- [x] npx tsc --noEmit
- [x] npm run build
- [x] ./dist/bin.js --help

## STATUS.md
- [x] Refreshed `docs/STATUS.md` (date, completed, next up)

## Related issue
Closes #<issue-number>     # if applicable
EOF
)"
```

For multi-file UI work that fanned out across scenes / widgets, link the relevant skill in the PR body so reviewers know the pattern: `.claude/skills/ccc-parallel-fanout/SKILL.md`.

## Phase 8: Hand-off note

After the PR is up, leave a one-line summary under the user's last message:

> "Branch `<name>` pushed. PR #<n>: <title>. STATUS.md refreshed. Build green. Ready to merge after review."

If the next session starts cold, `/wake-up` will pick it up from `docs/STATUS.md`.

## Safety rules (non-negotiable)

1. Never commit sensitive data (.env, credentials, .key, .pem, .sql backups).
2. Never push directly to `main`.
3. Never skip the PR step.
4. Never reference `Claude` or `Anthropic` in commit messages or PR bodies.
5. Never use `--no-verify` or `--no-gpg-sign` to bypass hooks.
6. Always refresh `docs/STATUS.md` so the next `/wake-up` is accurate.
