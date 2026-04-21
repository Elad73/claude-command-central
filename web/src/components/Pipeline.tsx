import { PHASES, PHASE_HEX, type AgentState, type Phase } from '../types';

interface Props {
  agents: Record<string, AgentState>;
}

export function Pipeline({ agents }: Props) {
  const activePhase = dominantPhase(agents);
  const activeIdx = PHASES.indexOf(activePhase);

  return (
    <div
      className="flex items-center gap-0 px-6 py-3 rounded-lg border border-neon-cyan/20 bg-ink-900/50 backdrop-blur-sm"
    >
      {PHASES.map((phase, idx) => {
        const done = idx < activeIdx;
        const active = idx === activeIdx;
        const pending = idx > activeIdx;
        const color = PHASE_HEX[phase];

        return (
          <div key={phase} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <span
                className="inline-block w-3 h-3 rounded-full transition-all"
                style={{
                  background: done || active ? color : 'transparent',
                  border: `2px solid ${color}`,
                  boxShadow: active ? `0 0 12px ${color}` : done ? `0 0 6px ${color}` : 'none',
                  opacity: pending ? 0.4 : 1,
                  animation: active ? 'pulse-glow 1.4s infinite' : 'none',
                }}
              />
              <span
                className="font-display text-xs tracking-[0.2em]"
                style={{
                  color: active ? color : pending ? '#6b7280' : color,
                  opacity: pending ? 0.5 : 1,
                  textShadow: active ? `0 0 8px ${color}` : 'none',
                }}
              >
                {phase}
              </span>
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className="h-px flex-shrink-0 w-6 mx-1"
                style={{
                  background: done
                    ? `linear-gradient(90deg, ${color}, ${PHASE_HEX[PHASES[idx + 1]!]})`
                    : 'rgba(255,255,255,0.12)',
                  boxShadow: done ? `0 0 6px ${color}` : 'none',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function dominantPhase(agents: Record<string, AgentState>): Phase {
  const list = Object.values(agents);
  if (list.length === 0) return 'PROMPT';
  let latest = list[0]!;
  for (const a of list) if (a.updatedAt > latest.updatedAt) latest = a;
  return latest.phase;
}
