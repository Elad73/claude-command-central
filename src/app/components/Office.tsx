import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../../state/types.js';
import { PHASES, ROOM_BY_PHASE, type Phase } from '../../events/types.js';
import { PHASE_COLORS, statusColor } from '../constants.js';
import { useTick } from '../hooks.js';

const ROOM_LAYOUT: Phase[][] = [
  ['PROMPT', 'PLAN', 'BUILD'],
  ['REVIEW', 'TEST', 'DEPLOY'],
];

const AGENTS_PER_ROOM = 3;

const agentMarker = (agent: AgentState, tick: number, now: number): string => {
  if (agent.status === 'blocked' || agent.status === 'error') return '!';
  const age = now - agent.updatedAt;
  if (age < 2500) return tick % 2 === 0 ? '✦' : '✧';
  if (agent.status === 'done' || agent.status === 'idle') return '·';
  return '●';
};

const Room: React.FC<{ phase: Phase; agents: AgentState[] }> = ({ phase, agents }) => {
  const tick = useTick(400);
  const now = Date.now();
  const color = PHASE_COLORS[phase];
  const shown = agents.slice(0, AGENTS_PER_ROOM);
  const overflow = agents.length - shown.length;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
      paddingX={1}
      marginRight={1}
      flexGrow={1}
      minWidth={22}
      height={7}
    >
      <Box>
        <Text bold color={color}>
          {ROOM_BY_PHASE[phase]}
        </Text>
      </Box>
      {shown.map((agent) => (
        <Box key={agent.name}>
          <Text color={statusColor(agent.status)}>{agentMarker(agent, tick, now)}</Text>
          <Text> </Text>
          <Text>{agent.name}</Text>
        </Box>
      ))}
      {overflow > 0 && <Text dimColor>+{overflow} more</Text>}
      {shown.length === 0 && <Text dimColor>(empty)</Text>}
    </Box>
  );
};

export const Office: React.FC<{ agents: Record<string, AgentState> }> = ({ agents }) => {
  const byPhase = new Map<Phase, AgentState[]>();
  for (const phase of PHASES) byPhase.set(phase, []);
  for (const agent of Object.values(agents)) {
    if ((PHASES as readonly string[]).includes(agent.phase)) {
      byPhase.get(agent.phase)!.push(agent);
    }
  }
  for (const list of byPhase.values()) {
    list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {ROOM_LAYOUT.map((row, rowIdx) => (
        <Box key={rowIdx} flexDirection="row">
          {row.map((phase) => (
            <Room key={phase} phase={phase} agents={byPhase.get(phase) ?? []} />
          ))}
        </Box>
      ))}
    </Box>
  );
};
