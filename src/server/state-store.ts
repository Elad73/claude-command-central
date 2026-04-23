import type { DashboardEvent } from '../events/types.js';
import {
  initialDashboardState,
  reduce,
  type DashboardState,
} from '../state/dashboard-reducer.js';

export interface StateStore {
  get(): DashboardState;
  apply(event: DashboardEvent): void;
}

/**
 * Server-side accumulator over the same reducer the web client uses, so new
 * browser connections can hydrate via `/api/snapshot` instead of waiting for
 * the next event. Apply is wrapped in try/catch — malformed or unexpected
 * events must never crash the Fastify process (hooks-must-never-fail-loud).
 */
export function createStateStore(): StateStore {
  let state: DashboardState = initialDashboardState();
  return {
    get: () => state,
    apply: (event: DashboardEvent) => {
      try {
        state = reduce(state, event);
      } catch {
        // Defensive: the reducer is pure and total, but if anything about
        // a future event shape trips it up we swallow rather than crash.
      }
    },
  };
}
