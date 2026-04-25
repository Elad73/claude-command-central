import {
  PHASES,
  displayName,
  emptyMission,
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
    const prev: ProjectMission = missions[project] ?? emptyMission(project, now);
    // Fresh-run detection: a new `running` flow event arriving while the
    // prior mission is `done` means a new user prompt started a new
    // session. Reset the lifecycle counters so the completion banner is
    // tied to *this* run and not the previous one.
    const isFreshRun =
      event.status === 'running' && prev.status === 'done';
    const base: ProjectMission = isFreshRun
      ? {
          ...prev,
          startedAt: 0,
          completedAt: undefined,
          actionCount: 0,
        }
      : prev;
    let nextMission: ProjectMission = {
      ...base,
      project,
      ...(event.objective !== undefined && { objective: event.objective }),
      ...(event.status !== undefined && { status: event.status }),
      ...(event.progress !== undefined && {
        progress: clamp(Math.trunc(event.progress), 0, 100),
      }),
      updatedAt: now,
    };
    // Lifecycle stamps:
    //   • startedAt: latched to `now` on the first `running` event seen for
    //     this lifecycle (zero-init or fresh-run reset).
    //   • completedAt: latched on the running→done transition; never
    //     overwritten while still done (so the timestamp is stable).
    if (event.status === 'running' && nextMission.startedAt === 0) {
      nextMission = { ...nextMission, startedAt: now };
    }
    if (event.status === 'done' && nextMission.completedAt === undefined) {
      nextMission = { ...nextMission, completedAt: now };
    }
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

  // Universal per-project action counter. Every event with a project bumps
  // the mission's actionCount — used by completed-mission cards to show
  // "47 actions" so the user gets a sense of the run's intensity. Auto-
  // creates the mission bucket if this is the first event from a project
  // (e.g. an agent event arriving before any flow event). The synthetic
  // `despawn` opcode is the GC's exit door — not a real action — so we
  // don't bump the count and we don't auto-create a bucket for it.
  const isDespawn = event.type === 'agent' && event.status === 'despawn';
  if (!isDespawn) {
    const existing = missions[project];
    const baseMission = existing ?? emptyMission(project, now);
    missions = {
      ...missions,
      [project]: {
        ...baseMission,
        actionCount: baseMission.actionCount + 1,
      },
    };
  }

  return { flow, agents, logLines, latestProject, lastEventAt, missions };
}
