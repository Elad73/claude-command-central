import React from 'react';
import { Box, Text } from 'ink';
import { PHASES, type Phase } from '../../events/types.js';
import { PHASE_COLORS } from '../constants.js';
import { useTick } from '../hooks.js';

const phaseMarker = (index: number, activeIndex: number, tick: number): string => {
  if (index === activeIndex) return tick % 2 === 0 ? '◉' : '◎';
  if (index < activeIndex) return '●';
  return '·';
};

export const Pipeline: React.FC<{ activePhase: Phase }> = ({ activePhase }) => {
  const tick = useTick(500);
  const activeIndex = PHASES.indexOf(activePhase);
  return (
    <Box paddingX={1}>
      {PHASES.map((phase, idx) => (
        <React.Fragment key={phase}>
          <Text color={PHASE_COLORS[phase]} bold={idx === activeIndex}>
            {phaseMarker(idx, activeIndex, tick)} {phase}
          </Text>
          {idx < PHASES.length - 1 && <Text dimColor> → </Text>}
        </React.Fragment>
      ))}
    </Box>
  );
};
