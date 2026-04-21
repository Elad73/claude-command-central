import React from 'react';
import { Box, Text } from 'ink';

export const LiveFeed: React.FC<{ lines: readonly string[] }> = ({ lines }) => (
  <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
    <Text bold>Live Feed</Text>
    {lines.length === 0 && <Text dimColor>Waiting for events…</Text>}
    {lines.map((line, idx) => (
      <Text key={`${idx}-${line}`} dimColor={idx < lines.length - 1}>
        {line}
      </Text>
    ))}
  </Box>
);
