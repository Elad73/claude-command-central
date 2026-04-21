import { PHASES, type Phase, type DashboardEvent } from '../events/types.js';
import type { AgentState, DashboardState } from './types.js';

export const LOG_BOUND = 8;

const clamp = (value: number, lower: number, upper: number): number =>
  Math.max(lower, Math.min(value, upper));

const isPhase = (value: string): value is Phase =>
  (PHASES as readonly string[]).includes(value);

const formatLogTimestamp = (ms: number): string => {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const appendLog = (
  lines: readonly string[],
  message: string,
  now: number,
): string[] => {
  const next = [...lines, `${formatLogTimestamp(now)}  ${message}`];
  return next.slice(-LOG_BOUND);
};

const createAgent = (name: string, now: number): AgentState => ({
  name,
  phase: 'PROMPT',
  status: 'idle',
  task: 'Waiting for assignment',
  updatedAt: now,
});

export function reduce(
  state: DashboardState,
  event: DashboardEvent,
  now: number = Date.now(),
): DashboardState {
  let { flow, agents, logLines } = state;

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
  } else if (event.type === 'agent') {
    const name = event.agent || 'unnamed-agent';
    const existing = agents[name] ?? createAgent(name, now);
    const upperPhase = event.phase?.toUpperCase();
    const nextPhase: Phase =
      upperPhase !== undefined && isPhase(upperPhase) ? upperPhase : existing.phase;
    const updated: AgentState = {
      ...existing,
      phase: nextPhase,
      ...(event.status !== undefined && { status: event.status }),
      ...(event.task !== undefined && { task: event.task }),
      updatedAt: now,
    };
    agents = { ...agents, [name]: updated };
  } else if (event.type === 'log') {
    if (event.message) {
      logLines = appendLog(logLines, event.message, now);
    }
  }

  if (event.type !== 'log' && event.message) {
    logLines = appendLog(logLines, event.message, now);
  }

  return { flow, agents, logLines };
}

export function reduceAll(
  state: DashboardState,
  events: readonly DashboardEvent[],
  now: () => number = Date.now,
): DashboardState {
  let next = state;
  for (const event of events) {
    next = reduce(next, event, now());
  }
  return next;
}
