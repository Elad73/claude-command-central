import { PHASES, type AgentState, type Phase } from '../types';
import { Room } from './Room';

const ROOM_LAYOUT: Phase[][] = [
  ['PROMPT', 'PLAN', 'BUILD'],
  ['REVIEW', 'TEST', 'DEPLOY'],
];

interface Props {
  agents: Record<string, AgentState>;
}

export function Office({ agents }: Props) {
  const byPhase = new Map<Phase, AgentState[]>();
  for (const p of PHASES) byPhase.set(p, []);
  for (const a of Object.values(agents)) {
    if ((PHASES as readonly string[]).includes(a.phase)) byPhase.get(a.phase)!.push(a);
  }
  for (const list of byPhase.values()) {
    list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return (
    <div className="grid grid-rows-2 gap-3 min-h-0">
      {ROOM_LAYOUT.map((row, ri) => (
        <div key={ri} className="grid grid-cols-3 gap-3 min-h-0">
          {row.map((phase) => (
            <Room key={phase} phase={phase} agents={byPhase.get(phase) ?? []} />
          ))}
        </div>
      ))}
    </div>
  );
}
