# K-PAT-002: Substrate flip — demote per-project hue from fill to accent

**Category:** Pattern
**Created:** 2026-04-27
**Tags:** ui, dashboard, dispatch-design, mission-strip, contrast, hierarchy, dark-cyber

## Context
The original MissionCard used the per-project hue as a body fill (`${color}18` → `${color}AA` at the running halo's peak). White objective text floated over a saturated tinted plate. User feedback: "white-over-bright, chunks without any style, finesse, shadows, contrasts." Hierarchy collapsed because every chromatic element used the same hue at varying alpha — no neutral plate to rest the eye, so the "accent" became the substance.

## Insight
When a UI element needs both **per-instance color identity** AND **legible body text**, putting the identity color in the FILL fights the text. Flip the substrate: use a deep neutral (here: `ink-900 #0a0a18`) for the body, and concentrate the identity hue into three small kinetic/structural moments:

1. **Accent rail** — a 3–4px solid project-hue stripe on the left edge, neon-cored with `inset 0 0 4px rgba(255,255,255,0.4)` for the highlight line. This is the "static identity anchor."
2. **Badge glyph** — the project-code letters in `var(--ccc-run-cff)`, sitting on an engraved (deeper-than-parent) plate. The glyph carries the hue, not the plate.
3. **Breathing halo** — a 2.4s box-shadow pulse on running cards, peak alpha **capped well below text-readable threshold** (`${color}55` at peak, never `${color}AA`+ which the old design used). The halo signals "active" without ever washing the substrate.

Result: body text becomes a near-white on dark with full contrast, while per-project identity is preserved through three structural cues that read at a glance.

## Why it matters
Solves the recurring "tinted card" problem on any dark-cyber surface: agent rosters, environment chips, project tiles, build queues. The fill-as-identity approach scales poorly past a single saturation level — once you have one bright card and four calm ones, the calm cards lose their identity entirely. The substrate-flip preserves identity across all states with zero text contrast cost.

Pairs with K-PAT-001 (motion beats static for active emphasis): the breathing halo here is the K-PAT-001 motion layer, but its alpha is capped specifically so it never compromises the substrate-flip's contrast win. The two patterns are layered, not competing — K-PAT-002 owns the substrate, K-PAT-001 owns the kinetic running cue on top of it.

## Example
```css
/* Base — deep ink, layered elevation. Hue NOT in the fill. */
.ccc-mission-card {
  background-color: #0a0a18;        /* ink-900 */
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.05),   /* top rim highlight */
    inset 0 -1px 0 rgba(0, 0, 0, 0.35),        /* bottom inner shadow */
    0 1px 0 rgba(0, 0, 0, 0.55),               /* floor hairline */
    0 6px 16px -4px rgba(0, 0, 0, 0.55);       /* drop */
}

/* Accent rail — the per-project identity anchor. */
.ccc-mission-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--ccc-run-cff);
  box-shadow: 0 0 8px var(--ccc-run-caa),
              inset 0 0 4px rgba(255, 255, 255, 0.4);
}

/* Engraved badge — sits INTO the card. Glyph in hue, plate deeper than parent. */
.ccc-mission-badge {
  background: #05050d;                              /* deeper than card */
  border: 1px solid var(--ccc-run-c55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
              inset 0 0 6px rgba(0, 0, 0, 0.6);
  color: var(--ccc-run-cff);                        /* glyph IS the hue */
  text-shadow: 0 0 8px var(--ccc-run-c55);
}

/* Halo — peak capped at c55, never higher. Contrast preserved at all frames. */
@keyframes ccc-mission-halo-pulse {
  0%, 100% { box-shadow: /* drop stack */, 0 0 18px -6px var(--ccc-run-c3a); }
  50%      { box-shadow: /* drop stack */, 0 0 26px -2px var(--ccc-run-c55); }
}
```

## Application
Trigger: any card / chip / tile that carries a per-instance color (project, environment, agent role, channel) AND needs to display readable body text. If you find yourself at `${color}AA`+ in the fill to "make it pop," stop — flip the substrate instead.

Test for "is the halo too hot": at the keyframe's peak frame, can a user comfortably read the smallest body text on the card? If not, drop the halo's peak alpha by half before adjusting anything else. The substrate must always win the contrast contest; the halo is ambient signal.

Avoid: re-introducing the project hue into the body fill as a "subtle wash" — it always creeps back up to the brightness that broke the original design. The neutral ink substrate must remain neutral.
