# Security

Claude Command Central (CCC) is a local-first observability tool that reads a user's Claude Code session events and renders them in a terminal TUI or a local web dashboard. This document is for users installing CCC and for contributors reviewing security-relevant changes.

## Threat model

CCC sits between three trust boundaries:

1. **Feed content.** Claude Code hook payloads contain raw user input: submitted prompts, file paths, and every bash command Claude executes. These can incidentally include secrets (exported env vars, `curl -H "Authorization: …"`, `sk-…` keys). CCC writes this stream to a JSONL file and renders it to the screen.
2. **Hook invocation.** `ccc emit --from-hook` is invoked by Claude Code on every tool call. If it crashes, the user's Claude session fails loudly. The translator must tolerate garbage input and always exit 0.
3. **Server exposure.** `ccc serve` starts an unauthenticated HTTP/SSE server. Bound to loopback it is low-risk; bound to `0.0.0.0` it exposes the user's entire session to the LAN.

## In scope

- The CLI (`ccc watch`, `ccc emit`, `ccc serve`, `ccc init`, `ccc demo`).
- The Claude Code hook integration shell commands installed by `ccc init`.
- The local web server in `src/server/serve.ts` and the bundled React client in `web/`.
- The JSONL event feeds under `~/.claude-command-central/feeds/` (or the project-local `--local` variant).

## Out of scope

- The supply chain of upstream dependencies (fastify, ink, react, zod, tsup, vite, framer-motion, tailwind). Users should `npm audit` their own installs.
- The security of the user's Claude Code installation and agent behavior.
- Operating system and filesystem permissions (CCC inherits the user's UID).
- Network-layer controls (TLS, firewalls) — CCC serves plain HTTP, intended for loopback.

## Findings

| Severity | Title | Description | Mitigation | Status |
| --- | --- | --- | --- | --- |
| High | Raw secrets echoed into feed from `PreToolUse` Bash commands | The humanizer falls through to `truncate(cmd)` for unknown binaries (e.g. `./deploy.sh API_KEY=xxx`, `weirdbin --token=sk-…`). That text lands on disk in the JSONL feed and renders in the Live Feed pane. | Added `redactSensitive()` in `src/hooks/from-hook.ts` applied before humanize. Scrubs Bearer / Basic / Token auth headers, `sk-/pk-/rk-` prefixed keys, GitHub `ghp_` / `gho_` / etc., AWS `AKIA…`, Slack `xox…`, and `*_KEY=` / `*_TOKEN=` / `*_SECRET=` / `*_PASSWORD=` / `*_PAT=` / `*_PWD=` / `*_CREDENTIALS=` assignments. Wrapped in `try/catch`; on any regex failure returns the original string so the "hooks never fail loud" contract holds. Tests added. | **Fixed** |
| High | Raw user prompt echoed into feed `log` message | `UserPromptSubmit` passes the full prompt string into `log.message` as `> …`. Prompts regularly contain pasted stack traces, URLs with tokens, or secret-adjacent context. | Same `redactSensitive()` helper applied to the prompt before it is placed on `flow.objective`, the log message, and the agent task. | **Fixed** |
| High | `ccc serve --host 0.0.0.0` silently exposes entire session to LAN | The server has **no authentication, no TLS, CORS set to reflect any origin**. A user who types `ccc serve --host 0.0.0.0` (for a sibling machine or a phone on the same WiFi) exposes every prompt, file path, and bash command to anyone on the same network. | Added a `console.warn` to stderr immediately after `fastify.listen` resolves, triggered for any host outside the loopback set (`127.0.0.1`, `localhost`, `::1`, `::ffff:127.0.0.1`). Message explains the risk and suggests `--host 127.0.0.1`. | **Fixed** |
| Medium | CORS set to `origin: true` (reflect any origin) | `src/server/serve.ts` registers `@fastify/cors` with `origin: true`. For SSE via `EventSource` this is largely moot (no credentials, no custom headers), but if future endpoints add authenticated routes or accept POSTs, this setting will bite. | Not fixed — would require an API decision. Users with sensitive sessions should not bind publicly regardless. Recommend tightening to `origin: false` or a specific allowlist before any authenticated endpoints are added. | Open (Informational) |
| Medium | `ccc emit --feed <path>` has no symlink / traversal check | `writeEvent` calls `resolve()` then `fs.mkdir` + `fs.appendFile`. A symlinked feed path can redirect writes anywhere the user can write. Since the flag is supplied by the same user, this is more footgun than vulnerability, but an attacker with write access to a project's `.claude/settings.json` could redirect feed writes. | Accepted risk. `.claude/settings.json` is already a trust boundary controlled by the project owner. `ccc init` writes only to `.claude/settings.json` and the feed under the user's home dir. Users should treat `.claude/settings.json` like a shell rc file. | Open (Accepted) |
| Low | `CCC_HOOK_DEBUG=1` writes raw hook payloads to disk | When enabled, `~/.claude-command-central/hook-debug.jsonl` receives **unredacted** prompts and commands, by design (investigation tool). | File lives outside the repo. `.gitignore` lists `hook-debug.jsonl` as belt-and-suspenders protection in case a user copies debug output into a tracked directory. Documented here so users know to clear it after debugging. | Documented |
| Low | No `dangerouslySetInnerHTML` / no `eval` | Verified by grep across `web/src/` and `src/app/`. React auto-escapes `{line.message}` in `LiveFeed.tsx`. Ink does the same. | N/A | Verified clean |
| Informational | Repo `git init` review | No `.env`, no API keys, no credentials, no proprietary snippets found in any tracked file. Legacy demo JSONL under `legacy/python/runtime/` contains only placeholder agent status text. | N/A | Verified clean |
| Informational | Dependencies | Root and `web/` dependency trees contain only well-known packages (fastify, ink, react, zod, tsup, vite, framer-motion, tailwind). No obviously unused or abandoned deps. | N/A | Verified |

## Defense-in-depth recommendations (for users)

- **Don't bind the server publicly.** Loopback (`127.0.0.1`) is the default — keep it that way. If you need remote access, use SSH port-forwarding, not `--host 0.0.0.0`.
- **Review before sharing screenshots.** The Live Feed renders truncated-but-real bash commands. Redaction is best-effort; novel secret shapes will slip through. Blur the feed pane before posting.
- **Rotate anything that appeared.** If a secret was passed to Claude as an env var or inline in `curl`, it lived in the JSONL feed for the duration of that session. Rotate the credential and delete the feed file.
- **Don't commit `hook-debug.jsonl`.** The file lives outside any repo by default, and `.gitignore` guards against accidental copies, but avoid moving it into project directories.
- **Treat `.claude/settings.json` like `.bashrc`.** It ships shell commands that run on every tool invocation. Don't accept PRs that touch it from untrusted contributors without review.
- **Re-run `ccc init` after upgrading.** Hook redaction is applied by the installed `ccc` binary at runtime, so upgrading CCC upgrades everyone's redaction automatically — but only for sessions that start after the upgrade.

## Reporting a vulnerability

CCC is an open-source utility with no bounty program. Please open a GitHub Issue or, for sensitive reports, a private security advisory on the GitHub repository. Include reproduction steps, affected versions, and your expected behavior. We aim to acknowledge within a week and land fixes in the next release.
