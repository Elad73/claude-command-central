import { AnimatePresence, motion } from 'framer-motion';
import type { AgentState } from '../../types';
import { AgentSprite } from '../AgentSprite';
import { useProjectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import { isResting, type SceneProps } from './types';
import { Atmosphere } from './Atmosphere';

/**
 * STRATEGY — a planner's study.
 *
 * Each agent gets their own planning desk (lamp, papers, ruler, folder, pen).
 * The desk occludes the sprite's lower body — we only see shoulders+head+arms
 * above the desk surface. Every ~4.5s the agent completes one pen-and-pause
 * cycle: dip → sweep pen left→right → lift → ponder → reset.
 *
 * When an agent is resting the lamp dims and all motion freezes
 * (animationPlayState: paused) — "end of shift".
 */

/** Warm desk-lamp color. Kept constant regardless of the room accent. */
const LAMP_COLOR = '#ffd166';

/** Grid template for 1, 2, 3, or 4 agents — 2×2 base with 3-agent override. */
function gridStyle(n: number): React.CSSProperties {
  if (n <= 1) {
    return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
  }
  if (n === 2) {
    return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
  }
  // 3 or 4 agents: 2×2
  return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
}

/** When 3 agents, place the 3rd one centered on the bottom row. */
function cellStyle(index: number, total: number): React.CSSProperties {
  if (total === 3 && index === 2) {
    return { gridColumn: '1 / span 2', justifySelf: 'center', width: '50%' };
  }
  return {};
}

export function StrategyScene({ agents, color }: SceneProps) {
  if (agents.length === 0) {
    return (
      <>
        <Atmosphere phase="PLAN" color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display tracking-[0.4em] text-sm"
            style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
          >
            // STUDY IDLE //
          </div>
        </div>
      </>
    );
  }

  const size: 'sm' | 'md' = agents.length >= 3 ? 'sm' : 'md';

  return (
    <>
      <Atmosphere phase="PLAN" color={color} />
      <div className="absolute inset-0 pt-11 pb-10 px-3">
        <div className="w-full h-full grid gap-2" style={gridStyle(agents.length)}>
          <AnimatePresence mode="popLayout">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.key}
                layoutId={`agent-${agent.key}`}
                initial={{ opacity: 0, scale: 0.85, y: 8 }}
                animate={{ opacity: isResting(agent.status) ? 0.75 : 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -8 }}
                transition={{ type: 'spring', stiffness: 240, damping: 26 }}
                style={cellStyle(i, agents.length)}
                className="relative flex items-end justify-center"
              >
                <PlanningDesk agent={agent} accent={color} size={size} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------------- */

interface DeskProps {
  agent: AgentState;
  accent: string;
  size: 'sm' | 'md';
}

/**
 * One planning station. Stacks (from back to front):
 *   lamp cone → thought dots → agent sprite → desk surface + stationery →
 *   label below.
 *
 * The agent's lower body is hidden behind the desk via a clipped container
 * and an overlaid desk `<svg>`.
 */
function PlanningDesk({ agent, accent, size }: DeskProps) {
  const projectColor = useProjectColor();
  const agentColor = projectColor(agent.project);
  const resting = isResting(agent.status);

  // Scene dims — keep the station self-contained so multi-agent grid scales.
  const deskW = size === 'md' ? 220 : 170;
  const deskH = size === 'md' ? 90 : 70;
  // How far up the sprite we want to hide behind the desk. The sprite's
  // "chest line" is ~55% from the top, so we clip a little below that.
  const spriteH = size === 'md' ? 120 : 78;
  const visibleSpriteH = Math.round(spriteH * 0.58); // show head + shoulders + upper arms

  // Animation play-state — frozen when resting.
  const play = resting ? 'paused' : 'running';

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: deskW, maxWidth: '100%' }}
    >
      {/* SPRITE + LAMP + DESK column */}
      <div
        className="relative"
        style={{ width: deskW, height: visibleSpriteH + deskH }}
      >
        {/* Lamp cone (behind agent) */}
        <LampCone
          width={deskW}
          topY={0}
          bottomY={visibleSpriteH + deskH - 8}
          resting={resting}
        />

        {/* Thought dots above head */}
        <ThoughtDots accent={accent} resting={resting} />

        {/* Sprite — clipped so only the upper body is visible */}
        <div
          className="absolute left-1/2"
          style={{
            top: 0,
            transform: 'translateX(-50%)',
            width: size === 'md' ? 80 : 52,
            height: visibleSpriteH,
            overflow: 'hidden',
            // Fade the bottom edge into the desk to avoid a hard clip line.
            WebkitMaskImage:
              'linear-gradient(to bottom, #000 0%, #000 85%, transparent 100%)',
            maskImage:
              'linear-gradient(to bottom, #000 0%, #000 85%, transparent 100%)',
            animation: 'strategy-head-ponder 4.5s ease-in-out infinite',
            animationPlayState: play,
            transformOrigin: 'center 80%',
          }}
        >
          <AgentSprite
            color={agentColor}
            status={agent.status}
            phase={agent.phase}
            size={size}
          />
        </div>

        {/* Writing arm overlay — a stylized forearm + pen in front of the
            desk, rotating around the shoulder anchor. Purely decorative; the
            sprite already has its own idle arms behind the desk. */}
        <WritingArm
          deskW={deskW}
          deskTop={visibleSpriteH}
          accent={accent}
          agentColor={agentColor}
          resting={resting}
        />

        {/* Desk surface + stationery (in front of sprite) */}
        <div
          className="absolute left-0"
          style={{ top: visibleSpriteH, width: deskW, height: deskH }}
        >
          <DeskSurface
            width={deskW}
            height={deskH}
            accent={accent}
            lampResting={resting}
          />
        </div>
      </div>

      {/* Label under the desk */}
      <div style={{ marginTop: 4 }}>
        <AgentLabel agent={agent} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

/** Warm radial cone of lamp light. Dims when resting. */
function LampCone({
  width,
  topY,
  bottomY,
  resting,
}: {
  width: number;
  topY: number;
  bottomY: number;
  resting: boolean;
}) {
  const h = bottomY - topY;
  const gradId = `strategy-lamp-${Math.round(width)}-${Math.round(h)}`;
  const lampX = width * 0.3; // lamp sits on left side of desk
  const coneTopY = topY + h * 0.12;
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={h}
      viewBox={`0 0 ${width} ${h}`}
      style={{
        opacity: resting ? 0.22 : 0.85,
        transition: 'opacity 400ms ease-out',
        animation: resting ? 'none' : 'strategy-lamp-flicker 3.4s ease-in-out infinite',
      }}
    >
      <defs>
        <radialGradient
          id={gradId}
          cx={lampX}
          cy={coneTopY}
          r={h * 0.85}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={LAMP_COLOR} stopOpacity={0.55} />
          <stop offset="45%" stopColor={LAMP_COLOR} stopOpacity={0.18} />
          <stop offset="100%" stopColor={LAMP_COLOR} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Cone polygon, softened by gradient fill */}
      <polygon
        points={`${lampX},${coneTopY} ${lampX - width * 0.28},${bottomY - topY} ${lampX + width * 0.28},${bottomY - topY}`}
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

/* ----------------------------------------------------------------------- */

/** Three floating dots above the head, cycling • / •• / •••. */
function ThoughtDots({ accent, resting }: { accent: string; resting: boolean }) {
  const play = resting ? 'paused' : 'running';
  const dotStyle = (anim: string): React.CSSProperties => ({
    width: 3,
    height: 3,
    borderRadius: '50%',
    background: accent,
    boxShadow: `0 0 4px ${accent}`,
    animation: `${anim} 1.8s ease-in-out infinite`,
    animationPlayState: play,
    opacity: resting ? 0.2 : 0.8,
  });
  return (
    <div
      className="absolute flex items-center gap-[3px]"
      style={{
        top: -4,
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    >
      <span style={dotStyle('strategy-thought-1')} />
      <span style={dotStyle('strategy-thought-2')} />
      <span style={dotStyle('strategy-thought-3')} />
    </div>
  );
}

/* ----------------------------------------------------------------------- */

/**
 * Writing forearm + pen that dips onto the paper and sweeps across it.
 * Rotates around the agent's right shoulder. The underlying sprite's own
 * arm animation is hidden behind the desk — this overlay sells the action.
 */
function WritingArm({
  deskW,
  deskTop,
  accent,
  agentColor,
  resting,
}: {
  deskW: number;
  deskTop: number;
  accent: string;
  agentColor: string;
  resting: boolean;
}) {
  const play = resting ? 'paused' : 'running';
  // Anchor the shoulder just right of center, at the desk line.
  const shoulderX = deskW * 0.55;
  const shoulderY = deskTop - 4;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: shoulderX - 4,
        top: shoulderY - 4,
        width: 8,
        height: 8,
      }}
    >
      {/* Shoulder-pivot rotator */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 8,
          height: 8,
          transformOrigin: '4px 4px',
          animation: 'strategy-pen-arm 4.5s ease-in-out infinite',
          animationPlayState: play,
        }}
      >
        {/* Forearm — short bar from shoulder toward the paper */}
        <div
          style={{
            position: 'absolute',
            left: 4,
            top: 2,
            width: 30,
            height: 5,
            background: `linear-gradient(to right, ${agentColor}, ${agentColor}bb)`,
            borderRadius: 3,
            boxShadow: `0 0 6px ${agentColor}`,
          }}
        />
        {/* Hand joint */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 1,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: agentColor,
            boxShadow: `0 0 5px ${agentColor}`,
          }}
        />
        {/* Pen — held by the hand, sweeps horizontally during the writing window */}
        <div
          style={{
            position: 'absolute',
            left: 32,
            top: 4,
            width: 18,
            height: 2,
            background: accent,
            boxShadow: `0 0 4px ${accent}`,
            transformOrigin: 'left center',
            transform: 'rotate(28deg)',
            animation: 'strategy-pen-sweep 4.5s ease-in-out infinite',
            animationPlayState: play,
          }}
        >
          {/* Pen tip */}
          <div
            style={{
              position: 'absolute',
              right: -2,
              top: -1,
              width: 4,
              height: 4,
              background: '#ffffff',
              borderRadius: '50%',
              boxShadow: `0 0 4px ${accent}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */

/**
 * Desk surface in a flat front-elevation style. Renders:
 *   - a wooden/ink-tinted slab
 *   - a lamp (base + neck + shade) on the left
 *   - 2-3 sheets of ruled paper
 *   - a ruler
 *   - an open folder on the right
 */
function DeskSurface({
  width,
  height,
  accent,
  lampResting,
}: {
  width: number;
  height: number;
  accent: string;
  lampResting: boolean;
}) {
  const gradId = `strategy-desk-${Math.round(width)}-${Math.round(height)}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a3b" stopOpacity={1} />
          <stop offset="55%" stopColor="#11112a" stopOpacity={1} />
          <stop offset="100%" stopColor="#05050d" stopOpacity={1} />
        </linearGradient>
      </defs>

      {/* Desk front slab (trapezoid for a little perspective) */}
      <polygon
        points={`0,6 ${width},6 ${width - 10},${height - 2} 10,${height - 2}`}
        fill={`url(#${gradId})`}
        stroke={accent}
        strokeWidth={1.5}
        opacity={0.95}
      />
      {/* Desk top edge highlight */}
      <line
        x1={0}
        y1={6}
        x2={width}
        y2={6}
        stroke={accent}
        strokeWidth={1.2}
        opacity={0.9}
      />
      {/* Subtle panel seam */}
      <line
        x1={10}
        y1={height * 0.55}
        x2={width - 10}
        y2={height * 0.55}
        stroke={accent}
        strokeWidth={0.6}
        opacity={0.3}
      />

      {/* Stationery sits on the top edge (y ~= 6..18) */}

      {/* Paper 1 — main sheet, slightly tilted */}
      <g transform={`translate(${width * 0.32}, ${height * 0.15}) rotate(-4)`}>
        <rect
          x={0}
          y={0}
          width={width * 0.25}
          height={height * 0.55}
          fill="#f6f2e4"
          stroke="#d4cdb4"
          strokeWidth={0.6}
          rx={1}
        />
        {/* Ruled lines */}
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line
            key={f}
            x1={3}
            y1={height * 0.55 * f}
            x2={width * 0.25 - 3}
            y2={height * 0.55 * f}
            stroke="#9a8d65"
            strokeWidth={0.4}
            opacity={0.55}
          />
        ))}
      </g>

      {/* Paper 2 — smaller, under the main sheet */}
      <g transform={`translate(${width * 0.48}, ${height * 0.22}) rotate(7)`}>
        <rect
          x={0}
          y={0}
          width={width * 0.18}
          height={height * 0.42}
          fill="#eae4cf"
          stroke="#c0b794"
          strokeWidth={0.5}
          rx={1}
          opacity={0.9}
        />
        {[0.3, 0.6].map((f) => (
          <line
            key={f}
            x1={3}
            y1={height * 0.42 * f}
            x2={width * 0.18 - 3}
            y2={height * 0.42 * f}
            stroke="#8a7d55"
            strokeWidth={0.35}
            opacity={0.5}
          />
        ))}
      </g>

      {/* Paper 3 — torn corner scrap */}
      <polygon
        points={`${width * 0.25},${height * 0.72} ${width * 0.33},${height * 0.7} ${width * 0.32},${height * 0.88} ${width * 0.24},${height * 0.86}`}
        fill="#f0ead1"
        stroke="#c0b794"
        strokeWidth={0.4}
        opacity={0.85}
      />

      {/* Ruler — thin rectangle with tick marks, near the bottom of the desk */}
      <g transform={`translate(${width * 0.08}, ${height * 0.75}) rotate(-8)`}>
        <rect
          x={0}
          y={0}
          width={width * 0.22}
          height={5}
          fill="#2a3a2e"
          stroke={accent}
          strokeWidth={0.6}
          rx={0.5}
        />
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={i}
            x1={3 + i * ((width * 0.22 - 6) / 7)}
            y1={0}
            x2={3 + i * ((width * 0.22 - 6) / 7)}
            y2={2}
            stroke={accent}
            strokeWidth={0.4}
            opacity={0.8}
          />
        ))}
      </g>

      {/* Open folder on the right */}
      <g transform={`translate(${width * 0.72}, ${height * 0.18})`}>
        {/* Back flap */}
        <polygon
          points={`0,4 ${width * 0.22},4 ${width * 0.22},${height * 0.6} 0,${height * 0.6}`}
          fill="#3a2a1a"
          stroke={accent}
          strokeWidth={0.8}
          opacity={0.9}
        />
        {/* Tab */}
        <rect
          x={width * 0.05}
          y={0}
          width={width * 0.08}
          height={5}
          fill="#4a3624"
          stroke={accent}
          strokeWidth={0.5}
        />
        {/* Paper peeking out */}
        <rect
          x={3}
          y={7}
          width={width * 0.22 - 6}
          height={height * 0.5}
          fill="#ece4c6"
          stroke="#b3a775"
          strokeWidth={0.4}
          opacity={0.9}
        />
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={6}
            y1={7 + height * 0.5 * f}
            x2={width * 0.22 - 6}
            y2={7 + height * 0.5 * f}
            stroke="#8a7d55"
            strokeWidth={0.35}
            opacity={0.5}
          />
        ))}
      </g>

      {/* Desk lamp on the left — shade + neck + base */}
      <g transform={`translate(${width * 0.06}, ${-height * 0.05})`}>
        {/* Base */}
        <ellipse
          cx={10}
          cy={height * 0.9}
          rx={8}
          ry={2}
          fill="#0a0a18"
          stroke={accent}
          strokeWidth={0.7}
        />
        {/* Neck */}
        <line
          x1={10}
          y1={height * 0.9}
          x2={14}
          y2={height * 0.35}
          stroke={accent}
          strokeWidth={1.3}
          opacity={0.85}
        />
        {/* Shade */}
        <polygon
          points={`6,${height * 0.35} 22,${height * 0.35} 26,${height * 0.6} 2,${height * 0.6}`}
          fill={lampResting ? '#2a2616' : LAMP_COLOR}
          stroke={accent}
          strokeWidth={0.9}
          opacity={lampResting ? 0.4 : 0.9}
        />
        {/* Bulb glow spot under the shade */}
        <circle
          cx={14}
          cy={height * 0.62}
          r={3}
          fill={LAMP_COLOR}
          opacity={lampResting ? 0.2 : 0.9}
          style={{
            filter: `drop-shadow(0 0 ${lampResting ? 1 : 5}px ${LAMP_COLOR})`,
          }}
        />
      </g>
    </svg>
  );
}
