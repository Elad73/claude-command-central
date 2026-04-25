import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { AgentSprite } from '../AgentSprite';
import { projectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import { isResting, type SceneProps } from './types';
import type { AgentState } from '../../types';

/**
 * TEST scene — a stunt training floor.
 *
 * Each agent gets a vertical "stunt lane" with:
 *   - A ceiling hatch (dashed circle + swinging trap-door flap).
 *   - A tower/ladder silhouette on the side (flavor only, not animated).
 *   - A stack of padded safety cushions on the floor.
 *
 * 6-second choreography, looped per agent:
 *   0.00–1.10s  FALL      agent drops from the hatch, head-down, accelerating.
 *   1.10–1.60s  IMPACT    agent hits cushion; splash burst + cushion squash.
 *   1.60–2.80s  SPRAWL    agent lies diagonally on the cushion, tiny wobble.
 *   2.80–3.80s  STANDUP   agent rotates upright beside the cushion.
 *   3.80–5.00s  THUMBSUP  arm raises, a thumbs-up glyph pops above the head.
 *   5.00–6.00s  RESET     agent fades, returns to ceiling hatch invisibly.
 *
 * Resting agents freeze their loop (`animationPlayState: 'paused'`) and dim,
 * so the workstation reads as "powered down" instead of doing stunts idly.
 *
 * Per-agent stagger: `index * 1600ms` so falls never sync across lanes.
 */

const CYCLE_S = 6;
const STAGGER_MS = 1600;

/** Ceiling slab with a dashed "hatch" circle + a rectangular trap-door flap
 *  that swings open during the fall window. The flap pivots from its left edge. */
function CeilingHatch({ color, delayMs, playState }: {
  color: string;
  delayMs: number;
  playState: CSSProperties['animationPlayState'];
}) {
  return (
    <svg
      width={60}
      height={36}
      viewBox="0 0 60 36"
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Ceiling slab — a thin strip across the top */}
      <rect x={0} y={0} width={60} height={6} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={0.8} />
      {/* Bolt dots along the slab */}
      <circle cx={6} cy={3} r={0.9} fill={color} opacity={0.7} />
      <circle cx={54} cy={3} r={0.9} fill={color} opacity={0.7} />
      {/* Dashed hatch circle */}
      <circle
        cx={30}
        cy={18}
        r={11}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="3 2"
        opacity={0.75}
      />
      {/* Inner glow halo */}
      <circle cx={30} cy={18} r={7} fill={color} fillOpacity={0.08} />
      {/* Trap-door flap — swings open during the fall window, then closes */}
      <g
        style={{
          transformOrigin: '19px 18px',
          animation: `test-trapdoor ${CYCLE_S}s ease-in-out infinite`,
          animationDelay: `${delayMs}ms`,
          animationPlayState: playState,
        }}
      >
        <path
          d="M 19 18 L 41 18 L 41 22 L 19 22 Z"
          fill={color}
          fillOpacity={0.32}
          stroke={color}
          strokeWidth={0.9}
        />
        <line x1={22} y1={20} x2={38} y2={20} stroke={color} strokeWidth={0.5} opacity={0.6} />
      </g>
      {/* Hinge dots */}
      <circle cx={19} cy={18} r={1.1} fill={color} />
      <circle cx={41} cy={18} r={1.1} fill={color} opacity={0.55} />
    </svg>
  );
}

/** Stacked safety cushions — 4 rectangles in alternating orange/blue, with
 *  cross-hatched stripes and a faint "STUNT" label along the top cushion.
 *  The whole stack compresses (scale-y) on agent impact. */
function CushionStack({ delayMs, playState, width, height }: {
  delayMs: number;
  playState: CSSProperties['animationPlayState'];
  width: number;
  height: number;
}) {
  // Colors for safety-mat feel — don't override with scene color.
  const orange = '#ff8c3a';
  const blue = '#3d7bff';
  const rows = [
    { color: orange, label: true },
    { color: blue, label: false },
    { color: orange, label: false },
    { color: blue, label: false },
  ];
  const rowH = height / rows.length;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        display: 'block',
        transformOrigin: `center bottom`,
        animation: `test-cushion-squash ${CYCLE_S}s ease-out infinite`,
        animationDelay: `${delayMs}ms`,
        animationPlayState: playState,
      }}
      aria-hidden
    >
      <defs>
        <pattern
          id={`stunt-stripes-${delayMs}`}
          patternUnits="userSpaceOnUse"
          width={6}
          height={6}
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={6} stroke="#ffffff" strokeWidth={0.8} opacity={0.25} />
        </pattern>
      </defs>
      {rows.map((row, i) => {
        const y = i * rowH;
        return (
          <g key={i}>
            <rect
              x={2}
              y={y + 1}
              width={width - 4}
              height={rowH - 2}
              rx={3}
              fill={row.color}
              fillOpacity={0.75}
              stroke={row.color}
              strokeWidth={1.2}
              style={{ filter: `drop-shadow(0 0 4px ${row.color}aa)` }}
            />
            {/* Diagonal safety stripes overlay */}
            <rect
              x={2}
              y={y + 1}
              width={width - 4}
              height={rowH - 2}
              rx={3}
              fill={`url(#stunt-stripes-${delayMs})`}
            />
            {row.label && width >= 70 && (
              <text
                x={width / 2}
                y={y + rowH / 2 + 3}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={8}
                fontFamily="monospace"
                fontWeight="bold"
                opacity={0.85}
                style={{ letterSpacing: '0.15em' }}
              >
                STUNT
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Side tower (ladder silhouette): 3 vertical rungs + horizontal bars.
 *  Purely decorative — implies the source of the fall. Not animated. */
function SideTower({ color, height }: { color: string; height: number }) {
  const rungs = 4;
  return (
    <svg
      width={18}
      height={height}
      viewBox={`0 0 18 ${height}`}
      style={{ display: 'block', opacity: 0.55 }}
      aria-hidden
    >
      {/* Two vertical rails */}
      <line x1={4} y1={0} x2={4} y2={height} stroke={color} strokeWidth={1.2} />
      <line x1={14} y1={0} x2={14} y2={height} stroke={color} strokeWidth={1.2} />
      {/* Horizontal rungs, evenly spaced */}
      {Array.from({ length: rungs }).map((_, i) => {
        const y = ((i + 1) * height) / (rungs + 1);
        return (
          <line
            key={i}
            x1={4}
            y1={y}
            x2={14}
            y2={y}
            stroke={color}
            strokeWidth={1}
            opacity={0.85}
          />
        );
      })}
      {/* Tower cap */}
      <rect x={2} y={0} width={14} height={3} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.8} />
    </svg>
  );
}

/** Splash burst — radiating lines + 3 puff dots, expanding outward on impact.
 *  Anchored at the top of the cushion (the impact point). */
function SplashBurst({ color, delayMs, playState }: {
  color: string;
  delayMs: number;
  playState: CSSProperties['animationPlayState'];
}) {
  const spokes = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg
      width={80}
      height={80}
      viewBox="-40 -40 80 80"
      style={{
        display: 'block',
        transformOrigin: 'center',
        animation: `test-splash ${CYCLE_S}s ease-out infinite`,
        animationDelay: `${delayMs}ms`,
        animationPlayState: playState,
      }}
      aria-hidden
    >
      {/* Radiating spoke lines */}
      {spokes.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = Math.cos(rad) * 8;
        const y1 = Math.sin(rad) * 8;
        const x2 = Math.cos(rad) * 22;
        const y2 = Math.sin(rad) * 22;
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={1.6}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        );
      })}
      {/* Three puff dots */}
      <circle cx={-14} cy={-10} r={3} fill={color} fillOpacity={0.85} />
      <circle cx={16} cy={-8} r={2.5} fill={color} fillOpacity={0.85} />
      <circle cx={0} cy={16} r={3.2} fill={color} fillOpacity={0.85} />
    </svg>
  );
}

/** Thumbs-up glyph — a chunky pixel-art thumb, pops above the head with a
 *  spring scale-in during the celebration window. */
function ThumbsUpGlyph({ color, delayMs, playState }: {
  color: string;
  delayMs: number;
  playState: CSSProperties['animationPlayState'];
}) {
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      style={{
        display: 'block',
        transformOrigin: 'center',
        animation: `test-thumbsup ${CYCLE_S}s ease-out infinite`,
        animationDelay: `${delayMs}ms`,
        animationPlayState: playState,
      }}
      aria-hidden
    >
      {/* Thumb shaft */}
      <path
        d="M 11 4 Q 14 4 14 8 L 14 11 L 19 11 Q 22 11 22 14 L 22 21 Q 22 24 19 24 L 10 24 L 7 22 L 7 14 L 11 11 Z"
        fill={color}
        fillOpacity={0.85}
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {/* Knuckle crease */}
      <line x1={14} y1={15} x2={22} y2={15} stroke="#000" strokeWidth={0.8} opacity={0.35} />
      <line x1={14} y1={19} x2={22} y2={19} stroke="#000" strokeWidth={0.8} opacity={0.35} />
    </svg>
  );
}

/** A tiny star/asterisk "ouch" mark that flickers during the sprawl window. */
function ImpactMark({ color, delayMs, playState }: {
  color: string;
  delayMs: number;
  playState: CSSProperties['animationPlayState'];
}) {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        color,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 16,
        lineHeight: '14px',
        textAlign: 'center',
        textShadow: `0 0 6px ${color}`,
        animation: `test-impact-mark ${CYCLE_S}s ease-in-out infinite`,
        animationDelay: `${delayMs}ms`,
        animationPlayState: playState,
      }}
      aria-hidden
    >
      *
    </div>
  );
}

interface LaneProps {
  agent: AgentState;
  index: number;
  color: string;
  laneWidth: number;
  laneHeight: number;
  spriteSize: 'sm' | 'md';
}

/** One lane: ceiling + tower + cushion + animated agent. */
function Lane({ agent, index, color, laneWidth, laneHeight, spriteSize }: LaneProps) {
  const agentColor = projectColor(agent.project);
  const resting = isResting(agent.status);
  const delayMs = index * STAGGER_MS;
  const playState: CSSProperties['animationPlayState'] = resting ? 'paused' : 'running';

  // Sprite dimensions (must match AgentSprite's DIMENSIONS table).
  // Capped at `md` — the ceiling hatch + cushion stack chrome doesn't leave
  // enough vertical room for `lg` (165 tall) without clipping the agent.
  const spriteW = spriteSize === 'md' ? 80 : 52;
  const spriteH = spriteSize === 'md' ? 120 : 78;

  // Cushion dimensions scale to lane. Keep it narrower than the lane so the
  // ladder + label have breathing room.
  const cushionW = Math.min(laneWidth - 30, Math.max(60, spriteW + 20));
  const cushionH = Math.max(40, Math.min(72, Math.round(spriteH * 0.35)));

  // Vertical geometry inside the lane (top to bottom):
  //   [ ceiling strip ] [ fall track ... ] [ cushion ] [ label ]
  // Expressed as absolute pixels from top/bottom.
  const labelAreaH = 30;
  const cushionBottom = labelAreaH;
  const ceilingTopOffset = 2;

  // Fall distance is computed inside the CSS keyframe via `--fall`, which we
  // set to `calc(100% - spriteH - 10px)` below — adapts to actual lane height.

  return (
    <div
      className="relative h-full"
      style={{ width: laneWidth, flex: '0 0 auto' }}
    >
      {/* Ceiling hatch — anchored to the top of the lane */}
      <div
        className="absolute left-1/2"
        style={{
          top: ceilingTopOffset,
          transform: 'translateX(-50%)',
        }}
      >
        <CeilingHatch color={color} delayMs={delayMs} playState={playState} />
      </div>

      {/* Side tower/ladder — decorative, sits to the right of the cushion */}
      <div
        className="absolute"
        style={{
          right: 4,
          bottom: cushionBottom,
          height: laneHeight - cushionBottom - 40,
          opacity: 0.7,
        }}
      >
        <SideTower color={color} height={laneHeight - cushionBottom - 40} />
      </div>

      {/* Cushion stack — anchored to the floor (above the label). Also hosts
       *  the splash burst and impact mark at its top edge. */}
      <div
        className="absolute left-1/2"
        style={{
          bottom: cushionBottom,
          transform: 'translateX(-50%)',
          width: cushionW,
          height: cushionH,
        }}
      >
        <CushionStack
          delayMs={delayMs}
          playState={playState}
          width={cushionW}
          height={cushionH}
        />
        {/* Splash burst at the top-center of the cushion */}
        <div
          className="absolute left-1/2"
          style={{
            top: -40,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        >
          <SplashBurst color={color} delayMs={delayMs} playState={playState} />
        </div>
        {/* Tiny impact mark near top-center */}
        <div
          className="absolute left-1/2"
          style={{
            top: 2,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
        >
          <ImpactMark color={color} delayMs={delayMs} playState={playState} />
        </div>
      </div>

      {/* Agent — absolutely positioned inside a full-lane track.
       *  The wrapping div is driven by `test-agent-cycle`, which translates
       *  (from ceiling to floor) and rotates (head-down, sprawl, upright).
       *  When resting, the animation is paused and we snap the sprite to a
       *  "standing next to cushion" pose so the room looks powered down. */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: ceilingTopOffset + 6,
          bottom: cushionBottom,
          width: spriteW,
          marginLeft: -spriteW / 2,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: spriteW,
            height: spriteH,
            // Fall distance = wrapper height - sprite height - 10px headroom.
            // Using `calc(100% - ...)` so the fall adapts to whatever height
            // the lane actually occupies, not a hardcoded estimate.
            ['--fall' as string]: `calc(100% - ${spriteH + 10}px)`,
            transformOrigin: 'center bottom',
            animation: `test-agent-cycle ${CYCLE_S}s linear infinite`,
            animationDelay: `${delayMs}ms`,
            animationPlayState: playState,
            // When resting: agent rests standing on the cushion.
            transform: resting
              ? `translateY(calc(var(--fall) - 4px))`
              : undefined,
            opacity: resting ? 0.7 : 1,
          }}
        >
          {/* The sprite itself. We use AgentSprite as-is — its built-in TEST
           *  stirring arm animation is hidden by our wrapper's transforms
           *  during the fall/sprawl, and by the time the agent is standing
           *  the brief celebration window dominates visually. */}
          <AgentSprite
            color={agentColor}
            status={agent.status}
            phase={agent.phase}
            size={spriteSize}
          />

          {/* Thumbs-up glyph — lives above the agent's head and pops during
           *  the celebration window via its own keyframe. */}
          <div
            style={{
              position: 'absolute',
              top: -22,
              left: '50%',
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          >
            <ThumbsUpGlyph color={color} delayMs={delayMs} playState={playState} />
          </div>
        </div>
      </div>

      {/* Label pinned at the bottom of the lane, below the cushion */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: 4 }}
      >
        <AgentLabel agent={agent} />
      </div>
    </div>
  );
}

export function TestScene({ agents, color }: SceneProps) {
  if (agents.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="font-display tracking-[0.4em] text-sm"
          style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
        >
          // STUNT FLOOR STANDBY //
        </div>
      </div>
    );
  }

  // Decide sprite size from agent count — solo agent gets the big sprite,
  // 2 agents are medium, 3-4 agents go small to keep lanes readable.
  const spriteSize: 'sm' | 'md' = agents.length <= 2 ? 'md' : 'sm';

  return (
    <div className="absolute inset-0 pt-11 pb-10 px-2 overflow-hidden">
      <div className="relative w-full h-full">
        {/* Faint floor line across the whole room, below the cushions */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: 30,
            height: 1,
            background: `linear-gradient(to right, transparent, ${color}55, transparent)`,
          }}
        />
        {/* Faint ceiling line along the top */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: 2,
            height: 1,
            background: `linear-gradient(to right, transparent, ${color}44, transparent)`,
          }}
        />

        <AnimatePresence mode="popLayout">
          <motion.div
            key="lanes"
            className="relative w-full h-full flex items-stretch justify-around"
          >
            {agents.map((agent, index) => {
              const resting = isResting(agent.status);
              const laneCount = agents.length;
              // Lanes share width equally; assume ~parent width available.
              // We use flex so exact pixel width isn't needed, but individual
              // inner elements want a number — pick a sensible target width.
              const laneWidth =
                laneCount === 1 ? 280 : laneCount === 2 ? 200 : laneCount === 3 ? 150 : 130;
              // Lane height is just "full lane area" — we use 100% and let
              // absolute positioning inside the lane do the work. For the
              // fall distance math we need a number, though, so we estimate
              // from a conservative minimum.
              const laneHeight = 260;
              return (
                <motion.div
                  key={agent.key}
                  layoutId={`agent-${agent.key}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: resting ? 0.75 : 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="relative h-full"
                  style={{
                    flex: `1 1 ${laneWidth}px`,
                    maxWidth: laneWidth + 40,
                    minWidth: 110,
                  }}
                >
                  <Lane
                    agent={agent}
                    index={index}
                    color={color}
                    laneWidth={laneWidth}
                    laneHeight={laneHeight}
                    spriteSize={spriteSize}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
