import type { AgentState } from '../../types';
import { displayName } from '../../types';
import { ProjectChip, projectColor } from '../ProjectChip';

interface Props {
  agent: AgentState;
  /** When true, the label is pinned above the agent (overlay above head). */
  align?: 'below' | 'above' | 'right';
}

/**
 * Ultra-compact identity tag for an agent inside a theatrical scene.
 * Shows: name + tiny status dot + short project chip. Dims when resting.
 */
export function AgentLabel({ agent, align = 'below' }: Props) {
  const col = projectColor(agent.project);
  const resting = agent.status === 'done' || agent.status === 'idle';
  const errored = agent.status === 'blocked' || agent.status === 'error';
  const dot = errored ? '#ff1e6b' : resting ? '#a3a3a3' : '#39ff14';

  return (
    <div
      className="flex flex-col items-center gap-[2px] pointer-events-none select-none"
      style={{
        opacity: resting ? 0.55 : 1,
        marginTop: align === 'below' ? 2 : 0,
        marginBottom: align === 'above' ? 2 : 0,
      }}
    >
      <div
        className="font-mono font-bold leading-none whitespace-nowrap"
        style={{
          fontSize: 10,
          color: '#ffffff',
          textShadow: `0 0 6px ${col}`,
        }}
      >
        <span
          className="inline-block rounded-full align-middle mr-1"
          style={{
            width: 5,
            height: 5,
            background: dot,
            boxShadow: `0 0 4px ${dot}`,
            animation: !resting && !errored ? 'pulse-glow 1.2s infinite' : 'none',
          }}
        />
        {displayName(agent.rawName)}
      </div>
      <ProjectChip project={agent.project} size="sm" compact />
    </div>
  );
}
