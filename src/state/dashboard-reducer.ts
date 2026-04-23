// Server-side mirror of `web/src/reducer.ts` + `web/src/types.ts`. The two copies
// are intentionally duplicated (no monorepo plumbing) so the web and server can
// evolve independently while sharing the snapshot wire shape. Keep them in sync —
// if you change the shape here, mirror it in `web/src/reducer.ts` / `web/src/types.ts`.
//
// This file deliberately does NOT touch `src/state/reducer.ts` or
// `src/state/types.ts`, which are used by the Ink TUI and have a different shape.

import { PHASES, type Phase, type DashboardEvent } from '../events/types.js';

const LOG_BOUND = 60;

export interface FlowState {
  title: string;
  objective: string;
  status: string;
  progress: number;
  updatedAt: number;
}

export interface AgentState {
  key: string; // namespaced: `${project}::${rawName}`
  name: string; // display name (with project suffix stripped)
  rawName: string; // as emitted
  project: string;
  phase: Phase;
  status: string;
  task: string;
  updatedAt: number;
}

export interface LogLine {
  ts: string;
  project: string;
  message: string;
}

export interface ProjectMission {
  project: string;
  objective: string;
  status: string;
  progress: number;
  updatedAt: number;
}

export interface DashboardState {
  flow: FlowState;
  agents: Record<string, AgentState>;
  logLines: LogLine[];
  latestProject: string | null;
  lastEventAt: number;
  missions: Record<string, ProjectMission>;
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(v, hi));

const isPhase = (value: string): value is Phase =>
  (PHASES as readonly string[]).includes(value);

const fmt = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const appendLog = (
  lines: readonly LogLine[],
  project: string,
  message: string,
  now: number,
): LogLine[] => [...lines, { ts: fmt(now), project, message }].slice(-LOG_BOUND);

const keyOf = (project: string, rawName: string): string => `${project}::${rawName}`;

/** Strip `@project` or `::project` suffix to show a clean display name. */
export const displayName = (rawName: string): string => {
  const atIdx = rawName.indexOf('@');
  if (atIdx >= 0) return rawName.slice(0, atIdx);
  return rawName;
};

const newAgent = (project: string, rawName: string, now: number): AgentState => ({
  key: keyOf(project, rawName),
  name: displayName(rawName),
  rawName,
  project,
  phase: 'PROMPT',
  status: 'idle',
  task: 'Waiting for assignment',
  updatedAt: now,
});

export const initialDashboardState = (): DashboardState => ({
  flow: {
    title: 'Claude Code Mission Control',
    objective: 'Waiting for prompt',
    status: 'idle',
    progress: 0,
    updatedAt: Date.now(),
  },
  agents: {},
  logLines: [],
  latestProject: null,
  lastEventAt: 0,
  missions: {},
});

export function reduce(
  state: DashboardState,
  event: DashboardEvent,
  now: number = Date.now(),
): DashboardState {
  let { flow, agents, logLines, missions } = state;
  const project = event.project ?? 'default';
  const latestProject = project;
  const lastEventAt = now;

  if (event.type === 'flow') {
    flow = {
      ...flow,
      ...(event.title !== undefined && { title: event.title }),
      ...(event.objective !== undefined && { objective: event.objective }),
      ...(event.status !== undefined && { status: event.status }),
      ...(event.progress !== undefined && {
        progress: clamp(Math.trunc(event.progress), 0, 100),
      }),
      updatedAt: now,
    };
    const prev: ProjectMission = missions[project] ?? {
      project,
      objective: '',
      status: 'idle',
      progress: 0,
      updatedAt: now,
    };
    const nextMission: ProjectMission = {
      ...prev,
      project,
      ...(event.objective !== undefined && { objective: event.objective }),
      ...(event.status !== undefined && { status: event.status }),
      ...(event.progress !== undefined && {
        progress: clamp(Math.trunc(event.progress), 0, 100),
      }),
      updatedAt: now,
    };
    missions = { ...missions, [project]: nextMission };
  } else if (event.type === 'agent') {
    const rawName = event.agent || 'unnamed-agent';
    const key = keyOf(project, rawName);
    // Mirrors the web reducer: despawn removes the agent entirely.
    if (event.status === 'despawn') {
      if (key in agents) {
        const next = { ...agents };
        delete next[key];
        agents = next;
      }
    } else {
      const existing = agents[key] ?? newAgent(project, rawName, now);
      const upper = event.phase?.toUpperCase();
      const nextPhase: Phase =
        upper !== undefined && isPhase(upper) ? upper : existing.phase;
      const updated: AgentState = {
        ...existing,
        phase: nextPhase,
        ...(event.status !== undefined && { status: event.status }),
        ...(event.task !== undefined && { task: event.task }),
        updatedAt: now,
      };
      agents = { ...agents, [key]: updated };
    }
  } else if (event.type === 'log') {
    if (event.message) logLines = appendLog(logLines, project, event.message, now);
  }

  if (event.type !== 'log' && event.message) {
    logLines = appendLog(logLines, project, event.message, now);
  }

  return { flow, agents, logLines, latestProject, lastEventAt, missions };
}

/**
 * Pure view transform: drop agents that are stale (done/idle and older than
 * ttlMs). Does not mutate the input. Used for the `/api/snapshot` response so
 * fresh clients hydrate into a clean office without zombie agents from past
 * sessions.
 */
export function pruneStale(
  state: DashboardState,
  now: number,
  ttlMs: number,
): DashboardState {
  const pruned: Record<string, AgentState> = {};
  let changed = false;
  for (const [key, agent] of Object.entries(state.agents)) {
    const stale =
      (agent.status === 'done' || agent.status === 'idle') &&
      now - agent.updatedAt > ttlMs;
    if (stale) {
      changed = true;
      continue;
    }
    pruned[key] = agent;
  }
  if (!changed) return state;
  return { ...state, agents: pruned };
}
