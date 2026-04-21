import type { AgentState } from '../../types';

/**
 * Common contract every room-scene component implements.
 *
 *   - `agents` is pre-sliced to at most MAX_STATIONS (4 agents). Scenes
 *     position each agent in a scene-specific "station" so they all have a
 *     theatrical role, and so multiple concurrent agents don't overlap.
 *   - `color` is the phase/room color — use it for stroke / glow accents.
 *   - `resting(agent)` tells the scene whether the agent is idle or done so
 *     it can freeze that agent's loop and dim its sprite.
 *   - The scene fills the full parent box (absolute-positioned); it should
 *     NOT draw its own border or header (the Room frame already does that).
 *
 * Scenes are loops — the per-agent choreography plays indefinitely while the
 * agent's status is 'active' / 'running', and pauses / powers down when the
 * agent is 'done' or 'idle' so a viewer sees the work actually stopping.
 */
export interface SceneProps {
  agents: readonly AgentState[];
  color: string;
}

export const MAX_STATIONS = 4;

export const isResting = (status: string): boolean =>
  status === 'done' || status === 'idle';

export const isLive = (status: string): boolean =>
  status === 'active' || status === 'running';
