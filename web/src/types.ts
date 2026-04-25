export const PHASES = ['PROMPT', 'PLAN', 'BUILD', 'REVIEW', 'TEST', 'DEPLOY'] as const;
export type Phase = (typeof PHASES)[number];

export const ROOM_BY_PHASE: Record<Phase, string> = {
  PROMPT: 'INTAKE',
  PLAN: 'STRATEGY',
  BUILD: 'BUILD BAY',
  REVIEW: 'REVIEW',
  TEST: 'QA LAB',
  DEPLOY: 'DEPLOY',
};

export const PHASE_HEX: Record<Phase, string> = {
  PROMPT: '#3d7bff',
  PLAN: '#00f5ff',
  BUILD: '#ffb400',
  REVIEW: '#ff4df5',
  TEST: '#39ff14',
  DEPLOY: '#ff1e6b',
};

export type EventType = 'flow' | 'agent' | 'log';

export interface BaseEvent {
  v?: number;
  ts?: string;
  project?: string;
  type: EventType;
  message?: string;
}

export interface FlowEvent extends BaseEvent {
  type: 'flow';
  title?: string;
  objective?: string;
  status?: string;
  progress?: number;
}

export interface AgentEvent extends BaseEvent {
  type: 'agent';
  agent: string;
  phase?: string;
  status?: string;
  task?: string;
}

export interface LogEvent extends BaseEvent {
  type: 'log';
  message: string;
}

export type DashboardEvent = FlowEvent | AgentEvent | LogEvent;

export interface FlowState {
  title: string;
  objective: string;
  status: string;
  progress: number;
  updatedAt: number;
}

export interface AgentState {
  key: string; // namespaced: `${project}::${name}`
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
  /** When this mission first transitioned to running. 0 until the first `running` flow event. */
  startedAt: number;
  /** When the mission flipped to `done`. Set on the transition; never overwritten while still done. */
  completedAt?: number;
  /** Total events emitted by this project this lifecycle (resets on a fresh run). */
  actionCount: number;
}

export interface DashboardState {
  flow: FlowState;
  agents: Record<string, AgentState>;
  logLines: LogLine[];
  latestProject: string | null;
  lastEventAt: number;
  /** Per-project mission (the running user prompt + flow status for that project). */
  missions: Record<string, ProjectMission>;
}

export interface FeedSource {
  path: string;
  project: string;
}

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

/** Default mission shape — single source of truth for new project buckets. */
export const emptyMission = (project: string, now: number): ProjectMission => ({
  project,
  objective: '',
  status: 'idle',
  progress: 0,
  updatedAt: now,
  startedAt: 0,
  actionCount: 0,
});

/** Strip `@project` or `::project` suffix to show a clean display name. */
export const displayName = (rawName: string): string => {
  const atIdx = rawName.indexOf('@');
  if (atIdx >= 0) return rawName.slice(0, atIdx);
  return rawName;
};
