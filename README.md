# Claude Command Central

Terminal-native mission control for agentic workflows. Renders a live 2D "command office" (rooms, agents, pipeline strip, event feed) in the terminal, driven by a JSONL event feed that any project can append to.

The v2 TypeScript + Ink implementation auto-integrates with Claude Code via its native hooks, so tool use, prompt submissions, and session lifecycle flow into the dashboard with **no per-project scripting**.

## Requirements

- Node 20+
- Claude Code (for auto-integrated mode)

## Install (development, from this repo)

```bash
npm install
npm run build
npm link                 # puts `ccc` on your PATH
```

When this lands on npm, install will be a single `npm install -g claude-command-central`.

## Quick start — attach to a real project

```bash
cd ~/your-project
ccc init                 # writes .claude/settings.json hook entries + registers the project
ccc watch --feed ~/.claude-command-central/feeds/your-project.jsonl
```

In another pane, run Claude Code inside the project as normal. The dashboard animates as Claude moves through phases.

```
┌──────────── PROMPT ────────────┐  ┌──────────── PLAN ────────────┐  ┌──────────── BUILD ────────────┐
│ INTAKE                         │  │ STRATEGY                     │  │ BUILD BAY                     │
│ ✦ claude                       │  │                              │  │                               │
└────────────────────────────────┘  └──────────────────────────────┘  └───────────────────────────────┘
```

## Commands

| Command | Purpose |
|---|---|
| `ccc init` | Wire the current project to the dashboard via Claude Code hooks. Idempotent. |
| `ccc watch --feed <path>` | Render the live dashboard from one or more feeds. |
| `ccc emit --type flow --status running --progress 30 --feed <path>` | Manually append an event. |
| `ccc emit --from-hook <HookName> --feed <path> --project <slug>` | Translate a Claude Code hook JSON on stdin into events. Used by the installed hooks — you rarely call this directly. |

## How it integrates with Claude Code

`ccc init` writes six hook entries into `<project>/.claude/settings.json`:

| Hook | What CCC does |
|---|---|
| `SessionStart` | Resets the flow, parks the agent in PROMPT. |
| `UserPromptSubmit` | Sets the flow objective to the prompt; agent moves to PROMPT/active. |
| `PreToolUse` | Moves the agent to the phase mapped from the tool (`Edit`→BUILD, `Grep`→PLAN, etc.). |
| `PostToolUse` | Logs `✓ <tool>` to the live feed. |
| `SubagentStop` | Logs subagent completion. |
| `Stop` | Flow → done, progress 100%, agent moves to DEPLOY. |

Hooks are marked with a `# ccc-hook` tag so `ccc init` can be re-run safely — existing CCC hooks are replaced in place, and user-authored hooks are preserved.

Hooks never fail loud: if the feed path is broken or stdin is garbage, CCC silently exits 0 so your Claude Code session is never interrupted.

## Tool → Phase mapping

```
BUILD:   Edit, Write, NotebookEdit, Bash
PLAN:    Read, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite
fallback: BUILD
```

Tweak in `src/hooks/from-hook.ts`.

## File layout

```
claude-command-central/
├── src/
│   ├── bin.ts                CLI entry
│   ├── events/               types, Zod schemas, FeedReader, MultiFeedWatcher
│   ├── state/                DashboardState reducer
│   ├── config/               paths, project registry
│   ├── hooks/                Claude Code hook template + stdin translator
│   ├── app/                  Ink components (Header, Pipeline, Roster, Office, LiveFeed)
│   └── cli/                  watch / emit / demo / init subcommands
├── tests/                    vitest unit + integration tests
├── legacy/python/            archived v1
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Event schema

Each line of a feed is one JSON object. Three types: `flow`, `agent`, `log`.

```json
{"v":1,"ts":"2026-04-19T12:00:00Z","project":"demo","type":"agent","agent":"claude","phase":"BUILD","status":"active","task":"Edit: src/foo.ts"}
```

Phases: `PROMPT`, `PLAN`, `BUILD`, `REVIEW`, `TEST`, `DEPLOY`.
Statuses: `idle`, `active`, `blocked`, `done`, `error`.

Optional metadata: `v` (schema version, currently 1), `ts` (ISO8601), `project` (slug).

## Configuration

Default config root: `~/.claude-command-central/`

- `projects.json` — project registry (slug → path/feed/createdAt)
- `feeds/<slug>.jsonl` — per-project append-only event feeds

Override with `CCC_CONFIG_DIR=/custom/path` env var.

## Custom feed location

By default, feeds live in `~/.claude-command-central/feeds/`. To keep a project's feed inside the project itself:

```bash
ccc init --local         # feed lands at <project>/.claude/feeds/<slug>.jsonl
```

## Development

```bash
npm test                 # vitest
npm run typecheck        # tsc --noEmit
npm run build            # tsup → dist/
npm run ccc -- watch ... # run via tsx without building
```

## Legacy Python v1

The original stdlib-only Python implementation is preserved in `legacy/python/`. It reads the same JSONL schema and still works. See `legacy/python/README.md`.
