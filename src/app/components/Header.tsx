import React from 'react';
import { Box, Text } from 'ink';
import type { FlowState } from '../../state/types.js';
import { statusColor } from '../constants.js';

const PROGRESS_WIDTH = 30;

const progressBar = (value: number): string => {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * PROGRESS_WIDTH);
  return '█'.repeat(filled) + '░'.repeat(PROGRESS_WIDTH - filled);
};

export const Header: React.FC<{ flow: FlowState }> = ({ flow }) => (
  <Box flexDirection="column" paddingX={1} paddingY={0}>
    <Box>
      <Text bold color="cyanBright">
        {flow.title}
      </Text>
      <Text>  </Text>
      <Text dimColor>status:</Text>
      <Text color={statusColor(flow.status)}> {flow.status}</Text>
      <Text>  </Text>
      <Text dimColor>progress:</Text>
      <Text> {flow.progress}%</Text>
    </Box>
    <Box>
      <Text dimColor>objective: </Text>
      <Text>{flow.objective}</Text>
    </Box>
    <Box>
      <Text color="cyan">{progressBar(flow.progress)}</Text>
    </Box>
  </Box>
);
