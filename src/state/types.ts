import type { Phase } from '../events/types.js';

export interface FlowState {
  title: string;
  objective: string;
  status: string;
  progress: number;
  updatedAt: number;
}

export interface AgentState {
  name: string;
  phase: Phase;
  status: string;
  task: string;
  updatedAt: number;
}

export interface DashboardState {
  flow: FlowState;
  agents: Record<string, AgentState>;
  logLines: string[];
}

export const initialFlowState = (): FlowState => ({
  title: 'Claude Code Mission Control',
  objective: 'Waiting for prompt',
  status: 'idle',
  progress: 0,
  updatedAt: Date.now(),
});

export const initialDashboardState = (): DashboardState => ({
  flow: initialFlowState(),
  agents: {},
  logLines: [],
});
