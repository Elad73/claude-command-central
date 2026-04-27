import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { AgentState, ProjectMission } from '../types';
import { projectColor, projectShortCode } from './ProjectChip';

interface Props {
  missions: Record<string, ProjectMission>;
  agents: Record<string, AgentState>;
}

/** Maximum cards visible at once. Keeps the strip from running off-screen. */
const VISIBLE_CAP = 8;

/** How long a just-completed card lingers before it drops off the strip. Long
 *  enough for the celebration sheen + particle burst (~1.4s) to play and for
 *  the user to register "X just finished," short enough that a row of stale
 *  DONE cards never accumulates. Header counter still shows total done count. */
const COMPLETION_LINGER_MS = 4_000;

/**
 * Shows each project's *mission* (the prompt the team is working on) as its
 * own card. Agent bubbles stay tactical (current tool call); this strip
 * answers "what are they trying to accomplish?" at a glance. Hover a card to
 * reveal the full mission text — the detail popover renders via a portal to
 * `document.body` so it always paints above the Room stacking contexts below.
 *
 * The strip is intentionally "what's happening RIGHT NOW" — only missions
 * with a live agent (or that completed within the last few seconds for the
 * celebration burst) are shown. Stale DONE cards don't accumulate; the
 * header counter ("N RUNNING · N DONE") owns the historical tally.
 */
export function MissionStrip({ missions, agents }: Props) {
  // Track which projects we've already celebrated this session, so a snapshot
  // hydration doesn't replay the burst for missions that completed before the
  // user opened the page. New transitions during this session DO fire.
  const celebratedRef = useRef<Set<string>>(new Set());
  // Seed the set on first mount with anything already done, so refreshes are
  // quiet. Subsequent running→done transitions are detected via state diff.
  const seededRef = useRef(false);
  if (!seededRef.current) {
    for (const m of Object.values(missions)) {
      if (m.status === 'done') celebratedRef.current.add(m.project);
    }
    seededRef.current = true;
  }

  // A monotonically-increasing tick that re-evaluates the completion-linger
  // filter even when no new events arrive. Without it, a card that completed
  // 4s ago would stay on screen until the next snapshot push.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  // Build agent counts first — `running` is derived from live agents, not
  // from `mission.status`, so we need this map before we can filter.
  const activeByProject = new Map<string, { total: number; live: number }>();
  for (const a of Object.values(agents)) {
    const bucket = activeByProject.get(a.project) ?? { total: 0, live: 0 };
    bucket.total += 1;
    if (a.status === 'active' || a.status === 'running') bucket.live += 1;
    activeByProject.set(a.project, bucket);
  }

  // Filter to "currently relevant": live agents OR fresh-done within linger.
  // Anything stale is dropped from the strip entirely — the header carries
  // the persistent tally so we don't lose information, only clutter.
  const now = Date.now();
  const all = Object.values(missions).filter((m) => {
    if (!m.objective || m.objective.trim().length === 0) return false;
    const counts = activeByProject.get(m.project) ?? { total: 0, live: 0 };
    if (counts.live > 0) return true;
    if (
      m.status === 'done' &&
      m.completedAt &&
      now - m.completedAt < COMPLETION_LINGER_MS
    ) {
      return true;
    }
    return false;
  });
  if (all.length === 0) return null;

  // Running-first ordering: live work bubbles to the top, fresh-completed
  // missions stack underneath in completion order. Cap to keep the strip
  // from spilling on the rare case of many concurrent projects.
  const sorted = [...all].sort((a, b) => {
    const aLive = (activeByProject.get(a.project)?.live ?? 0) > 0;
    const bLive = (activeByProject.get(b.project)?.live ?? 0) > 0;
    if (aLive !== bLive) return aLive ? -1 : 1;
    if (!aLive && !bLive) {
      return (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt);
    }
    return b.updatedAt - a.updatedAt;
  });
  const visible = sorted.slice(0, VISIBLE_CAP);

  return (
    <div className="flex items-stretch gap-2 flex-wrap pb-1">
      {visible.map((m) => {
        const counts = activeByProject.get(m.project) ?? { total: 0, live: 0 };
        return (
          <MissionCard
            key={m.project}
            mission={m}
            counts={counts}
            celebratedRef={celebratedRef}
          />
        );
      })}
    </div>
  );
}

function MissionCard({
  mission,
  counts,
  celebratedRef,
}: {
  mission: ProjectMission;
  counts: { total: number; live: number };
  celebratedRef: React.MutableRefObject<Set<string>>;
}) {
  const color = projectColor(mission.project);
  const code = projectShortCode(mission.project);
  const done = mission.status === 'done';
  const running = counts.live > 0;
  const cardRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  // One-shot celebration: fires once per running→done transition observed
  // *during this session*. Snapshot-hydrated done missions are seeded into
  // the celebrated set up in MissionStrip so they don't replay on refresh.
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!done) return;
    if (celebratedRef.current.has(mission.project)) return;
    celebratedRef.current.add(mission.project);
    setCelebrating(true);
    const timer = window.setTimeout(() => setCelebrating(false), 1400);
    return () => window.clearTimeout(timer);
  }, [done, mission.project, celebratedRef]);

  const openPopover = () => {
    if (cardRef.current) setAnchor(cardRef.current.getBoundingClientRect());
  };
  const closePopover = () => setAnchor(null);

  const duration =
    done && mission.completedAt && mission.startedAt
      ? formatDuration(mission.completedAt - mission.startedAt)
      : null;

  // CSS custom properties feed the running-halo + perimeter-scanner keyframes
  // in globals.css. Pre-mixing the alpha suffixes here keeps the keyframe
  // definitions project-color-agnostic. Iteration 2 adds higher-intensity stops
  // (--c3a, --cdd) so the halo can radiate visibly without changing the hue.
  const runningVars = running
    ? ({
        '--ccc-run-c22': `${color}22`,
        '--ccc-run-c28': `${color}28`,
        '--ccc-run-c3a': `${color}3A`,
        '--ccc-run-c40': `${color}40`,
        '--ccc-run-c55': `${color}55`,
        '--ccc-run-caa': `${color}AA`,
        '--ccc-run-cdd': `${color}DD`,
        '--ccc-run-cff': color,
      } as React.CSSProperties)
    : {};

  // The running card gets brighter chrome AND a breathing halo class. The halo
  // is what wins the glance: a moving glow next to four static green DONE
  // borders is unmistakable, even peripherally.
  const baseShadow = done
    ? `0 0 8px ${color}25, inset 0 0 6px ${color}10`
    : 'none';

  return (
    <motion.div
      ref={cardRef}
      animate={
        celebrating
          ? { scale: [1, 1.08, 1] }
          : { scale: running ? 1.015 : 1 }
      }
      transition={
        celebrating
          ? { duration: 0.6, ease: 'easeOut', times: [0, 0.45, 1] }
          : { duration: 0.25 }
      }
      className={`relative flex items-center gap-3 rounded-md border backdrop-blur-sm min-w-0 overflow-hidden${
        running ? ' ccc-mission-running' : ''
      }`}
      onMouseEnter={openPopover}
      onMouseLeave={closePopover}
      style={{
        padding: '6px 12px',
        // For running cards, the halo keyframe drives both box-shadow AND
        // background (alpha-cycling in lockstep), so the inline `background`
        // is omitted to let the animation own the fill.
        background: done ? `${color}10` : running ? undefined : `${color}18`,
        borderColor: done ? `${color}66` : running ? color : `${color}AA`,
        // Halo class drives box-shadow when running; static fallback otherwise.
        boxShadow: running ? undefined : baseShadow,
        opacity: done ? 0.92 : 1,
        flex: '1 1 260px',
        minWidth: 220,
        maxWidth: 520,
        cursor: 'help',
        // Running cards lift above their siblings — halo can spill, popovers
        // already portal so this only competes with strip-local elements.
        zIndex: running ? 2 : 0,
        // Left-edge accent stripe — the most reliable "this row matters"
        // anchor. 4px solid project hue, neon-cored. Pairs with the moving
        // halo so the card has both a static AND a kinetic identity.
        borderLeftWidth: running ? 4 : 1,
        ...runningVars,
      }}
    >
      {/* Sheen sweep across the card on completion — single pass. */}
      {celebrating && (
        <span
          aria-hidden
          className="ccc-mission-sheen"
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(120deg, transparent 25%, ${color}55 50%, transparent 75%)`,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Particle burst — 10 dots flying outward from card center. */}
      {celebrating && <ParticleBurst color={color} />}

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

      <div className="flex flex-col min-w-0 flex-1 relative">
        <div className="flex items-center gap-2">
          <span
            className="font-display text-[0.65rem] tracking-[0.25em] font-bold uppercase"
            style={{
              color: running ? '#ffffff' : `${color}DD`,
              textShadow: running
                ? `0 0 8px ${color}, 0 0 16px rgba(0,0,0,0.85)`
                : `0 0 6px ${color}`,
            }}
          >
            Mission
          </span>
          {done ? <DonePill /> : <StatusPip status={mission.status} color={color} />}
          {counts.total > 0 && !done && (
            <span
              className="font-mono text-[0.65rem]"
              style={{
                color: running ? '#ffffff' : `${color}BB`,
                textShadow: running ? '0 0 6px rgba(0,0,0,0.9)' : 'none',
              }}
            >
              {counts.live}/{counts.total}▲
            </span>
          )}
        </div>
        <div
          className="font-mono text-xs truncate"
          style={{
            color: '#ffffff',
            textShadow: running
              ? '0 0 6px rgba(0,0,0,0.95), 0 1px 2px rgba(0,0,0,1)'
              : 'none',
          }}
        >
          {mission.objective}
        </div>
        {done && (
          <div
            className="font-mono text-[0.65rem] mt-0.5"
            style={{ color: '#39ff14', textShadow: '0 0 4px #39ff1466' }}
          >
            <span style={{ marginRight: 4 }}>✓</span>
            {duration ?? '—'} · {counts.total} agent{counts.total === 1 ? '' : 's'} ·{' '}
            {mission.actionCount} action{mission.actionCount === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {done && (
        <span
          aria-hidden
          className="absolute"
          style={{
            top: 4,
            right: 6,
            fontSize: 14,
            color: '#39ff14',
            textShadow: '0 0 6px #39ff14, 0 0 12px #39ff1488',
            fontWeight: 900,
            lineHeight: 1,
          }}
          title="Mission complete"
        >
          ✓
        </span>
      )}

      {/* Portal so the popover paints above room stacking contexts.
          `document` is guarded so SSR (if ever) doesn't break. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {anchor && (
              <MissionDetail
                mission={mission}
                counts={counts}
                color={color}
                anchor={anchor}
                duration={duration}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
}

/**
 * Full-mission hover popover, portaled to `document.body` so it escapes any
 * local stacking context. Positioned with `position: fixed` using the anchor
 * card's bounding rect; horizontally clamped to the viewport so it doesn't
 * overflow the right edge when a card sits near the window edge.
 */
function MissionDetail({
  mission,
  counts,
  color,
  anchor,
  duration,
}: {
  mission: ProjectMission;
  counts: { total: number; live: number };
  color: string;
  anchor: DOMRect;
  duration: string | null;
}) {
  const POPOVER_WIDTH = 440;
  const MARGIN = 12;
  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1920;
  // Clamp: never overflow the right edge, never go below the left edge.
  const left = Math.min(
    Math.max(MARGIN, anchor.left),
    viewportW - POPOVER_WIDTH - MARGIN,
  );
  const top = anchor.bottom + 8;

  // Arrow position: where the card's left edge originally was, relative to the
  // popover's own left after clamping.
  const arrowLeft = Math.min(
    Math.max(16, anchor.left + 20 - left),
    POPOVER_WIDTH - 24,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="pointer-events-none"
      style={{
        position: 'fixed',
        top,
        left,
        width: POPOVER_WIDTH,
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        zIndex: 9999,
      }}
    >
      <div
        className="rounded-md border backdrop-blur-md relative"
        style={{
          padding: '10px 14px',
          background: 'rgba(5, 5, 13, 0.94)',
          borderColor: color,
          boxShadow: `0 0 16px ${color}66, 0 10px 32px rgba(0,0,0,0.5), inset 0 0 10px ${color}15`,
        }}
      >
        {/* Arrow pointing up to the card */}
        <div
          className="absolute"
          style={{
            top: -5,
            left: arrowLeft,
            width: 10,
            height: 10,
            background: 'rgba(5, 5, 13, 0.94)',
            borderTop: `1px solid ${color}`,
            borderLeft: `1px solid ${color}`,
            transform: 'rotate(45deg)',
          }}
        />

        <div className="flex items-center gap-2 mb-2">
          <span
            className="font-display text-[0.65rem] tracking-[0.3em] font-bold uppercase"
            style={{ color: `${color}DD`, textShadow: `0 0 6px ${color}` }}
          >
            {mission.project}
          </span>
          <StatusPip status={mission.status} color={color} />
        </div>

        <div
          className="font-mono text-[0.78rem] leading-snug whitespace-pre-wrap break-words"
          style={{ color: '#f5f5ff' }}
        >
          {mission.objective}
        </div>

        <div
          className="flex items-center gap-3 mt-2 pt-2 font-mono text-[0.65rem] flex-wrap"
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
          <span>
            actions <strong style={{ color: '#e5e7ff' }}>{mission.actionCount}</strong>
          </span>
          {duration && (
            <>
              <span style={{ color: `${color}77` }}>·</span>
              <span>
                duration <strong style={{ color: '#e5e7ff' }}>{duration}</strong>
              </span>
            </>
          )}
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

/** Static "DONE" pill — replaces the StatusPip on completed mission cards. */
function DonePill() {
  return (
    <span
      className="font-display tracking-widest font-black uppercase"
      style={{
        fontSize: 9,
        padding: '1px 6px',
        borderRadius: 3,
        background: '#39ff1418',
        border: '1px solid #39ff1488',
        color: '#39ff14',
        textShadow: '0 0 4px #39ff1466',
        letterSpacing: '0.18em',
      }}
    >
      DONE
    </span>
  );
}

/**
 * Quick particle burst — 10 small dots flying outward from the card centre,
 * fading and shrinking as they go. Pure CSS would also work here but
 * framer-motion is already in scope and keeps the math compact.
 */
function ParticleBurst({ color }: { color: string }) {
  const N = 10;
  const particles = Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * Math.PI * 2;
    return {
      i,
      dx: Math.cos(angle) * 36,
      dy: Math.sin(angle) * 26,
    };
  });
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      }}
    >
      {particles.map((p) => (
        <motion.span
          key={p.i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.dx, y: p.dy, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            left: -2.5,
            top: -2.5,
          }}
        />
      ))}
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

/**
 * Compact duration formatter for completed-mission footers.
 *   23s, 4m 23s, 1h 12m, 2d 4h.
 * Always two units max; sub-second is rendered as "0s" rather than "0ms".
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const day = Math.floor(hr / 24);
  return `${day}d ${hr % 24}h`;
}
