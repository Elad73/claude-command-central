import { AnimatePresence, motion } from 'framer-motion';
import { AgentSprite } from '../AgentSprite';
import { ThoughtBubble } from '../ThoughtBubble';
import { useProjectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import type { SceneProps } from './types';

/**
 * Baseline rendering used as a fallback while specific theatrical scenes
 * are being built. Lays agents out in a centered row with a thought bubble.
 * A real scene component overrides this for its phase.
 */
export function FallbackScene({ agents, color }: SceneProps) {
  const projectColor = useProjectColor();
  if (agents.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="font-display tracking-[0.4em] text-sm"
          style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
        >
          // STANDBY //
        </div>
      </div>
    );
  }
  const size: 'md' | 'lg' = agents.length <= 1 ? 'lg' : 'md';
  return (
    <div className="absolute inset-0 pt-11 pb-10 px-3 flex items-center justify-center gap-5 flex-wrap content-center">
      <AnimatePresence mode="popLayout">
        {agents.map((agent) => {
          const agentColor = projectColor(agent.project);
          const resting = agent.status === 'done' || agent.status === 'idle';
          return (
            <motion.div
              key={agent.key}
              layoutId={`agent-${agent.key}`}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: resting ? 0.65 : 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -8 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="flex flex-col items-center gap-1.5"
            >
              {agent.task && (
                <ThoughtBubble
                  text={agent.task}
                  color={agentColor}
                  maxWidth={size === 'lg' ? 260 : 170}
                />
              )}
              <AgentSprite color={agentColor} status={agent.status} phase={agent.phase} size={size} />
              <AgentLabel agent={agent} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
