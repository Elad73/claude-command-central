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
 * active project, colored + labeled with its short code.
 */
export function MissionStrip({ missions, agents }: Props) {
  const all = Object.values(missions)
    .filter((m) => m.objective && m.objective.trim().length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  if (all.length === 0) return null;

  // Count agents per project so the card can show team size.
  const activeByProject = new Map<string, { total: number; live: number }>();
  for (const a of Object.values(agents)) {
    const bucket = activeByProject.get(a.project) ?? { total: 0, live: 0 };
    bucket.total += 1;
    if (a.status === 'active' || a.status === 'running') bucket.live += 1;
    activeByProject.set(a.project, bucket);
  }

  return (
    <div
      className="flex items-stretch gap-2 overflow-x-auto pb-1"
      style={{ scrollbarWidth: 'thin' }}
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

  return (
    <div
      className="flex items-center gap-3 rounded-md border backdrop-blur-sm min-w-0"
      style={{
        padding: '6px 12px',
        background: done ? `${color}08` : `${color}18`,
        borderColor: done ? `${color}44` : `${color}AA`,
        boxShadow: running ? `0 0 12px ${color}40, inset 0 0 8px ${color}20` : 'none',
        opacity: done ? 0.65 : 1,
        flex: '1 1 260px',
        minWidth: 220,
        maxWidth: 520,
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
        title={mission.project}
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
            <span
              className="font-mono text-[0.65rem]"
              style={{ color: `${color}BB` }}
              title={`${counts.live} active / ${counts.total} total`}
            >
              {counts.live}/{counts.total}▲
            </span>
          )}
        </div>
        <div
          className="font-mono text-xs truncate"
          style={{ color: '#e5e7ff' }}
          title={mission.objective}
        >
          {mission.objective}
        </div>
      </div>
    </div>
  );
}

function StatusPip({ status, color }: { status: string; color: string }) {
  const col = status === 'done' ? '#00f5ff' : status === 'error' || status === 'blocked' ? '#ff1e6b' : status === 'running' ? '#39ff14' : color;
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
