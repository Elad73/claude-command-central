import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardEvent, DashboardState, FeedSource } from '../types';
import { initialDashboardState } from '../types';
import { reduce } from '../reducer';

export interface StreamStatus {
  connected: boolean;
}

/** Stale-agent GC: how often we sweep, and how old an agent can get. */
const GC_INTERVAL_MS = 15_000;
/** done/idle agents: finished work lingering as a brief celebration card. */
const STALE_TTL_MS = 60_000;
/**
 * active/blocked agents: crash backstop only. Clean session ends clear these
 * instantly via the reducer's flow→done cascade; this evicts agents whose
 * session was killed without a `Stop`. Long enough not to drop a genuinely
 * long-running tool call.
 */
const ACTIVE_STALE_TTL_MS = 30 * 60_000;

export function useEventStream(url: string = '/events'): {
  state: DashboardState;
  status: StreamStatus;
  sources: FeedSource[];
  inject: (event: DashboardEvent) => void;
} {
  const [state, setState] = useState<DashboardState>(() => initialDashboardState());
  const [status, setStatus] = useState<StreamStatus>({ connected: false });
  const [sources, setSources] = useState<FeedSource[]>([]);
  // `hydratedRef` prevents the snapshot fetch (or retries of it under React
  // StrictMode double-invoke) from clobbering SSE events that may have landed
  // before the fetch settled.
  const hydratedRef = useRef(false);

  useEffect(() => {
    let closed = false;
    const load = async () => {
      try {
        const r = await fetch('/api/sources');
        const data = (await r.json()) as { sources: FeedSource[] };
        if (!closed) setSources(data.sources ?? []);
      } catch {
        /* transient */
      }
    };
    void load();
    // Re-poll so new `ccc init`s appear in the WATCHING row without browser reload.
    const timer = setInterval(() => void load(), 5000);
    return () => {
      closed = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let closed = false;
    let source: EventSource | null = null;

    const start = async () => {
      // Hydrate from the server snapshot first so a page refresh shows the
      // live office immediately instead of waiting for the next event.
      if (!hydratedRef.current) {
        try {
          const res = await fetch('/api/snapshot');
          if (res.ok) {
            const snapshot = (await res.json()) as DashboardState;
            if (!closed) {
              setState(snapshot);
              hydratedRef.current = true;
            }
          }
        } catch (err) {
          // Server briefly unreachable — fall back to empty state + SSE rebuild.
          // eslint-disable-next-line no-console
          console.warn('[ccc] snapshot hydration failed — will rebuild from SSE', err);
        }
      }

      if (closed) return;
      source = new EventSource(url);

      source.addEventListener('open', () => {
        if (!closed) setStatus({ connected: true });
      });

      source.addEventListener('error', () => {
        if (!closed) setStatus({ connected: false });
      });

      source.addEventListener('message', (ev: MessageEvent) => {
        if (closed) return;
        try {
          const event = JSON.parse(ev.data) as DashboardEvent;
          setState((prev) => reduce(prev, event));
          setStatus((prev) => (prev.connected ? prev : { connected: true }));
        } catch {
          // Malformed payload — ignore
        }
      });
    };

    void start();

    return () => {
      closed = true;
      if (source) source.close();
    };
  }, [url]);

  // Stale-agent garbage collector. Synthesizes `despawn` events for agents
  // that have been done/idle long enough; the reducer already handles the
  // opcode and AnimatePresence on the agent card handles the exit animation.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setState((prev) => {
        const victims: Array<{ project: string; rawName: string }> = [];
        for (const agent of Object.values(prev.agents)) {
          const age = now - agent.updatedAt;
          const resting = agent.status === 'done' || agent.status === 'idle';
          const working = agent.status === 'active' || agent.status === 'blocked';
          const stale =
            (resting && age > STALE_TTL_MS) ||
            (working && age > ACTIVE_STALE_TTL_MS);
          if (stale) victims.push({ project: agent.project, rawName: agent.rawName });
        }
        if (victims.length === 0) return prev;
        let next = prev;
        for (const v of victims) {
          next = reduce(
            next,
            { type: 'agent', agent: v.rawName, project: v.project, status: 'despawn' },
            now,
          );
        }
        return next;
      });
    };
    const id = setInterval(tick, GC_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const inject = useCallback((event: DashboardEvent) => {
    setState((prev) => reduce(prev, event));
  }, []);

  return { state, status, sources, inject };
}
