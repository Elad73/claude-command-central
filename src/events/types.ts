export const PHASES = ['PROMPT', 'PLAN', 'BUILD', 'REVIEW', 'TEST', 'DEPLOY'] as const;
export type Phase = (typeof PHASES)[number];

export const STATUSES = ['idle', 'active', 'blocked', 'done', 'error'] as const;
export type Status = (typeof STATUSES)[number];

export const ROOMS = [
  { name: 'INTAKE', x: 2, y: 2 },
  { name: 'STRATEGY', x: 31, y: 2 },
  { name: 'BUILD BAY', x: 60, y: 2 },
  { name: 'REVIEW', x: 2, y: 12 },
  { name: 'QA LAB', x: 31, y: 12 },
  { name: 'DEPLOY', x: 60, y: 12 },
] as const;

export const ROOM_BY_PHASE: Record<Phase, string> = {
  PROMPT: 'INTAKE',
  PLAN: 'STRATEGY',
  BUILD: 'BUILD BAY',
  REVIEW: 'REVIEW',
  TEST: 'QA LAB',
  DEPLOY: 'DEPLOY',
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
