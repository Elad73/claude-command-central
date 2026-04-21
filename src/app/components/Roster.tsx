import React from 'react';
import { Box, Text } from 'ink';
import type { AgentState } from '../../state/types.js';
import { PHASE_COLORS, statusColor } from '../constants.js';

const MAX_ROWS = 6;

export const Roster: React.FC<{ agents: Record<string, AgentState> }> = ({ agents }) => {
  const ordered = Object.values(agents).sort((a, b) => b.updatedAt - a.updatedAt);
  const shown = ordered.slice(0, MAX_ROWS);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold>Agent Roster</Text>
      {shown.length === 0 && <Text dimColor>No agents reporting yet.</Text>}
      {shown.map((agent) => (
        <Box key={agent.name}>
          <Text color={PHASE_COLORS[agent.phase]}>{agent.name}</Text>
          <Text dimColor> [</Text>
          <Text color={PHASE_COLORS[agent.phase]}>{agent.phase}</Text>
          <Text dimColor>/</Text>
          <Text color={statusColor(agent.status)}>{agent.status}</Text>
          <Text dimColor>] </Text>
          <Text>{agent.task}</Text>
        </Box>
      ))}
    </Box>
  );
};
