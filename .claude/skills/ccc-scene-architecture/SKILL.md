---
name: ccc-scene-architecture
description: Use when editing `web/src/components/scenes/*` or adding a new room/phase to CCC's 2×3 office grid. Describes the scene contract, animation conventions, multi-agent layout rules, and how to add a new phase end-to-end without breaking event routing.
---

<objective>
Contributors should be able to add a new room/phase or modify an existing scene's theatrical animation confidently. This skill explains the contract every scene implements, the conventions they follow, and the chain of files that a new phase touches.
</objective>

<scene_contract>
Every scene in `web/src/components/scenes/*Scene.tsx` implements:

```ts
interface SceneProps {
  agents: readonly AgentState[];  // pre-sliced to at most MAX_STATIONS (4)
  color: string;                   // the phase/room color (PHASE_HEX[phase])
}
```

Plus these invariants:
- The scene is **absolute-positioned and fills its parent**: `<div className="absolute inset-0 …">`. It does NOT draw a border/header — the `Room` wrapper draws those.
- Reserve `pt-11` top and `pb-10` bottom so the room header and "+N more" overflow label stay visible.
- Uses `AnimatePresence mode="popLayout"` + `layoutId={`agent-${agent.key}`}` for enter/exit so agents hopping rooms animate smoothly.
- **Reuse `AgentSprite`** (`web/src/components/AgentSprite.tsx`) — do NOT draw a new humanoid. The sprite has built-in per-phase animations and self-dims when `status` is `done` / `idle`.
- Agent identity label near each station: `<AgentLabel agent={agent} />` from `./AgentLabel.tsx`.
- **Resting handling**: use `isResting(status)` / `isLive(status)` helpers from `./types.ts`. When resting, loops must pause (`animationPlayState: 'paused'`) — the sprite dims itself. Empty rooms show a themed standby message (e.g. `// STANDBY //`).
</scene_contract>

<animation_conventions>
- Scene-specific keyframes live at the END of `web/src/styles/globals.css`, namespaced with the phase prefix: `intake-*`, `strategy-*`, `build-*`, `review-*`, `test-*`, `deploy-*`. Prefix prevents cross-scene collisions when multiple scenes land in parallel.
- CSS `@keyframes` for loop-able motion. framer-motion for enter/exit springs and layout transitions.
- **Stagger** per-agent animations by `index * <ms>` so multiple agents in one room don't move in lockstep.
- All loops are infinite while the agent is active. Don't create "one-shot" animations that require state management — that breaks the declarative contract.
</animation_conventions>

<multi_agent_layout>
Every scene handles 1–4 agents. Common patterns in this repo:

- **Lanes** (Intake, Test, Deploy) — N vertical or horizontal lanes side-by-side, one per agent.
- **Grid** (Strategy, Review) — 1→1×1, 2→1×2, 3→2+1 with bottom-centered, 4→2×2.
- **Shared stage with stations** (Build) — a shared prop (tool rack) + N agent stations flex-distributed.

Sprite size should shrink with count: size `'lg'` for 1 agent, `'md'` for 2–3, `'sm'` for 4 (depending on how tight the scene is).
</multi_agent_layout>

<adding_a_new_phase>
Adding a new phase (e.g. `DOCS`) is a multi-file change — update them together or the dispatcher breaks:

1. **`src/events/types.ts`** — add the phase name to `PHASES`, `ROOMS`, `ROOM_BY_PHASE`. These three constants are canonical and must stay in sync.
2. **`web/src/types.ts`** — mirror the same update on the web side (the web has its own copy for package isolation).
3. **`web/src/components/RoomGlyph.tsx`** — add a glyph entry under `GLYPHS[<NEW_PHASE>]` (an SVG group for the wallpaper pattern + anchor emblem).
4. **`web/src/components/Office.tsx`** — add the phase to `ROOM_LAYOUT` so it takes a cell in the 2×3 grid (or extend the grid if you're going to 2×4 / 3×3).
5. **`web/src/components/scenes/<NewPhase>Scene.tsx`** — create the scene component, following the contract above. Start from `FallbackScene` and iterate.
6. **`web/src/components/scenes/SceneHost.tsx`** — register the new scene in the `switch` so the room renders it.
7. **`src/hooks/from-hook.ts`** — update `TOOL_PHASE` if a tool should route here, and `inferSubagentPhase` if certain subagent type names should land in this room.
8. **Tests** — add cases to `tests/from-hook.test.ts` covering any new routing.

Run `npx vitest run`, `npx tsc --noEmit`, `cd web && npx vite build`. Refresh `dist/web` if `ccc serve` is live.
</adding_a_new_phase>

<references>
- Scenes directory: `web/src/components/scenes/`
- Types: `web/src/components/scenes/types.ts`
- Sprite: `web/src/components/AgentSprite.tsx`
- Phase constants: `src/events/types.ts`, `web/src/types.ts`
</references>
