import { useCallback, useEffect, useState } from 'react';
import type { DashboardEvent, DashboardState, FeedSource } from '../types';
import { initialDashboardState } from '../types';
import { reduce } from '../reducer';

export interface StreamStatus {
  connected: boolean;
}

export function useEventStream(url: string = '/events'): {
  state: DashboardState;
  status: StreamStatus;
  sources: FeedSource[];
  inject: (event: DashboardEvent) => void;
} {
  const [state, setState] = useState<DashboardState>(() => initialDashboardState());
  const [status, setStatus] = useState<StreamStatus>({ connected: false });
  const [sources, setSources] = useState<FeedSource[]>([]);

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
    const source = new EventSource(url);

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
        // If any message arrives, we're definitely connected.
        setStatus((prev) => (prev.connected ? prev : { connected: true }));
      } catch {
        // Malformed payload — ignore
      }
    });

    return () => {
      closed = true;
      source.close();
    };
  }, [url]);

  const inject = useCallback((event: DashboardEvent) => {
    setState((prev) => reduce(prev, event));
  }, []);

  return { state, status, sources, inject };
}
