---
name: ccc-parallel-fanout
description: Use when the user asks for multi-component UI work or multi-file independent deliverables (e.g. "add six room scenes", "create four new widgets"). Codifies the spawn-one-subagent-per-file pattern that was validated in this repo and outperforms sequential work. Invoke before starting such a task, not during.
---

<objective>
When the user asks for N independent file-level deliverables in one go, spawn N parallel subagents — one per file — rather than doing them sequentially in the main context. Validated in this repo for the six theatrical room scenes (`web/src/components/scenes/*`), which landed clean, on time, and without cross-file conflicts.
</objective>

<when_to_use>
Fan out when ALL of these hold:
- The deliverables are independent file-level artifacts (one file per agent).
- Each file can be built and verified in isolation (tsc + the relevant build command).
- The shared surfaces are small and well-defined (a types file, a CSS file, a dispatcher).

Stay sequential when:
- The deliverables form a single growing file.
- Order matters (one artifact's shape informs the next).
- There are fewer than three artifacts — orchestration overhead isn't paid back.
</when_to_use>

<workflow>
1. **Scaffold first.** Before spawning, create stub files that re-export a fallback component or return an empty placeholder. The app must build with just stubs. This is non-negotiable — a failing subagent can't brick the tree.
2. **Define the shared contract.** Write a `types.ts` and/or a dispatcher (in this repo: `web/src/components/scenes/{types.ts,SceneHost.tsx}`) that every agent will import. Include `SceneProps`, helpers like `isResting`, and any constants like `MAX_STATIONS`.
3. **Namespace shared surfaces.** If multiple agents append to a shared file (the CSS keyframes file is the example here), tell each agent to prefix its additions — `intake-*`, `strategy-*`, etc. This prevents keyframe name collisions without locking.
4. **Spawn in parallel.** One `Agent` call per deliverable in a **single message** so they run concurrently. Use `run_in_background: true` for the later ones if you want the main thread to keep moving.
5. **Self-verification per agent.** Every prompt must instruct the agent to run the build itself before reporting done:
   ```
   cd /home/eladr/personal-space/playground/claude-command-central && npx tsc --noEmit
   cd /home/eladr/personal-space/playground/claude-command-central/web && npx vite build
   ```
   "Green" means really green. The main thread should not have to re-verify each one.
6. **Integrate at the end.** Once all agents report, run the full verify from the main thread (`npx vitest run`, `npm run build`, web `vite build`, copy `web/dist` → `dist/web` if serving). Hard-refresh the browser if `ccc serve` is live.
</workflow>

<per_agent_prompt_requirements>
- ONE target file path explicitly named; forbidden to touch anything else.
- Must read the shared contract (`types.ts`, dispatcher) first.
- Shared-surface appends use the namespace prefix you assigned.
- Must run build + tsc before reporting.
- Must report under 150 words: what it built, trade-offs, grid/layout scaling chosen.
</per_agent_prompt_requirements>

<tradeoffs>
- **Speed**: 6 agents finished a ~30-minute sequential job in ~5 wall-clock minutes.
- **Context**: each agent's output lives in its own transcript, not the main context — this is the biggest win for long-running projects.
- **Coordination cost**: each agent needs a self-contained prompt — longer to draft. Worth it above N=3, overkill below.
- **Risk**: stub scaffolding is the safety net. Without it, one failing agent blocks everyone.
</tradeoffs>

<references>
- Memory: `~/.claude/projects/-home-eladr-personal-space-playground-claude-command-central/memory/parallel-scene-fanout.md`
- Concrete example: `web/src/components/scenes/{IntakeScene,StrategyScene,BuildScene,ReviewScene,TestScene,DeployScene}.tsx` — all written by parallel subagents on 2026-04-21.
</references>
