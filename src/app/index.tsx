import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { MultiFeedWatcher } from '../events/watcher.js';
import { useDashboard, useActivePhase } from './hooks.js';
import { Header } from './components/Header.js';
import { Pipeline } from './components/Pipeline.js';
import { Roster } from './components/Roster.js';
import { Office } from './components/Office.js';
import { LiveFeed } from './components/LiveFeed.js';

export interface AppProps {
  watcher: MultiFeedWatcher;
}

export const App: React.FC<AppProps> = ({ watcher }) => {
  const state = useDashboard(watcher);
  const activePhase = useActivePhase(state);
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || key.escape) exit();
  });

  const sources = watcher.sources;
  const projectList = sources.map((s) => s.project).join(', ') || '(none)';

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan">
      <Header flow={state.flow} />
      <Box paddingX={1}>
        <Text dimColor>watching: </Text>
        <Text>{projectList}</Text>
        <Text dimColor>   (press q to quit)</Text>
      </Box>
      <Pipeline activePhase={activePhase} />
      <Roster agents={state.agents} />
      <Office agents={state.agents} />
      <LiveFeed lines={state.logLines} />
    </Box>
  );
};
