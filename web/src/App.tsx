import { useEffect, useState } from 'react';
import { useEventStream } from './hooks/useEventStream';
import { TopBar } from './components/TopBar';
import { Office } from './components/Office';
import { LiveFeed } from './components/LiveFeed';
import { Pipeline } from './components/Pipeline';
import { MissionStrip } from './components/MissionStrip';

const FEED_WIDTH_KEY = 'ccc:feedWidth';
const FEED_COLLAPSED_KEY = 'ccc:feedCollapsed';
const DEFAULT_FEED_WIDTH = 384; // 24rem

export function App() {
  const { state, status, sources, inject } = useEventStream();
  const multiProject = sources.length > 1;

  // Persisted UI prefs for the live feed pane.
  const [feedWidth, setFeedWidth] = useState<number>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(FEED_WIDTH_KEY) : null;
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 200 ? n : DEFAULT_FEED_WIDTH;
  });
  const [feedCollapsed, setFeedCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.localStorage.getItem(FEED_COLLAPSED_KEY) === '1';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(FEED_WIDTH_KEY, String(feedWidth));
    } catch {
      /* quota/denied — non-fatal */
    }
  }, [feedWidth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FEED_COLLAPSED_KEY, feedCollapsed ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [feedCollapsed]);

  return (
    <div className="relative h-screen w-screen overflow-hidden scanlines" style={{ color: 'var(--ccc-text)' }}>
      <div className="absolute inset-0 grid-backdrop opacity-60 pointer-events-none" />
      <div className="relative z-10 h-full flex flex-col p-4 gap-3">
        <TopBar
          flow={state.flow}
          missions={state.missions}
          connected={status.connected}
          sources={sources}
          activeProject={state.latestProject}
          inject={inject}
        />
        <Pipeline agents={state.agents} />
        <MissionStrip missions={state.missions} agents={state.agents} />
        <div
          className="flex-1 grid gap-3 min-h-0"
          style={{
            gridTemplateColumns: `minmax(0, 1fr) ${feedCollapsed ? 44 : feedWidth}px`,
            transition: 'grid-template-columns 220ms ease',
          }}
        >
          <Office agents={state.agents} />
          <LiveFeed
            lines={state.logLines}
            multiProject={multiProject}
            width={feedWidth}
            collapsed={feedCollapsed}
            onToggleCollapsed={() => setFeedCollapsed((c) => !c)}
            onResize={setFeedWidth}
          />
        </div>
      </div>
    </div>
  );
}
