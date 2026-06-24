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

- ✅ **Animation was unreadable — redesigned & verified.** Three problems fixed:
  (1) the agent fell **head-down** and **sprawled at 48°** with an **"*" ouch mark**
  → read as *crashing*, not *caught*. Now it falls **upright**, lands **feet-first**,
  sinks into the mat, **bounces**, stands, thumbs-up. (2) The crash mat was a thin
  pad → enlarged into a clear stunt cushion that deeply absorbs (scaleY 0.5) on
  impact. (3) **Root-cause bug:** the fall used `translateY(calc(100% - …))`, but a
  `%` in `translateY` resolves against the element's *own* height — so the fall
  collapsed to ≈ −6px and the agent never reached the mat (this was wrong in the
  original too). Now computed as an absolute px from real lane geometry; verified by
  sampling the sprite's feet (130 → 249px, landing into the mat at 229–281).
  Pacing slowed 6s → 7.5s.
- ⬜ **Polish:** tune the bounce ease + dust-poof color; multi-agent lanes (3–4) not
  yet re-verified at the smaller size.

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
