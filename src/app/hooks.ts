import { useEffect, useMemo, useState } from 'react';
import { reduce } from '../state/reducer.js';
import { initialDashboardState } from '../state/types.js';
import type { DashboardState } from '../state/types.js';
import type { MultiFeedWatcher } from '../events/watcher.js';
import { PHASES, type Phase } from '../events/types.js';

/** Ticks at the given interval; useful for blink/pulse animations. */
export function useTick(intervalMs = 500): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs]);
  return tick;
}

/** Subscribes to a watcher and folds events into dashboard state. */
export function useDashboard(watcher: MultiFeedWatcher): DashboardState {
  const [state, setState] = useState<DashboardState>(() => initialDashboardState());

  useEffect(() => {
    const unsubEvent = watcher.onEvent((event) => {
      setState((prev) => reduce(prev, event));
    });
    void watcher.start();
    return () => {
      unsubEvent();
      watcher.stop();
    };
  }, [watcher]);

  return state;
}

/** Picks the most recently active phase to highlight in the pipeline strip. */
export function useActivePhase(state: DashboardState): Phase {
  return useMemo(() => {
    const agents = Object.values(state.agents);
    if (agents.length === 0) return 'PROMPT';
    let latest = agents[0]!;
    for (const agent of agents) if (agent.updatedAt > latest.updatedAt) latest = agent;
    return (PHASES as readonly Phase[]).includes(latest.phase) ? latest.phase : 'PROMPT';
  }, [state.agents]);
}
