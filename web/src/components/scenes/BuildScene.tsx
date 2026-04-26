import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { AgentSprite } from '../AgentSprite';
import { projectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import { isResting, type SceneProps } from './types';
import { Atmosphere } from './Atmosphere';

/**
 * BUILD scene — a construction workshop.
 *
 * Back wall: a tool rack with 4 tools hanging on hooks (sledgehammer, saw,
 * drill, paint bucket + brush). Always visible regardless of agent count.
 *
 * Floor: up to 4 agent stations spread horizontally. Each agent picks a
 * deterministic tool via a hash of `agent.key` so a given agent always plays
 * the same role within a session. Each tool has its own target and loop:
 *
 *   - Hammer  — nail in plank on sawhorses; 700ms strike + recoil cycle.
 *   - Saw     — plank being sawn; 1.2s forward/back slide, sawdust particles.
 *   - Drill   — vertical board with screws; 1s press cycle, bit spins, shavings.
 *   - Paint   — wall panel; 1.1s brush strokes, paint fill height grows.
 *
 * All loops pause (`animationPlayState: 'paused'`) when the agent is resting,
 * and the sprite itself dims (via AgentSprite's own resting handling).
 */

type ToolId = 'hammer' | 'saw' | 'drill' | 'paint';
const TOOLS: readonly ToolId[] = ['hammer', 'saw', 'drill', 'paint'] as const;

const hash = (s: string): number => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return h;
};

const pickTool = (key: string): ToolId => {
  const idx = hash(key) % TOOLS.length;
  // Safe: idx is in [0, TOOLS.length). noUncheckedIndexedAccess still widens
  // to `| undefined`, so narrow explicitly.
  return TOOLS[idx] ?? 'hammer';
};

export function BuildScene({ agents, color }: SceneProps) {
  const stations = agents.slice(0, 4);
  return (
    <>
      <Atmosphere phase="BUILD" color={color} />
      <div className="absolute inset-0 pt-11 pb-10 px-3 overflow-hidden">
      {/* Back wall: tool rack (always visible) */}
      <ToolRack color={color} />

      {/* Floor line */}
      <div
        className="absolute left-3 right-3"
        style={{
          bottom: 42,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${color}55, transparent)`,
          boxShadow: `0 0 8px ${color}55`,
        }}
      />

      {stations.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display tracking-[0.4em] text-sm"
            style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
          >
            // BAY IDLE //
          </div>
        </div>
      ) : (
        <div
          className="absolute inset-x-0 flex items-end justify-around"
          style={{ top: '44%', bottom: 40 }}
        >
          <AnimatePresence mode="popLayout">
            {stations.map((agent) => {
              const tool = pickTool(agent.key);
              const resting = isResting(agent.status);
              const agentColor = projectColor(agent.project);
              // The 78px tool rack at the top + station chrome below leaves
              // ~150px for the sprite. `lg` (165 tall) clips the head; cap at
              // `md` for 1-2 agents and shrink to `sm` when the bay fills up
              // so 4 agents stay shoulder-to-shoulder without overflow.
              const size: 'sm' | 'md' = stations.length <= 2 ? 'md' : 'sm';
              return (
                <motion.div
                  key={agent.key}
                  layoutId={`agent-${agent.key}`}
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: resting ? 0.7 : 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -8 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="relative flex-1 flex flex-col items-center justify-end"
                  style={{ minWidth: 0 }}
                >
                  {/* Floating tool icon badge above the agent */}
                  <ToolBadge tool={tool} color={color} resting={resting} />

                  <Station
                    tool={tool}
                    color={color}
                    resting={resting}
                    size={size}
                  >
                    <AgentSprite
                      color={agentColor}
                      status={agent.status}
                      phase="BUILD"
                      size={size}
                    />
                  </Station>

                  <div className="mt-1">
                    <AgentLabel agent={agent} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Tool rack (back wall)                                                      */
/* -------------------------------------------------------------------------- */

function ToolRack({ color }: { color: string }) {
  return (
    <div
      className="absolute left-4 right-4 pointer-events-none"
      style={{ top: 6, height: 72 }}
    >
      {/* Rack board */}
      <div
        className="absolute inset-x-0 top-0 rounded-sm"
        style={{
          height: 8,
          background: `linear-gradient(180deg, ${color}30, ${color}14)`,
          border: `1px solid ${color}55`,
          boxShadow: `0 0 10px ${color}33`,
        }}
      />
      <svg
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Four hooks evenly spaced */}
        {[50, 150, 250, 350].map((cx, i) => (
          <line
            key={i}
            x1={cx}
            y1={8}
            x2={cx}
            y2={14}
            stroke={color}
            strokeWidth={1.5}
            opacity={0.7}
          />
        ))}
        {/* Hammer at x=50 */}
        <g transform="translate(50 14)">
          <line x1={0} y1={0} x2={0} y2={44} stroke={color} strokeWidth={2.5} />
          <rect
            x={-14}
            y={-2}
            width={28}
            height={12}
            rx={1.5}
            fill={color}
            fillOpacity={0.5}
            stroke={color}
            strokeWidth={1.4}
          />
          <rect x={-14} y={-2} width={6} height={12} fill={color} opacity={0.85} />
          <rect x={8} y={-2} width={6} height={12} fill={color} opacity={0.85} />
        </g>
        {/* Saw at x=150 */}
        <g transform="translate(150 14)">
          <rect
            x={-14}
            y={0}
            width={12}
            height={14}
            rx={2}
            fill={color}
            fillOpacity={0.45}
            stroke={color}
            strokeWidth={1.2}
          />
          <path
            d={`M -2 2 L 30 18 L 30 22 L -2 12 Z`}
            fill={color}
            fillOpacity={0.35}
            stroke={color}
            strokeWidth={1.2}
          />
          {/* Jagged teeth */}
          <path
            d={`M 0 13 L 4 17 L 8 13 L 12 17 L 16 13 L 20 17 L 24 13 L 28 17 L 30 15`}
            stroke={color}
            strokeWidth={1}
            fill="none"
            opacity={0.85}
          />
        </g>
        {/* Drill at x=250 */}
        <g transform="translate(250 14)">
          <rect
            x={-14}
            y={0}
            width={26}
            height={14}
            rx={3}
            fill={color}
            fillOpacity={0.5}
            stroke={color}
            strokeWidth={1.3}
          />
          <rect
            x={-10}
            y={14}
            width={10}
            height={14}
            fill={color}
            fillOpacity={0.45}
            stroke={color}
            strokeWidth={1}
          />
          <rect x={10} y={4} width={14} height={6} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1} />
          <line x1={24} y1={7} x2={34} y2={7} stroke={color} strokeWidth={2} />
          <circle cx={-10} cy={6} r={1.5} fill={color} />
        </g>
        {/* Paint bucket + brush at x=350 */}
        <g transform="translate(350 14)">
          <path
            d={`M -10 2 L 10 2 L 8 20 L -8 20 Z`}
            fill={color}
            fillOpacity={0.35}
            stroke={color}
            strokeWidth={1.2}
          />
          <path d={`M -10 2 Q 0 -4 10 2`} fill="none" stroke={color} strokeWidth={1.2} />
          <rect x={-6} y={4} width={12} height={3} fill={color} fillOpacity={0.7} />
          {/* Brush poking out */}
          <rect x={3} y={-6} width={3} height={12} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={0.8} />
          <rect x={1} y={-10} width={7} height={5} rx={1} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={0.8} />
        </g>
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating tool badge (shows WHICH tool the agent is using)                  */
/* -------------------------------------------------------------------------- */

function ToolBadge({ tool, color, resting }: { tool: ToolId; color: string; resting: boolean }) {
  return (
    <div
      className="mb-1 rounded-full px-2 py-[2px] flex items-center gap-1 font-mono"
      style={{
        fontSize: 9,
        letterSpacing: '0.12em',
        color,
        background: `${color}14`,
        border: `1px solid ${color}55`,
        boxShadow: `0 0 6px ${color}44`,
        opacity: resting ? 0.55 : 1,
      }}
    >
      <MiniToolIcon tool={tool} color={color} />
      <span style={{ textTransform: 'uppercase' }}>{tool}</span>
    </div>
  );
}

function MiniToolIcon({ tool, color }: { tool: ToolId; color: string }) {
  // Tiny 12×12 icons, aligned with the badge
  if (tool === 'hammer') {
    return (
      <svg width={12} height={12} viewBox="0 0 12 12">
        <rect x={2} y={2} width={8} height={3} fill={color} />
        <rect x={5.2} y={5} width={1.6} height={6} fill={color} />
      </svg>
    );
  }
  if (tool === 'saw') {
    return (
      <svg width={12} height={12} viewBox="0 0 12 12">
        <path d="M 1 3 L 11 6 L 11 7 L 1 4 Z" fill={color} />
        <path d="M 1 6 L 2 8 L 3 6 L 4 8 L 5 6 L 6 8 L 7 6 L 8 8 L 9 6" stroke={color} strokeWidth={0.8} fill="none" />
      </svg>
    );
  }
  if (tool === 'drill') {
    return (
      <svg width={12} height={12} viewBox="0 0 12 12">
        <rect x={1} y={3} width={7} height={5} rx={1} fill={color} />
        <rect x={8} y={4.5} width={3} height={2} fill={color} />
      </svg>
    );
  }
  // paint
  return (
    <svg width={12} height={12} viewBox="0 0 12 12">
      <path d="M 2 3 L 10 3 L 9 10 L 3 10 Z" fill={color} fillOpacity={0.6} stroke={color} strokeWidth={0.6} />
      <rect x={5} y={1} width={2} height={2} fill={color} />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Stations (per tool)                                                        */
/* -------------------------------------------------------------------------- */

interface StationChromeProps {
  tool: ToolId;
  color: string;
  resting: boolean;
  size: 'sm' | 'md';
  children: ReactNode;
}

function Station({ tool, color, resting, size, children }: StationChromeProps) {
  // Slightly taller layout for the larger (single-agent) size so the tool
  // + target still fit cleanly below the sprite.
  const stationWidth = size === 'md' ? 150 : 110;
  const playState: CSSProperties['animationPlayState'] = resting ? 'paused' : 'running';

  return (
    <div
      className="relative flex flex-col items-center justify-end"
      style={{ width: stationWidth, maxWidth: '100%' }}
    >
      {/* The sprite itself. The per-tool wielded object is drawn as an overlay
          so it appears in the sprite's "hand area". Hand area ≈ bottom-right
          of the sprite bounding box for hammer/saw/drill; paint uses the wall
          side instead. */}
      <div className="relative">
        {children}

        {/* Tool-in-hand overlay (animates around the sprite) */}
        <ToolInHand tool={tool} color={color} size={size} playState={playState} />
      </div>

      {/* Target at the station foot */}
      <div className="relative" style={{ marginTop: -6, width: stationWidth, height: 28 }}>
        <Target tool={tool} color={color} playState={playState} size={size} />
      </div>
    </div>
  );
}

/* ----------------------------- Tool in hand ------------------------------- */

interface ToolProps {
  tool: ToolId;
  color: string;
  size: 'sm' | 'md';
  playState: CSSProperties['animationPlayState'];
}

function ToolInHand({ tool, color, playState, size }: ToolProps) {
  // The sprite's right hand sits at roughly (94, 130) in its 120×180 viewBox,
  // which means roughly 78% across and 72% down of its rendered box.
  const spriteW = size === 'md' ? 80 : 52;
  const spriteH = size === 'md' ? 120 : 78;

  // Common hand position relative to the sprite container.
  const handX = spriteW * 0.78;
  const handY = spriteH * 0.72;

  if (tool === 'hammer') {
    return (
      <div
        className="absolute"
        style={{
          left: handX - 6,
          top: handY - 30,
          width: 24,
          height: 44,
          transformOrigin: '12px 38px',
          animation: 'build-hammer-swing 0.7s ease-in-out infinite',
          animationPlayState: playState,
        }}
      >
        <svg width={24} height={44} viewBox="0 0 24 44" style={{ overflow: 'visible' }}>
          {/* shaft */}
          <rect x={10} y={10} width={4} height={30} rx={1} fill={color} stroke={color} strokeWidth={0.8} />
          {/* head */}
          <rect x={2} y={2} width={20} height={10} rx={1} fill={color} stroke={color} strokeWidth={1} />
          <rect x={4} y={4} width={4} height={6} fill="#000" opacity={0.3} />
        </svg>
      </div>
    );
  }

  if (tool === 'saw') {
    return (
      <div
        className="absolute"
        style={{
          left: handX - 8,
          top: handY - 4,
          width: 48,
          height: 18,
          transformOrigin: '6px 9px',
          animation: 'build-saw-slide 1.2s ease-in-out infinite',
          animationPlayState: playState,
        }}
      >
        <svg width={48} height={18} viewBox="0 0 48 18" style={{ overflow: 'visible' }}>
          {/* handle */}
          <rect x={0} y={2} width={12} height={12} rx={2} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1} />
          {/* blade */}
          <path d="M 12 5 L 46 9 L 46 11 L 12 11 Z" fill={color} fillOpacity={0.5} stroke={color} strokeWidth={0.8} />
          <path
            d="M 14 11 L 17 14 L 20 11 L 23 14 L 26 11 L 29 14 L 32 11 L 35 14 L 38 11 L 41 14 L 44 11"
            stroke={color}
            strokeWidth={0.8}
            fill="none"
          />
        </svg>
      </div>
    );
  }

  if (tool === 'drill') {
    return (
      <div
        className="absolute"
        style={{
          left: handX - 10,
          top: handY - 6,
          width: 36,
          height: 32,
          animation: 'build-drill-press 1s ease-in-out infinite',
          animationPlayState: playState,
          transformOrigin: 'center top',
        }}
      >
        <svg width={36} height={32} viewBox="0 0 36 32" style={{ overflow: 'visible' }}>
          {/* body */}
          <rect x={2} y={2} width={22} height={12} rx={2} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={1} />
          {/* grip */}
          <rect x={6} y={14} width={10} height={12} rx={2} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={1} />
          {/* chuck */}
          <rect x={24} y={4} width={5} height={8} fill={color} fillOpacity={0.7} stroke={color} strokeWidth={1} />
          {/* spinning bit */}
          <g
            style={{
              transformOrigin: '31.5px 8px',
              animation: 'build-drill-bit 0.2s linear infinite',
              animationPlayState: playState,
            }}
          >
            <rect x={29} y={7} width={7} height={2} fill={color} />
            <path d="M 36 8 L 33 6 L 33 10 Z" fill={color} />
          </g>
        </svg>
      </div>
    );
  }

  // paint
  return (
    <div
      className="absolute"
      style={{
        left: handX - 2,
        top: handY - 10,
        width: 18,
        height: 30,
        transformOrigin: '9px 5px',
        animation: 'build-paint-stroke 1.1s ease-in-out infinite',
        animationPlayState: playState,
      }}
    >
      <svg width={18} height={30} viewBox="0 0 18 30" style={{ overflow: 'visible' }}>
        {/* handle */}
        <rect x={7} y={4} width={4} height={16} rx={1} fill={color} fillOpacity={0.6} stroke={color} strokeWidth={0.8} />
        {/* ferrule */}
        <rect x={5} y={20} width={8} height={3} fill={color} />
        {/* bristles */}
        <path d="M 4 23 L 14 23 L 12 29 L 6 29 Z" fill={color} fillOpacity={0.8} stroke={color} strokeWidth={0.8} />
      </svg>
    </div>
  );
}

/* ------------------------------- Targets --------------------------------- */

interface TargetProps {
  tool: ToolId;
  color: string;
  playState: CSSProperties['animationPlayState'];
  size: 'sm' | 'md';
}

function Target({ tool, color, playState, size }: TargetProps) {
  const width = size === 'md' ? 150 : 110;

  if (tool === 'hammer') {
    // Plank on two sawhorses with a nail sticking up, jittering down per strike.
    return (
      <svg width={width} height={32} viewBox={`0 0 ${width} 32`} style={{ overflow: 'visible' }}>
        {/* sawhorses (X legs) */}
        <g stroke={color} strokeWidth={1.4} opacity={0.85} fill="none">
          <line x1={width * 0.18} y1={10} x2={width * 0.12} y2={28} />
          <line x1={width * 0.12} y1={10} x2={width * 0.18} y2={28} />
          <line x1={width * 0.82} y1={10} x2={width * 0.76} y2={28} />
          <line x1={width * 0.76} y1={10} x2={width * 0.82} y2={28} />
        </g>
        {/* plank */}
        <rect
          x={width * 0.08}
          y={6}
          width={width * 0.84}
          height={8}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={1}
        />
        {/* wood grain */}
        <line x1={width * 0.12} y1={10} x2={width * 0.88} y2={10} stroke={color} strokeWidth={0.6} opacity={0.4} />
        {/* nail — animated: bob "down" once per strike */}
        <g
          style={{
            transformOrigin: `${width * 0.5}px 6px`,
            animation: 'build-nail-sink 2.8s steps(1, end) infinite',
            animationPlayState: playState,
          }}
        >
          <line x1={width * 0.5} y1={-2} x2={width * 0.5} y2={6} stroke={color} strokeWidth={1.6} />
          <circle cx={width * 0.5} cy={-2} r={1.8} fill={color} />
        </g>
      </svg>
    );
  }

  if (tool === 'saw') {
    // Plank with score lines + falling sawdust particles.
    return (
      <svg width={width} height={32} viewBox={`0 0 ${width} 32`} style={{ overflow: 'visible' }}>
        <g stroke={color} strokeWidth={1.4} opacity={0.85} fill="none">
          <line x1={width * 0.2} y1={12} x2={width * 0.14} y2={28} />
          <line x1={width * 0.14} y1={12} x2={width * 0.2} y2={28} />
          <line x1={width * 0.8} y1={12} x2={width * 0.74} y2={28} />
          <line x1={width * 0.74} y1={12} x2={width * 0.8} y2={28} />
        </g>
        <rect
          x={width * 0.08}
          y={8}
          width={width * 0.84}
          height={9}
          fill={color}
          fillOpacity={0.3}
          stroke={color}
          strokeWidth={1}
        />
        {/* score lines across plank */}
        <line x1={width * 0.46} y1={8} x2={width * 0.46} y2={17} stroke={color} strokeWidth={0.9} opacity={0.75} />
        <line x1={width * 0.5} y1={8} x2={width * 0.5} y2={17} stroke={color} strokeWidth={0.9} opacity={0.75} />
        <line x1={width * 0.54} y1={8} x2={width * 0.54} y2={17} stroke={color} strokeWidth={0.9} opacity={0.75} />
        {/* sawdust particles — three staggered falling dots */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            cx={width * (0.48 + i * 0.02)}
            cy={18}
            r={1}
            fill={color}
            opacity={0.85}
            style={{
              animation: `build-sawdust 1.2s ease-in ${i * 0.3}s infinite`,
              animationPlayState: playState,
            }}
          />
        ))}
      </svg>
    );
  }

  if (tool === 'drill') {
    // Vertical board with screws (dots) + shaving curl on the active one.
    return (
      <svg width={width} height={32} viewBox={`0 0 ${width} 32`} style={{ overflow: 'visible' }}>
        {/* board */}
        <rect
          x={width * 0.3}
          y={2}
          width={width * 0.4}
          height={28}
          fill={color}
          fillOpacity={0.25}
          stroke={color}
          strokeWidth={1}
        />
        <line x1={width * 0.5} y1={2} x2={width * 0.5} y2={30} stroke={color} strokeWidth={0.6} opacity={0.4} />
        {/* screws */}
        {[0.38, 0.5, 0.62].map((f, i) => (
          <g key={i}>
            <circle cx={width * f} cy={10 + i * 6} r={2} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={0.8} />
            <line
              x1={width * f - 1.4}
              y1={10 + i * 6}
              x2={width * f + 1.4}
              y2={10 + i * 6}
              stroke="#000"
              strokeWidth={0.6}
              opacity={0.6}
            />
          </g>
        ))}
        {/* shaving curl on active screw */}
        <path
          d={`M ${width * 0.52} 10 q 4 -2 6 1 q -3 -1 -6 -1`}
          fill="none"
          stroke={color}
          strokeWidth={1}
          style={{
            transformOrigin: `${width * 0.52}px 10px`,
            animation: 'build-shaving 1s ease-in-out infinite',
            animationPlayState: playState,
          }}
        />
      </svg>
    );
  }

  // paint — wall panel with a growing paint fill
  return (
    <svg width={width} height={32} viewBox={`0 0 ${width} 32`} style={{ overflow: 'visible' }}>
      {/* panel outline */}
      <rect
        x={width * 0.2}
        y={2}
        width={width * 0.6}
        height={28}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.75}
      />
      {/* panel inner divider */}
      <line x1={width * 0.5} y1={2} x2={width * 0.5} y2={30} stroke={color} strokeWidth={0.5} opacity={0.4} />
      {/* paint fill — height animated */}
      <g
        style={{
          transformOrigin: `${width * 0.5}px 30px`,
          animation: 'build-paint-fill 1.1s ease-in-out infinite',
          animationPlayState: playState,
        }}
      >
        <rect
          x={width * 0.2}
          y={10}
          width={width * 0.6}
          height={20}
          fill={color}
          fillOpacity={0.4}
        />
      </g>
    </svg>
  );
}
