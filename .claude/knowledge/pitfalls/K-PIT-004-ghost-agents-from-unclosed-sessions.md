# K-PIT-004: Ghost agents/missions linger from un-closed sessions

**Category:** Pitfall
**Created:** 2026-06-24
**Tags:** feeds, state, despawn, hooks, subagents, live-mode, serve

## Context
In live mode the dashboard showed two "running/active" figures for projects the
user wasn't touching: `harmonitabs-single` (a session from ~6 weeks earlier) and a
`taxonomy-curator` subagent under `personal-space` (main session long done).

## Insight
Feeds are append-only and `serve` reconstructs state from the **whole history** on
load, so any agent/flow whose session ended **without a terminal event** stays
"active" forever:
- a session that crashes / is killed never emits `Stop` → its `flow` stays running
  and its `claude@<project>` agent stays active;
- a subagent that never emits `SubagentStop` lingers as an active figure even after
  the parent flow is `done`.
The stale-agent despawn GC does **not** clear these month-old ghosts on load.

## Why it matters
"Live" can show stale work and mislead the operator. When triaging "why is X
showing as running?", trust the feed, not the UI.

## Symptom
A room shows an agent for a project you're not working on; the mission reads RUNNING
with old/garbage text (e.g. a leaked `<task-notification>` captured as the objective).

## Recovery
- Diagnose: `tail` the project's feed (`~/.claude-command-central/feeds/<slug>.jsonl`)
  and check the last event's `ts` + whether a `done`/`despawn`/Stop ever arrived.
- Clear immediately: append a closing event, or trim the feed.
- Real fix (open): make the despawn GC evict agents whose newest event is older than
  a threshold **at load time**, not only during live ticks.

## Application
Trigger: any "why is this agent/mission showing?" question in live mode, or before
trusting the dashboard as ground truth. Verify against the feed tail first.
