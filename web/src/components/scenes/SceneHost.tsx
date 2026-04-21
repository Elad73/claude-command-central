import type { Phase } from '../../types';
import { IntakeScene } from './IntakeScene';
import { StrategyScene } from './StrategyScene';
import { BuildScene } from './BuildScene';
import { ReviewScene } from './ReviewScene';
import { TestScene } from './TestScene';
import { DeployScene } from './DeployScene';
import type { SceneProps } from './types';

/**
 * Dispatches rendering to the phase-specific theatrical scene. Each scene
 * owns its own props (furniture, animations) and positions its agents in
 * scene-specific stations. The Room frame (border, header, lamps) is drawn
 * by the parent — scenes just paint inside the content area.
 */
export function SceneHost({
  phase,
  agents,
  color,
}: SceneProps & { phase: Phase }) {
  switch (phase) {
    case 'PROMPT':
      return <IntakeScene agents={agents} color={color} />;
    case 'PLAN':
      return <StrategyScene agents={agents} color={color} />;
    case 'BUILD':
      return <BuildScene agents={agents} color={color} />;
    case 'REVIEW':
      return <ReviewScene agents={agents} color={color} />;
    case 'TEST':
      return <TestScene agents={agents} color={color} />;
    case 'DEPLOY':
      return <DeployScene agents={agents} color={color} />;
  }
}
