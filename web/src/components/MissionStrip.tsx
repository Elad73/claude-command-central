import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AgentState, ProjectMission } from '../types';
import { projectColor, projectShortCode } from './ProjectChip';

interface Props {
  missions: Record<string, ProjectMission>;
  agents: Record<string, AgentState>;
}

/**
 * Shows each project's *mission* (the prompt the team is working on) as its
 * own card. Agent bubbles stay tactical (current tool call); this strip
 * answers "what are they trying to accomplish?" at a glance. One card per
 * active project, colored + labeled with its short code. Hover a card to
 * reveal the full mission text and team-size breakdown.
 */
export function MissionStrip({ missions, agents }: Props) {
  const all = Object.values(missions)
    .filter((m) => m.objective && m.objective.trim().length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (all.length === 0) return null;

  const activeByProject = new Map<string, { total: number; live: number }>();
  for (const a of Object.values(agents)) {
    const bucket = activeByProject.get(a.project) ?? { total: 0, live: 0 };
    bucket.total += 1;
    if (a.status === 'active' || a.status === 'running') bucket.live += 1;
    activeByProject.set(a.project, bucket);
  }

  return (
    <div
      // `overflow-visible` (default) is important so the hover popover isn't
      // clipped. We wrap to new rows rather than horizontally scroll so the
      // popover is never cut off by a scroll container.
      className="flex items-stretch gap-2 flex-wrap pb-1"
      style={{ position: 'relative' }}
    >
      {all.map((m) => {
        const counts = activeByProject.get(m.project) ?? { total: 0, live: 0 };
        return <MissionCard key={m.project} mission={m} counts={counts} />;
      })}
    </div>
  );
}

function MissionCard({
  mission,
  counts,
}: {
  mission: ProjectMission;
  counts: { total: number; live: number };
}) {
  const color = projectColor(mission.project);
  const code = projectShortCode(mission.project);
  const done = mission.status === 'done';
  const running = counts.live > 0;
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative flex items-center gap-3 rounded-md border backdrop-blur-sm min-w-0"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '6px 12px',
        background: done ? `${color}08` : `${color}18`,
        borderColor: done ? `${color}44` : `${color}AA`,
        boxShadow: running ? `0 0 12px ${color}40, inset 0 0 8px ${color}20` : 'none',
        opacity: done ? 0.65 : 1,
        flex: '1 1 260px',
        minWidth: 220,
        maxWidth: 520,
        cursor: 'help',
      }}
    >
      {/* Project code badge */}
      <div
        className="flex flex-col items-center justify-center flex-shrink-0 font-display font-black"
        style={{
          width: 44,
          height: 36,
          borderRadius: 6,
          background: `${color}22`,
          border: `1px solid ${color}`,
          color: '#ffffff',
          textShadow: `0 0 8px ${color}`,
          fontSize: 13,
          letterSpacing: '0.1em',
        }}
      >
        {code}
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="font-display text-[0.65rem] tracking-[0.25em] font-bold uppercase"
            style={{ color: `${color}DD`, textShadow: `0 0 6px ${color}` }}
          >
            Mission
          </span>
          <StatusPip status={mission.status} color={color} />
          {counts.total > 0 && (
            <span className="font-mono text-[0.65rem]" style={{ color: `${color}BB` }}>
              {counts.live}/{counts.total}▲
            </span>
          )}
        </div>
        <div
          className="font-mono text-xs truncate"
          style={{ color: '#e5e7ff' }}
          // Native tooltip intentionally suppressed — the hover popover below
          // is the richer replacement.
        >
          {mission.objective}
        </div>
      </div>

      <AnimatePresence>
        {hover && <MissionDetail mission={mission} counts={counts} color={color} />}
      </AnimatePresence>
    </div>
  );
}

/**
 * Full-mission hover popover. Shows the entire objective text (no truncation)
 * plus a metadata footer so the viewer gets the whole picture without leaving
 * the dashboard.
 */
function MissionDetail({
  mission,
  counts,
  color,
}: {
  mission: ProjectMission;
  counts: { total: number; live: number };
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="absolute z-50 pointer-events-none"
      style={{
        top: 'calc(100% + 8px)',
        left: 0,
        minWidth: 320,
        maxWidth: 520,
      }}
    >
      <div
        className="rounded-md border backdrop-blur-md"
        style={{
          padding: '10px 14px',
          background: 'rgba(5, 5, 13, 0.94)',
          borderColor: color,
          boxShadow: `0 0 16px ${color}66, 0 10px 32px rgba(0,0,0,0.45), inset 0 0 10px ${color}15`,
        }}
      >
        {/* Arrow pointing up to the card */}
        <div
          className="absolute"
          style={{
            top: -5,
            left: 20,
            width: 10,
            height: 10,
            background: 'rgba(5, 5, 13, 0.94)',
            borderTop: `1px solid ${color}`,
            borderLeft: `1px solid ${color}`,
            transform: 'rotate(45deg)',
          }}
        />

        {/* Header — full project slug, not just the code */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="font-display text-[0.65rem] tracking-[0.3em] font-bold uppercase"
            style={{ color: `${color}DD`, textShadow: `0 0 6px ${color}` }}
          >
            {mission.project}
          </span>
          <StatusPip status={mission.status} color={color} />
        </div>

        {/* Full objective text, wrapping */}
        <div
          className="font-mono text-[0.78rem] leading-snug whitespace-pre-wrap break-words"
          style={{ color: '#f5f5ff' }}
        >
          {mission.objective}
        </div>

        {/* Footer: team counts + progress + last-updated */}
        <div
          className="flex items-center gap-3 mt-2 pt-2 font-mono text-[0.65rem]"
          style={{
            borderTop: `1px solid ${color}33`,
            color: `${color}BB`,
          }}
        >
          <span>
            team <strong style={{ color: '#e5e7ff' }}>{counts.live}</strong>
            <span style={{ opacity: 0.55 }}>/{counts.total}</span> active
          </span>
          <span style={{ color: `${color}77` }}>·</span>
          <span>
            progress <strong style={{ color: '#e5e7ff' }}>{mission.progress}%</strong>
          </span>
          <span style={{ color: `${color}77` }}>·</span>
          <span>{relativeTime(mission.updatedAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function StatusPip({ status, color }: { status: string; color: string }) {
  const col =
    status === 'done'
      ? '#00f5ff'
      : status === 'error' || status === 'blocked'
        ? '#ff1e6b'
        : status === 'running'
          ? '#39ff14'
          : color;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono uppercase tracking-wider"
      style={{ fontSize: 9, color: col }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 5,
          height: 5,
          background: col,
          boxShadow: `0 0 5px ${col}`,
          animation: status === 'running' ? 'pulse-glow 1.2s infinite' : 'none',
        }}
      />
      {status || 'idle'}
    </span>
  );
}

/** Tiny relative-time formatter — "just now", "42s ago", "3m ago", "1h ago". */
function relativeTime(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 4_000) return 'just now';
  if (delta < 60_000) return `${Math.floor(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}
