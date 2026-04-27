# K-PIT-001: Renaming/moving CLAUDE_CONFIG_DIR silently strips per-project sessions and auto-memory

**Category:** Pitfall
**Created:** 2026-04-27
**Tags:** claude-code, config-migration, sessions, auto-memory, multi-account

## Context
Investigating impact on this project after the user moved `~/.claude` to `~/.claude-personal` and added a `~/.claude-work` for account isolation, with `CLAUDE_CONFIG_DIR` set per profile in `~/.bashrc` subshell aliases.

## Insight
Top-level files in the new dir (`settings.json`, `CLAUDE.md`, `skills/`, `commands/`) tend to come over fine. The two things that get left behind — and that you only notice once trust is already broken — are:

1. **Per-project session transcripts** at `${CLAUDE_CONFIG_DIR}/projects/<dir-slug>/*.jsonl`. Without them, `/resume` shows nothing for projects with weeks of prior work.
2. **Per-project auto-memory** at `${CLAUDE_CONFIG_DIR}/projects/<dir-slug>/memory/*.md`. Without these, the auto-memory loader sees an empty dir and starts cold — every accumulated `feedback`, `project`, `user` memory is gone for that project.

## Symptom
- `/resume` lists only sessions started **after** the migration; older `.jsonl` files seem to have vanished.
- The `MEMORY.md` referenced in the system prompt resolves to an empty directory.
- Project's `.claude.json` entry may also be missing fields (e.g. `mcpServers`, `hasTrustDialogAccepted` defaults to `false` so the trust dialog re-prompts).

## Why it matters
Multi-account isolation via `CLAUDE_CONFIG_DIR` is otherwise a clean pattern (subshell + per-profile XDG dirs). But the migration step — even a `mv ~/.claude ~/.claude-personal` — needs to be verified per-project, not just at the top level.

## Recovery
For each project that mattered:
```bash
SLUG=-home-eladr-personal-space-playground-claude-command-central
ARCHIVE=~/.claude-archive-YYYYMMDD/projects/$SLUG
ACTIVE=$CLAUDE_CONFIG_DIR/projects/$SLUG
mkdir -p "$ACTIVE/memory"
cp -nv "$ARCHIVE"/*.jsonl       "$ACTIVE/"
cp -nv "$ARCHIVE"/memory/*.md   "$ACTIVE/memory/"
```
Then merge per-project subkeys (`mcpServers`, `hasTrustDialogAccepted`) from the legacy `~/.claude.json` into `${CLAUDE_CONFIG_DIR}/.claude.json` under `projects[<absolute path>]`.

## Application
Trigger: anytime someone migrates `~/.claude` to a new location (renames, account split, machine move). Run a per-project diff between the old and new `projects/<slug>/` dirs **before** declaring the migration complete. Don't rely on `mv` having moved everything — verify the project subdir count and the memory dir.
