import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { AgentSprite } from '../AgentSprite';
import { projectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import { Atmosphere } from './Atmosphere';
import { isResting, type SceneProps } from './types';
import type { AgentState } from '../../types';

/**
 * INTAKE scene — a parcel receiving bay.
 *
 * Choreography (loops per agent):
 *   1. Agent starts at the left pallet, empty-handed.
 *   2. A box slides off the pallet onto the agent's tray.
 *   3. Agent walks right across its lane carrying the tray (tray bobs).
 *   4. Agent drops the box onto the receiving table.
 *   5. Agent walks back left empty.
 *   6. Repeat forever, unless the agent is resting.
 *
 * Up to MAX_STATIONS (4) agents, each in a vertically-stacked lane with its
 * own pallet + table. Timings are staggered by agent index so they don't move
 * in lockstep.
 */

const WALK_DURATION_S = 6;
const STAGGER_MS = 700;

/** Mini pallet stack (lane-local, left wall). Drawn in SVG at natural size
 *  so it can be embedded cleanly. */
function PalletStack({ color }: { color: string }) {
  return (
    <svg
      width={52}
      height={54}
      viewBox="0 0 52 54"
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Pallet base */}
      <rect x={2} y={46} width={48} height={6} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1} />
      <line x1={10} y1={46} x2={10} y2={52} stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1={26} y1={46} x2={26} y2={52} stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1={42} y1={46} x2={42} y2={52} stroke={color} strokeWidth={0.8} opacity={0.5} />
      {/* Bottom row: 2 boxes */}
      <rect x={4} y={30} width={20} height={16} rx={1.5} fill={color} fillOpacity={0.28} stroke={color} strokeWidth={1} />
      <line x1={14} y1={30} x2={14} y2={46} stroke={color} strokeWidth={0.6} opacity={0.45} />
      <rect x={28} y={30} width={20} height={16} rx={1.5} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1} />
      <line x1={38} y1={30} x2={38} y2={46} stroke={color} strokeWidth={0.6} opacity={0.45} />
      {/* Middle: 1 box, slightly offset */}
      <rect x={14} y={14} width={22} height={16} rx={1.5} fill={color} fillOpacity={0.32} stroke={color} strokeWidth={1} />
      <line x1={25} y1={14} x2={25} y2={30} stroke={color} strokeWidth={0.6} opacity={0.45} />
      {/* Top: 1 small box */}
      <rect x={20} y={2} width={14} height={12} rx={1.5} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={1} />
    </svg>
  );
}

/** Receiving table on the right — a stubby surface with a growing stack of
 *  delivered boxes on top. The stack animates in on a delay so it feels alive. */
function ReceivingTable({ color, delayMs }: { color: string; delayMs: number }) {
  const boxes = [0, 1, 2, 3];
  return (
    <svg
      width={72}
      height={54}
      viewBox="0 0 72 54"
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Table top */}
      <rect x={2} y={34} width={68} height={5} rx={1} fill={color} fillOpacity={0.32} stroke={color} strokeWidth={1} />
      {/* Table legs */}
      <rect x={6} y={39} width={3} height={13} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={0.8} />
      <rect x={63} y={39} width={3} height={13} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={0.8} />
      {/* Delivered boxes — four, pulsing in on staggered delays so the table feels like it is filling up. */}
      {boxes.map((i) => {
        const x = 8 + i * 14;
        return (
          <g
            key={i}
            style={{
              transformOrigin: `${x + 6}px 34px`,
              animation: `intake-table-arrive ${WALK_DURATION_S * 4}s ease-in-out infinite`,
              animationDelay: `${delayMs + i * 800}ms`,
            }}
          >
            <rect
              x={x}
              y={22}
              width={12}
              height={12}
              rx={1.5}
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              strokeWidth={1}
            />
            <line x1={x + 6} y1={22} x2={x + 6} y2={34} stroke={color} strokeWidth={0.6} opacity={0.55} />
          </g>
        );
      })}
    </svg>
  );
}

/** A small tray drawn as a thin slab with an optional box sitting on top.
 *  The tray itself bobs slightly (handled by parent animation), and the box
 *  fades in/out based on cycle position so the agent appears to carry it one
 *  way and return empty the other. */
function TrayWithBox({ color, delayMs }: { color: string; delayMs: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        animation: `intake-tray-bob 0.5s ease-in-out infinite`,
        animationDelay: `${delayMs}ms`,
      }}
    >
      {/* Tray slab */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 40,
          height: 5,
          borderRadius: 2,
          background: `${color}55`,
          border: `1px solid ${color}`,
          boxShadow: `0 0 6px ${color}77`,
        }}
      />
      {/* Box that rides on the tray only during the "carrying" half of the loop */}
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: 10,
          width: 20,
          height: 16,
          borderRadius: 2,
          background: `${color}66`,
          border: `1px solid ${color}`,
          boxShadow: `0 0 4px ${color}`,
          animation: `intake-carry-box ${WALK_DURATION_S}s linear infinite`,
          animationDelay: `${delayMs}ms`,
        }}
      >
        {/* Box seam detail */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            width: 1,
            background: color,
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
}

/** A single lane with pallet, floor, table, and a walking agent. */
function Lane({
  agent,
  laneHeight,
  index,
  color,
  spriteSize,
}: {
  agent: AgentState;
  laneHeight: number;
  index: number;
  color: string;
  spriteSize: 'sm' | 'md';
}) {
  const agentColor = projectColor(agent.project);
  const resting = isResting(agent.status);
  const delayMs = index * STAGGER_MS;
  const playState: CSSProperties['animationPlayState'] = resting ? 'paused' : 'running';

  // Width of the sprite drawn by AgentSprite for the size we use. Keep in sync
  // with the DIMENSIONS table in AgentSprite.tsx.
  const spriteW = spriteSize === 'md' ? 80 : 52;

  return (
    <div
      className="relative w-full"
      style={{ height: laneHeight }}
    >
      {/* Floor line — faint neon strip the agent walks on */}
      <div
        className="absolute left-0 right-0"
        style={{
          bottom: 6,
          height: 1,
          background: `linear-gradient(to right, transparent, ${color}66, transparent)`,
        }}
      />

      {/* Left: pallet stack */}
      <div className="absolute" style={{ left: 4, bottom: 4 }}>
        <PalletStack color={color} />
      </div>

      {/* Right: receiving table */}
      <div className="absolute" style={{ right: 4, bottom: 4 }}>
        <ReceivingTable color={color} delayMs={delayMs} />
      </div>

      {/* Walking agent — horizontal track between pallet and table.
       *  The track itself spans the available space between the two props,
       *  and the agent's translateX is driven by a CSS keyframe.
       */}
      <div
        className="absolute"
        style={{
          // Offset left so the sprite starts right next to the pallet.
          left: 58,
          right: 78,
          bottom: 4,
          height: laneHeight - 8,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: spriteW,
            // Pass 3 walking gait: bob + tilt at lane endpoints (intake-walk-v2)
            animation: `intake-walk-v2 ${WALK_DURATION_S}s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite`,
            animationDelay: `${delayMs}ms`,
            animationPlayState: playState,
            // Fallback when resting: freeze at the left (pallet) position.
            transform: resting ? 'translateX(0)' : undefined,
          }}
        >
          {/* Label pinned above the sprite; travels with it */}
          <div
            className="flex flex-col items-center"
            style={{ width: spriteW }}
          >
            <AgentLabel agent={agent} align="above" />
            <div style={{ position: 'relative' }}>
              <AgentSprite
                color={agentColor}
                status={agent.status}
                phase={agent.phase}
                size={spriteSize}
              />
              {/* Tray sits at roughly waist height in front of the sprite.
               *  Positioned absolutely so it overlays the belt area. */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: spriteSize === 'md' ? 36 : 22,
                  transform: 'translateX(-50%)',
                  animationPlayState: playState,
                }}
              >
                <TrayWithBox color={agentColor} delayMs={delayMs} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IntakeScene({ agents, color }: SceneProps) {
  if (agents.length === 0) {
    return (
      <>
        <Atmosphere phase="PROMPT" color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display tracking-[0.4em] text-sm"
            style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
          >
            // INTAKE BAY STANDBY //
          </div>
        </div>
      </>
    );
  }

  // Up to 4 lanes. With fewer agents, use larger sprites and fewer lanes
  // (a single agent gets centered with the md sprite).
  const spriteSize: 'sm' | 'md' = agents.length <= 2 ? 'md' : 'sm';

  return (
    <>
      <Atmosphere phase="PROMPT" color={color} />
      <div className="absolute inset-0 pt-11 pb-10 px-2 overflow-hidden">
      <div className="relative w-full h-full flex flex-col justify-around">
        <AnimatePresence mode="popLayout">
          {agents.map((agent, index) => {
            const resting = isResting(agent.status);
            // The lane fills available vertical room; flex `justify-around`
            // distributes lanes evenly regardless of agent count.
            return (
              <motion.div
                key={agent.key}
                layoutId={`agent-${agent.key}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: resting ? 0.7 : 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="relative w-full"
                style={{
                  // Each lane gets an equal fraction of the available height.
                  // Using flex on the parent + flexBasis here keeps lanes tidy
                  // across 1/2/3/4 agent counts.
                  flexBasis: `${100 / Math.max(1, agents.length)}%`,
                  minHeight: spriteSize === 'md' ? 130 : 86,
                }}
              >
                <Lane
                  agent={agent}
                  laneHeight={spriteSize === 'md' ? 150 : 96}
                  index={index}
                  color={color}
                  spriteSize={spriteSize}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      </div>
    </>
  );
}
