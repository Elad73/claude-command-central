# Knowledge Registry

This index lists durable, reusable insights extracted from work sessions. Append-only — entries are never deleted, only superseded with a note.

Categories: **PAT** patterns · **PIT** pitfalls · **DEC** decisions · **PRF** performance · **SEC** security · **API** external-API quirks.

---

## Patterns
- K-PAT-003 [2026-06-23] Verify animations by sampling element geometry over a cycle, not eyeballing frames — `patterns/K-PAT-003-verify-animation-by-sampling-geometry.md`
- K-PAT-002 [2026-04-27] Substrate flip — demote per-project hue from fill to accent (rail + glyph + capped halo) — `patterns/K-PAT-002-substrate-flip-for-per-project-tinting.md`
- K-PAT-001 [2026-04-27] Motion (not static glow) for "this card is active" emphasis — `patterns/K-PAT-001-motion-beats-static-for-active-card.md`

## Pitfalls
- K-PIT-003 [2026-06-23] `translateY(%)` resolves against the element's own size, not the parent — collapses lane-relative travel — `pitfalls/K-PIT-003-translatey-percent-resolves-against-own-size.md`
- K-PIT-002 [2026-04-27] `npm run build:web` does not stage the bundle for `ccc serve` (missing `copy:web` step) — `pitfalls/K-PIT-002-web-build-without-copy-web-stage.md`
- K-PIT-001 [2026-04-27] Renaming `CLAUDE_CONFIG_DIR` strips per-project sessions and auto-memory — `pitfalls/K-PIT-001-claude-config-dir-migration.md`

## Decisions
- K-DEC-001 [2026-06-23] Runtime themes via Tailwind v4 `--color-*` override + JS registry; phase hex stays hex via context — `decisions/K-DEC-001-runtime-theme-via-css-var-override.md`

## API quirks
- K-API-001 [2026-04-27] `.claude.json` stores per-project state under absolute-path keys — `api/K-API-001-claude-json-per-project-state.md`
