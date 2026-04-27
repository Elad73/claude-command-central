# K-API-001: Claude Code's `.claude.json` stores per-project state under absolute-path keys

**Category:** External-API quirk
**Created:** 2026-04-27
**Tags:** claude-code, claude-json, mcp, per-project-state, config-merge

## Context
While merging a legacy `~/.claude.json` into the active `${CLAUDE_CONFIG_DIR}/.claude.json` post-migration, discovered that several pieces of project-scoped state — including MCP server registrations and the trust-dialog-accepted flag — live nested under the project's absolute filesystem path, not at the top level.

## Insight
`.claude.json` has a top-level `projects` object keyed by **absolute project path** (e.g. `"/home/eladr/personal-space/playground/claude-command-central"`). Each value contains ~30 subkeys, the load-bearing ones being:

| Key | Why it matters on migration |
|---|---|
| `mcpServers` | Per-project MCP registrations (e.g. `playwright`). Empty `{}` after a fresh init means MCP servers silently won't load until re-registered. |
| `hasTrustDialogAccepted` | When `false`, Claude Code re-prompts "trust this folder?" on next open. |
| `enabledMcpjsonServers` / `disabledMcpjsonServers` | Per-project allow/deny for `.mcp.json`-discovered servers. |
| `lastSessionId`, `lastCost`, `lastModelUsage`, etc. | Session-recency stats. Refreshed naturally on next session — safe to skip during merge. |
| `exampleFiles`, `exampleFilesGeneratedAt` | Cached example files for the project picker. Newer side wins. |

Top-level keys (outside `projects`) hold user-global state: `userID`, `oauthAccount`, `skillUsage`, `toolUsage`, dismissed-callout flags, `cachedStatsigGates`, etc.

## Why it matters
Any time you need to merge two `.claude.json` files (config-dir migration, account split, machine restore), you can't just `cat` them — you have to merge the `projects[<absPath>]` subkey-by-subkey, deciding which side wins per field. MCP servers and trust-dialog state are the two that practically bite you; everything else is either cosmetic or auto-refreshes.

## Example
```python
import json
LEGACY = '/home/eladr/.claude.json'
ACTIVE = f"{os.environ['CLAUDE_CONFIG_DIR']}/.claude.json"
KEY    = '/home/eladr/personal-space/playground/claude-command-central'

L = json.load(open(LEGACY))['projects'][KEY]
active = json.load(open(ACTIVE))
A = active['projects'].setdefault(KEY, {})

# Surgical merge: only the fields that won't auto-refresh.
A['mcpServers']            = L.get('mcpServers', {})
A['hasTrustDialogAccepted']= L.get('hasTrustDialogAccepted', False)

json.dump(active, open(ACTIVE, 'w'), indent=2)
```

## Application
Trigger: any `.claude.json` cross-write — restoring from backup, merging two configs after a profile split, or programmatically registering an MCP server for a project. Always go through `projects[<absPath>][<subkey>]`; never write at the top level for project-scoped state. Back the file up first (`.bak.<ts>`) — Claude Code rewrites it on session shutdown.
