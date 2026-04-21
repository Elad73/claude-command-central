import type { Phase } from '../events/types.js';

export const PHASE_COLORS: Record<Phase, string> = {
  PROMPT: 'blueBright',
  PLAN: 'cyan',
  BUILD: 'yellow',
  REVIEW: 'magenta',
  TEST: 'green',
  DEPLOY: 'red',
};

export const statusColor = (status: string): string => {
  switch (status) {
    case 'active':
    case 'running':
      return 'green';
    case 'done':
      return 'blue';
    case 'blocked':
    case 'error':
      return 'red';
    case 'idle':
    default:
      return 'gray';
  }
};
