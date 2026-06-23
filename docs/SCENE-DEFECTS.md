# Scene & Sprite Defect Tracker

The working PRD for fixing the robots, animations, and office scenes. Each item is
a concrete, visually-verifiable defect — not a vague "make it nicer." Every fix is
confirmed in the running app (screenshot) before it's marked done.

Status: ✅ fixed & verified · 🔧 in progress · ⬜ todo

---

## REVIEW room (Sherlock)

- ✅ **Deerstalker hat floated, detached from the head.** The hat was drawn in a
  separate static overlay while the sprite ran `body-scan` (head swings side to
  side). Moved the hat *into* `AgentSprite`'s head group (gated to phase REVIEW) so
  it tracks all head/body motion by construction. Pipe + magnifier overlay also
  synced to the same `review-nod` + `body-scan` so they no longer detach.
- ⬜ **Hat proportions.** Sits slightly high/small on the helmet — tune size/offset.

## BUILD BAY

- ✅ **Tool rack overlapped the room header text.** Rack was at `top:6`, inside the
  `top-2` header band. Moved to `top:30` (below the header), height trimmed to fit
  above the agent stations.
- ⬜ **Hammer floats high above the plank.** The hammer-tool station's strike arc
  bottoms out well above the nail/plank — lower the swing target so the head meets
  the nail on impact.
- ⬜ **Nail is crooked / not seated in the plank.** Straighten the nail and align the
  hammer strike point to it.
- ⬜ **Tool station props can crowd the sprite.** Review per-tool layout so the
  workpiece reads as "the agent is using this tool on that thing."

## QA LAB (TEST)

- ⬜ **Animation is unreadable.** A human (and an honest AI) can't tell what's
  happening. Intended story: a robot **falls from a hatch and lands in a stunt
  safety-cushion** — the QA "catch" that saves it from a crash (i.e. tests catching
  bugs). Needs a legible redesign: clear hatch → fall → cushion squash → bounce →
  thumbs-up, with the cushion reading obviously as a crash mat, and pacing slow
  enough to parse.

## Sprite quality (all rooms)

- ⬜ **Robots are underweighted & a bit generic.** Small relative to rooms;
  silhouette and "what am I doing" pose could be stronger and more characterful.
- 🔧 **Theme-aware robot color.** Robots use `projectColor()` (a fixed HSL hash) so
  they stay vivid regardless of theme. Should adapt per theme (lightness/saturation
  bounds) so they sit naturally in `clay` etc.

## Office / backgrounds

- ⬜ **Rooms feel similar.** Per-room set dressing should make INTAKE / QA LAB /
  LAUNCHPAD feel like genuinely different places (architecture + props), not
  recolored tiles.
- ⬜ **Depth.** Add fore/mid/background layering and activity-responsive lighting.

---

## Themes (see DESIGN.md)

- ✅ `neon-noir`, `amber-crt`, `clay` switch live and persist.
- ✅ **`clay` was unreadable (bright-on-bright).** Light mode fought the dark-stage
  scene design (additive washes/glows). Reworked clay into a **warm dark
  "terracotta dusk"** so contrast holds and the glows read as intended. Verified.
- ⬜ True *light* mode (if still wanted) needs a per-scene lighting pass: gate the
  volumetric washes / drop-shadow glows / text-shadows behind a theme flag and
  darken robots — a dedicated effort, not a palette swap.
