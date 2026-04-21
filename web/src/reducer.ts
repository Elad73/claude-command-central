import {
  PHASES,
  displayName,
  type AgentState,
  type DashboardEvent,
  type DashboardState,
  type LogLine,
  type Phase,
  type ProjectMission,
} from './types';

const LOG_BOUND = 60;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
const isPhase = (s: string): s is Phase => (PHASES as readonly string[]).includes(s);

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
    // Per-project mission bucket: the viewer needs to know what each project
    // is *actually working on* (the prompt) — distinct from what the tools
    // are doing right now.
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
    // Client-side despawn: lets the warmup demo (and tests) cleanly remove
    // a synthetic agent without leaking them across the session. Real hook
    // translators never emit this status.
    if (event.status === 'despawn') {
      const next = { ...agents };
      delete next[key];
      agents = next;
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
