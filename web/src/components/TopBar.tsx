import { useState } from 'react';
import type { FeedSource, FlowState, DashboardEvent } from '../types';
import { ProjectChip } from './ProjectChip';

interface Props {
  flow: FlowState;
  connected: boolean;
  sources: FeedSource[];
  activeProject: string | null;
  inject: (event: DashboardEvent) => void;
}

export function TopBar({ flow, connected, sources, activeProject, inject }: Props) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 rounded-lg border border-neon-cyan/30 bg-ink-900/70 backdrop-blur-sm"
      style={{ boxShadow: '0 0 24px rgba(0,245,255,0.08), inset 0 0 14px rgba(0,245,255,0.05)' }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-4">
          <span
            className="font-display font-black text-2xl tracking-widest"
            style={{ color: '#00f5ff', textShadow: '0 0 8px #00f5ff, 0 0 20px #00f5ff' }}
          >
            CCC //
          </span>
          <span className="font-display text-lg tracking-wider" style={{ color: '#e5e7ff' }}>
            {flow.title}
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs uppercase tracking-widest">
          <WarmUpButton inject={inject} />
          <StatusBadge label="status" value={flow.status} />
          <ProgressBadge value={flow.progress} />
          <ConnectionDot connected={connected} />
        </div>
      </div>

      {/* Objective line */}
      {flow.objective && (
        <div className="flex items-start gap-2 font-mono text-xs" style={{ color: '#e5e7ff' }}>
          <span className="tracking-widest" style={{ color: '#00f5ffBB' }}>
            OBJECTIVE //
          </span>
          <span className="truncate">{flow.objective}</span>
        </div>
      )}

      {/* Watched projects */}
      {sources.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[0.65rem] tracking-[0.25em] uppercase" style={{ color: '#9ca3af' }}>
            watching
          </span>
          {sources.map((s) => (
            <ProjectChip
              key={s.project}
              project={s.project}
              active={s.project === activeProject}
              size="sm"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: '#9ca3af' }}>{label}</span>
      <span className="font-bold" style={{ color: statusColor(value) }}>
        {value}
      </span>
    </div>
  );
}

function ProgressBadge({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ color: '#9ca3af' }}>progress</span>
      <div
        className="h-2 w-40 rounded-full overflow-hidden"
        style={{
          background: '#11112a',
          border: '1px solid #00f5ff33',
        }}
      >
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{
            width: `${value}%`,
            background: 'linear-gradient(90deg, #00f5ff, #ff4df5)',
            boxShadow: '0 0 12px #00f5ff',
          }}
        />
      </div>
      <span className="font-bold tabular-nums" style={{ color: '#00f5ff' }}>
        {value}%
      </span>
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{
          background: connected ? '#39ff14' : '#ff1e6b',
          boxShadow: connected ? '0 0 8px #39ff14' : '0 0 8px #ff1e6b',
          animation: connected ? 'pulse-glow 2s infinite' : 'flicker 1s infinite',
        }}
      />
      <span style={{ color: connected ? '#d1fae5' : '#fecdd3' }}>
        {connected ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'running':
    case 'active':
      return '#39ff14';
    case 'done':
      return '#00f5ff';
    case 'blocked':
    case 'error':
      return '#ff1e6b';
    default:
      return '#d4d4d8';
  }
}

/**
 * Walks a synthetic demo agent through every room, holding in each for a
 * few seconds so you can see:
 *   • the room-specific animation the agent performs
 *   • the corner occupancy lamps turning on when it enters and off when it leaves
 * The agent is client-only (never written to any feed) and removed at the end.
 */
function WarmUpButton({ inject }: { inject: (event: DashboardEvent) => void }) {
  const [running, setRunning] = useState(false);

  const startWarmUp = () => {
    if (running) return;
    setRunning(true);

    const project = 'warmup';
    const agent = 'warmup-bot';
    const hold = 2800; // ms per room — long enough to perceive each animation

    const steps: Array<{
      phase: 'PROMPT' | 'PLAN' | 'BUILD' | 'REVIEW' | 'TEST' | 'DEPLOY';
      task: string;
    }> = [
      { phase: 'PROMPT', task: 'Listening to the user prompt…' },
      { phase: 'PLAN', task: 'Sketching the plan…' },
      { phase: 'BUILD', task: 'Building the feature…' },
      { phase: 'REVIEW', task: 'Scanning the diff for issues…' },
      { phase: 'TEST', task: 'Running the test suite…' },
      { phase: 'DEPLOY', task: 'Shipping to production…' },
    ];

    const emit = (
      phase: (typeof steps)[number]['phase'],
      status: string,
      task: string,
    ) => {
      inject({
        v: 1,
        ts: new Date().toISOString(),
        project,
        type: 'agent',
        agent,
        phase,
        status,
        task,
      });
    };

    inject({
      v: 1,
      ts: new Date().toISOString(),
      project,
      type: 'log',
      message: '⚡ warm-up sequence started — demo agent walking every room',
    });

    steps.forEach((step, i) => {
      setTimeout(() => emit(step.phase, 'active', step.task), i * hold);
    });

    // Final DEPLOY → DONE pause so the launching animation finishes,
    // then despawn and reset the running flag.
    const total = steps.length * hold;
    setTimeout(() => emit('DEPLOY', 'done', 'Warm-up complete'), total);
    setTimeout(() => {
      inject({
        v: 1,
        ts: new Date().toISOString(),
        project,
        type: 'agent',
        agent,
        status: 'despawn',
      });
      inject({
        v: 1,
        ts: new Date().toISOString(),
        project,
        type: 'log',
        message: '✓ warm-up sequence complete',
      });
      setRunning(false);
    }, total + 1800);
  };

  return (
    <button
      type="button"
      onClick={startWarmUp}
      disabled={running}
      className="font-display tracking-widest font-bold uppercase rounded-md transition-all"
      style={{
        fontSize: 11,
        padding: '6px 14px',
        background: running ? '#00f5ff18' : '#00f5ff10',
        border: `1px solid ${running ? '#00f5ffAA' : '#00f5ff66'}`,
        color: running ? '#00f5ff' : '#a5f3fc',
        boxShadow: running ? '0 0 14px #00f5ff88, inset 0 0 8px #00f5ff33' : 'none',
        textShadow: running ? '0 0 6px #00f5ff' : 'none',
        cursor: running ? 'progress' : 'pointer',
        opacity: running ? 0.85 : 1,
      }}
    >
      {running ? '⚡ warming…' : '⚡ warm up'}
    </button>
  );
}
