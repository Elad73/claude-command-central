# K-PIT-002: `npm run build:web` does not stage the bundle for `ccc serve`

**Category:** Pitfall
**Created:** 2026-04-27
**Tags:** build, deploy, ccc-serve, vite, fastify-static, staging

## Context
After a visual refactor of `MissionStrip`, running `cd web && npm run build` succeeded cleanly (Vite reports a green build, new hashed `dist/index-*.css`). But hard-refreshing `http://localhost:7777` still showed the OLD card. We assumed browser cache, then service worker, then in-memory caching in the running server. None of that was the cause.

## Insight
The web sub-build writes to `web/dist/`. The running `ccc serve` reads from `dist/web/` (note the path inversion — sibling, not parent). The bridge is a **separate `copy:web` step** that only runs as part of the orchestrator script `npm run build` from the repo root:

```json
"build":      "npm run build:web && npm run build:server && npm run copy:web",
"build:web":  "cd web && npm run build",
"copy:web":   "rm -rf dist/web && cp -r web/dist dist/web",
```

If you only run `build:web` (or `cd web && npm run build`), the bundle is built but never staged. The server keeps serving whatever was last copied to `dist/web/` — which can be days or weeks stale.

## Why it matters
Every visual / frontend change has to round-trip through `dist/web/` before `ccc serve` shows it. Skipping the orchestrator silently produces "I changed the code, ran a build, hard-refreshed, see no change" — the exact failure mode the project's existing lesson ("don't ship visual changes without a real preview") is meant to catch. The build appearing to succeed is the trap; success at the sub-build step is not the same as a deployable artifact.

## Symptom
- `npm run build:web` (or `cd web && npm run build`) reports success.
- `web/dist/assets/index-*.css` is newly written and contains the change.
- Hard-refresh of `localhost:7777` (Ctrl+Shift+R, "Disable cache" on) still serves the previous bundle.
- Diffing `web/dist/assets/*.css` against `dist/web/assets/*.css` shows them out of sync.

## Recovery
Run the orchestrator from the repo root:

```bash
npm run build       # build:web → build:server → copy:web
```

After that, hard-refresh. The running `ccc serve` reads files from disk on each request, so a process restart is not required for static-asset changes.

## Application
Trigger: any time you've edited `web/src/**` and need the running `ccc serve` (port 7777, global symlink to this repo's `dist/bin.js`) to reflect the change. Always reach for `npm run build` from the repo root, never `cd web && npm run build` alone — the sub-build is for the inner Vite loop only, not for serving.

For active iteration on visuals, use `cd web && npm run dev` (Vite dev server with HMR) instead. That serves `web/src/` directly and bypasses the staging dance entirely.
