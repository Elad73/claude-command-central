import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { AgentState } from '../../types';
import { AgentSprite } from '../AgentSprite';
import { projectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import { Atmosphere } from './Atmosphere';
import { isResting, type SceneProps } from './types';

/**
 * REVIEW — Sherlock Holmes in an armchair by the fireplace.
 *
 *   Per agent station:
 *     - A stone-arch fireplace with flickering flames and warm glow.
 *     - A wingback armchair angled slightly toward the viewer.
 *     - The agent sprite sits IN the chair: the chair SVG is painted on top
 *       of the sprite's lower half so only the waist-up is visible, with a
 *       blanket draped across the lap between the armrests.
 *     - A deerstalker hat overlay on the head.
 *     - A magnifying glass hovering over a sheet of ruled paper in one hand;
 *       a curved pipe in the other with a continuous column of smoke puffs.
 *
 *   When an agent is resting (done/idle), all per-agent loops pause and the
 *   sprite dims (the sprite handles its own dim). Fireplace keeps flickering
 *   as room ambience.
 *
 *   Layout scales with agent count: 1 center, 2 side-by-side, 3 as 2+1,
 *   4 as a 2×2 grid.
 */

type StationSize = 'lg' | 'md' | 'sm';

// Station sizing:
//   - The room content area is ~220-260px tall after pt-11 / pb-10 reserves.
//   - The chair, blanket, hat, magnifier, and pipe overlays all stack on top
//     of the sprite so the station heights stay below the room height.
//   - Sprite caps at `md` (120 tall) even in the largest station; an `lg`
//     sprite (165 tall) plus the chair scene's overlays clip the hat off the
//     top of the room. Use the wider station to give the chair room instead.
const STATION_DIMENSIONS: Record<StationSize, { w: number; h: number; spriteSize: 'md' | 'sm' }> = {
  lg: { w: 320, h: 240, spriteSize: 'md' },
  md: { w: 260, h: 220, spriteSize: 'md' },
  sm: { w: 220, h: 200, spriteSize: 'sm' },
};

export function ReviewScene({ agents, color }: SceneProps) {
  if (agents.length === 0) {
    return (
      <>
        <Atmosphere phase="REVIEW" color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display tracking-[0.4em] text-sm"
            style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
          >
            // CASE CLOSED //
          </div>
        </div>
      </>
    );
  }

  // Layout picker — chair grids by agent count.
  const count = agents.length;
  const stationSize: StationSize = count <= 1 ? 'lg' : count === 2 ? 'md' : 'sm';

  // Rows for positional flow. 1→[1], 2→[2], 3→[2,1], 4→[2,2].
  let rows: readonly AgentState[][];
  if (count === 1) {
    rows = [agents.slice(0, 1)];
  } else if (count === 2) {
    rows = [agents.slice(0, 2)];
  } else if (count === 3) {
    rows = [agents.slice(0, 2), agents.slice(2, 3)];
  } else {
    rows = [agents.slice(0, 2), agents.slice(2, 4)];
  }

  return (
    <>
      <Atmosphere phase="REVIEW" color={color} />
      <div className="absolute inset-0 pt-11 pb-10 px-3 flex flex-col items-center justify-center gap-4">
        <AnimatePresence mode="popLayout">
          {rows.map((row, rowIdx) => (
            <div
              key={`row-${rowIdx}`}
              className="flex items-end justify-center gap-5 flex-wrap"
            >
              {row.map((agent) => (
                <Station key={agent.key} agent={agent} size={stationSize} color={color} />
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

interface StationProps {
  agent: AgentState;
  size: StationSize;
  color: string;
}

function Station({ agent, size, color }: StationProps) {
  const agentColor = projectColor(agent.project);
  const resting = isResting(agent.status);
  const { w, h, spriteSize } = STATION_DIMENSIONS[size];

  // Everything pauses when resting except the fireplace (ambient room life).
  const loopState: CSSProperties['animationPlayState'] = resting ? 'paused' : 'running';

  return (
    <motion.div
      layoutId={`agent-${agent.key}`}
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: resting ? 0.75 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
      className="flex flex-col items-center gap-1.5"
      style={{ width: w }}
    >
      <div
        className="relative"
        style={{ width: w, height: h }}
      >
        <Fireplace width={w} height={h} />
        <Armchair width={w} height={h} color={color} />
        <SeatedAgent
          width={w}
          height={h}
          agent={agent}
          agentColor={agentColor}
          spriteSize={spriteSize}
          loopState={loopState}
          outlineColor={color}
        />
      </div>
      <AgentLabel agent={agent} />
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fireplace — stone arch + flickering flames + warm floor glow       */
/* ------------------------------------------------------------------ */

function Fireplace({ width, height }: { width: number; height: number }) {
  // The fireplace sits centered behind the chair, slightly up in the frame.
  // Its viewBox is normalized; we scale via width/height.
  const fw = width * 0.52;
  const fh = height * 0.62;
  const left = width * 0.5 - fw / 2;
  const top = height * 0.05;

  const stone = '#3a2d24';
  const stoneLight = '#5a463a';
  const stoneDark = '#241b15';
  const flameOuter = '#ff8c3b';
  const flameMid = '#ffb400';
  const flameInner = '#fff4c2';

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left, top, width: fw, height: fh }}
      aria-hidden
    >
      {/* Warm ambient glow bathing the chair area */}
      <div
        className="absolute"
        style={{
          left: -fw * 0.2,
          bottom: -fh * 0.15,
          width: fw * 1.4,
          height: fh * 0.8,
          background:
            'radial-gradient(ellipse 60% 60% at 50% 30%, rgba(255, 140, 59, 0.28), transparent 70%)',
          animation: 'review-ember 2.6s ease-in-out infinite',
          filter: 'blur(2px)',
        }}
      />
      <svg
        viewBox="0 0 200 240"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        {/* Outer stone arch — 3 top stones and 2 side stacks */}
        {/* Side stacks (left) */}
        <rect x={10} y={90} width={26} height={40} rx={3} fill={stone} stroke={stoneDark} strokeWidth={1.2} />
        <rect x={10} y={132} width={26} height={40} rx={3} fill={stoneLight} stroke={stoneDark} strokeWidth={1.2} />
        <rect x={10} y={174} width={26} height={44} rx={3} fill={stone} stroke={stoneDark} strokeWidth={1.2} />
        {/* Side stacks (right) */}
        <rect x={164} y={90} width={26} height={40} rx={3} fill={stoneLight} stroke={stoneDark} strokeWidth={1.2} />
        <rect x={164} y={132} width={26} height={40} rx={3} fill={stone} stroke={stoneDark} strokeWidth={1.2} />
        <rect x={164} y={174} width={26} height={44} rx={3} fill={stoneLight} stroke={stoneDark} strokeWidth={1.2} />

        {/* Top rounded stones */}
        <path d="M 14 92 Q 14 68 40 68 L 60 68 Q 68 68 68 76 L 68 92 Z" fill={stoneLight} stroke={stoneDark} strokeWidth={1.2} />
        <path d="M 72 68 Q 72 54 100 54 Q 128 54 128 68 L 128 92 L 72 92 Z" fill={stone} stroke={stoneDark} strokeWidth={1.2} />
        <path d="M 132 68 L 160 68 Q 186 68 186 92 L 186 92 L 132 92 Z" fill={stoneLight} stroke={stoneDark} strokeWidth={1.2} />

        {/* Mantel shelf */}
        <rect x={6} y={86} width={188} height={10} rx={2} fill={stoneLight} stroke={stoneDark} strokeWidth={1.2} />
        <rect x={6} y={86} width={188} height={3} fill="#6a543f" opacity={0.7} />

        {/* Firebox (the dark inside of the fireplace) */}
        <path
          d="M 44 96 L 156 96 L 156 210 Q 156 218 148 218 L 52 218 Q 44 218 44 210 Z"
          fill="#0a0603"
          stroke={stoneDark}
          strokeWidth={1.5}
        />
        {/* Back wall subtle brick hint */}
        <line x1={54} y1={130} x2={146} y2={130} stroke="#2a1a10" strokeWidth={0.8} />
        <line x1={54} y1={160} x2={146} y2={160} stroke="#2a1a10" strokeWidth={0.8} />
        <line x1={100} y1={96} x2={100} y2={130} stroke="#2a1a10" strokeWidth={0.8} />
        <line x1={80} y1={130} x2={80} y2={160} stroke="#2a1a10" strokeWidth={0.8} />
        <line x1={120} y1={130} x2={120} y2={160} stroke="#2a1a10" strokeWidth={0.8} />

        {/* Logs at the base */}
        <ellipse cx={100} cy={208} rx={44} ry={5} fill="#2a1a10" />
        <rect x={62} y={198} width={60} height={8} rx={3} fill="#5a3a22" stroke="#2a1a10" strokeWidth={0.8} />
        <rect x={78} y={192} width={44} height={7} rx={3} fill="#6e4828" stroke="#2a1a10" strokeWidth={0.8} />
        <circle cx={66} cy={202} r={2} fill="#2a1a10" />
        <circle cx={130} cy={202} r={2} fill="#2a1a10" />

        {/* Flames — 3 overlapping paths, each with its own flicker timing */}
        {/* Outer (largest, orange) */}
        <g
          style={{
            transformOrigin: '100px 210px',
            animation: 'review-flicker 1.4s ease-in-out infinite',
          }}
        >
          <path
            d="M 70 208 Q 68 178 82 160 Q 84 180 96 168 Q 98 146 112 154 Q 116 178 124 168 Q 136 178 130 208 Z"
            fill={flameOuter}
            opacity={0.92}
            style={{ filter: `drop-shadow(0 0 12px ${flameOuter})` }}
          />
        </g>
        {/* Mid (yellow) */}
        <g
          style={{
            transformOrigin: '100px 208px',
            animation: 'review-flicker 1.1s ease-in-out infinite',
            animationDelay: '-0.4s',
          }}
        >
          <path
            d="M 80 206 Q 78 184 90 172 Q 94 188 102 178 Q 108 162 116 176 Q 124 184 120 206 Z"
            fill={flameMid}
            opacity={0.9}
            style={{ filter: `drop-shadow(0 0 10px ${flameMid})` }}
          />
        </g>
        {/* Inner (bright core) */}
        <g
          style={{
            transformOrigin: '100px 206px',
            animation: 'review-flicker 0.8s ease-in-out infinite',
            animationDelay: '-0.2s',
          }}
        >
          <path
            d="M 90 204 Q 89 190 96 182 Q 100 192 104 184 Q 112 192 110 204 Z"
            fill={flameInner}
            opacity={0.85}
            style={{ filter: `drop-shadow(0 0 8px ${flameMid})` }}
          />
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Armchair — wingback painted OVER the sprite's lower body           */
/* ------------------------------------------------------------------ */

function Armchair({ width, height, color }: { width: number; height: number; color: string }) {
  // Chair fills the lower ~70% of the station. Its top edge passes through
  // the sprite's waist area so the waist-up torso sticks up above the seat.
  const cw = width * 0.78;
  const ch = height * 0.58;
  const left = width * 0.5 - cw / 2;
  const top = height * 0.42;

  const leather = '#4a2a2a';
  const leatherLight = '#6b3b3b';
  const leatherDark = '#2a1414';
  const stitch = '#8a5a3a';

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left, top, width: cw, height: ch, zIndex: 3 }}
      aria-hidden
    >
      <svg
        viewBox="0 0 240 180"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        {/* Chair shadow on the floor */}
        <ellipse cx={120} cy={172} rx={108} ry={8} fill="#000" opacity={0.55} />

        {/* Left backrest wing (curved) */}
        <path
          d="M 18 22 Q 10 8 26 4 Q 50 0 58 24 L 64 90 L 30 100 Q 14 94 14 70 Z"
          fill={leather}
          stroke={leatherDark}
          strokeWidth={1.6}
        />
        {/* Right backrest wing (curved) */}
        <path
          d="M 222 22 Q 230 8 214 4 Q 190 0 182 24 L 176 90 L 210 100 Q 226 94 226 70 Z"
          fill={leather}
          stroke={leatherDark}
          strokeWidth={1.6}
        />
        {/* Main backrest cushion — rises behind the agent's torso */}
        <path
          d="M 54 18 Q 120 -4 186 18 L 188 102 Q 120 112 52 102 Z"
          fill={leatherLight}
          stroke={leatherDark}
          strokeWidth={1.8}
        />
        {/* Tufted buttons on backrest */}
        <circle cx={90} cy={46} r={2} fill={stitch} opacity={0.8} />
        <circle cx={120} cy={40} r={2} fill={stitch} opacity={0.8} />
        <circle cx={150} cy={46} r={2} fill={stitch} opacity={0.8} />
        <circle cx={90} cy={76} r={2} fill={stitch} opacity={0.8} />
        <circle cx={120} cy={70} r={2} fill={stitch} opacity={0.8} />
        <circle cx={150} cy={76} r={2} fill={stitch} opacity={0.8} />

        {/* Left armrest — rises from seat, rolls over */}
        <path
          d="M 14 94 Q 8 100 10 116 L 14 146 Q 16 152 28 152 L 54 152 L 58 118 L 58 100 Q 46 92 14 94 Z"
          fill={leather}
          stroke={leatherDark}
          strokeWidth={1.6}
        />
        {/* Armrest top cap */}
        <ellipse cx={30} cy={100} rx={22} ry={5} fill={leatherLight} stroke={leatherDark} strokeWidth={1} />

        {/* Right armrest */}
        <path
          d="M 226 94 Q 232 100 230 116 L 226 146 Q 224 152 212 152 L 186 152 L 182 118 L 182 100 Q 194 92 226 94 Z"
          fill={leather}
          stroke={leatherDark}
          strokeWidth={1.6}
        />
        <ellipse cx={210} cy={100} rx={22} ry={5} fill={leatherLight} stroke={leatherDark} strokeWidth={1} />

        {/* Seat cushion — fat pillow between the armrests */}
        <path
          d="M 58 110 L 182 110 Q 190 124 184 146 Q 120 156 56 146 Q 50 124 58 110 Z"
          fill={leatherLight}
          stroke={leatherDark}
          strokeWidth={1.6}
        />
        {/* Seat cushion crease */}
        <path
          d="M 64 132 Q 120 138 176 132"
          fill="none"
          stroke={leatherDark}
          strokeWidth={1}
          opacity={0.7}
        />

        {/* Blanket draped across the lap */}
        {/* Back flap behind cushion front */}
        <path
          d="M 60 126 Q 120 132 180 126 L 184 162 Q 120 172 56 162 Z"
          fill="#6b8fa6"
          stroke="#2d4656"
          strokeWidth={1.2}
        />
        {/* Tartan stripes */}
        <line x1={70} y1={138} x2={170} y2={140} stroke="#c24040" strokeWidth={1.2} opacity={0.65} />
        <line x1={70} y1={150} x2={170} y2={152} stroke="#d9b84a" strokeWidth={1} opacity={0.65} />
        <line x1={90} y1={128} x2={92} y2={168} stroke="#c24040" strokeWidth={1.2} opacity={0.55} />
        <line x1={120} y1={126} x2={120} y2={170} stroke="#2a2a4a" strokeWidth={1} opacity={0.55} />
        <line x1={150} y1={128} x2={148} y2={168} stroke="#c24040" strokeWidth={1.2} opacity={0.55} />
        {/* Tassel */}
        <path d="M 58 164 L 56 172 M 60 164 L 60 172 M 62 164 L 64 172" stroke="#2d4656" strokeWidth={1} />

        {/* Chair legs peeking below */}
        <rect x={26} y={154} width={6} height={14} rx={1} fill={leatherDark} />
        <rect x={208} y={154} width={6} height={14} rx={1} fill={leatherDark} />

        {/* Sparse magenta accent outlining the chair silhouette — nods to REVIEW color */}
        <path
          d="M 54 18 Q 120 -4 186 18"
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          opacity={0.35}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SeatedAgent — sprite + hat + magnifier/paper + pipe/smoke          */
/* ------------------------------------------------------------------ */

interface SeatedAgentProps {
  width: number;
  height: number;
  agent: AgentState;
  agentColor: string;
  spriteSize: 'sm' | 'md';
  loopState: CSSProperties['animationPlayState'];
  outlineColor: string;
}

function SeatedAgent({
  width,
  height,
  agent,
  agentColor,
  spriteSize,
  loopState,
  outlineColor,
}: SeatedAgentProps) {
  // Position the sprite so the chair (zIndex 3) covers the lower half.
  // Sprite zIndex 2 → chair at 3 is IN FRONT of the lower legs.
  // Hat/magnifier/pipe zIndex 5 → on top of the chair in front of the torso.
  const spriteDims = spriteSize === 'md' ? { w: 80, h: 120 } : { w: 52, h: 78 };
  const spriteLeft = width * 0.5 - spriteDims.w / 2;
  // Bottom-align sprite so its waist falls behind the chair seat line.
  const spriteTop = height * 0.14;
  // Clip-path ids must be unique per-agent so the cross-hatch glass texture
  // renders correctly when multiple stations are on-screen at once.
  const lensClipId = `review-lens-clip-${agent.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <>
      {/* Sprite in the chair — the chair SVG (z=3) sits over the sprite's lower body */}
      <div
        className="absolute"
        style={{
          left: spriteLeft,
          top: spriteTop,
          width: spriteDims.w,
          height: spriteDims.h,
          zIndex: 2,
          // Wrap the sprite in a slow nod (extra to the sprite's body-scan).
          animation: 'review-nod 4s ease-in-out infinite',
          animationPlayState: loopState,
        }}
      >
        <AgentSprite
          color={agentColor}
          status={agent.status}
          phase={agent.phase}
          size={spriteSize}
        />
      </div>

      {/* Overlays above the chair: hat, magnifier+paper, pipe+smoke */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: spriteLeft,
          top: spriteTop,
          width: spriteDims.w,
          height: spriteDims.h,
          zIndex: 5,
        }}
        aria-hidden
      >
        <svg
          viewBox="0 0 120 180"
          width="100%"
          height="100%"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <clipPath id={lensClipId}>
              <circle cx={26} cy={96} r={10.5} />
            </clipPath>
          </defs>
          {/* ============== DEERSTALKER HAT ============== */}
          {/* Hat sits on top of the helmet. Two peaks (front/back) + ear flaps. */}
          <g style={{ transformOrigin: '60px 18px' }}>
            {/* Ear flaps (behind) */}
            <path
              d="M 38 18 Q 34 26 38 36 Q 44 38 46 30 L 46 22 Z"
              fill="#6b4a2a"
              stroke="#2a1a10"
              strokeWidth={1}
            />
            <path
              d="M 82 18 Q 86 26 82 36 Q 76 38 74 30 L 74 22 Z"
              fill="#6b4a2a"
              stroke="#2a1a10"
              strokeWidth={1}
            />
            {/* Brim — front & back peaks */}
            <path
              d="M 32 22 L 42 10 Q 60 2 78 10 L 88 22 Q 76 26 60 26 Q 44 26 32 22 Z"
              fill="#7a5530"
              stroke="#2a1a10"
              strokeWidth={1.2}
            />
            {/* Front peak */}
            <path
              d="M 48 10 L 60 2 L 72 10 L 66 12 L 60 8 L 54 12 Z"
              fill="#8a6238"
              stroke="#2a1a10"
              strokeWidth={0.8}
            />
            {/* Crown — with tartan check hint */}
            <path
              d="M 44 6 Q 60 -6 76 6 L 78 20 Q 60 22 42 20 Z"
              fill="#7a5530"
              stroke="#2a1a10"
              strokeWidth={1.2}
            />
            <line x1={48} y1={4} x2={72} y2={4} stroke="#2a1a10" strokeWidth={0.6} opacity={0.6} />
            <line x1={46} y1={10} x2={74} y2={10} stroke="#2a1a10" strokeWidth={0.6} opacity={0.6} />
            <line x1={54} y1={0} x2={54} y2={18} stroke="#2a1a10" strokeWidth={0.6} opacity={0.6} />
            <line x1={66} y1={0} x2={66} y2={18} stroke="#2a1a10" strokeWidth={0.6} opacity={0.6} />
            {/* Chin tie bow on top */}
            <circle cx={60} cy={5} r={1.8} fill="#3a2818" />
          </g>

          {/* ============== PIPE (right hand / mouth) ============== */}
          {/* A curved briar pipe: stem from mouth area, bowl tilted up-right. */}
          <g>
            {/* Stem — slight curve coming out of mouth vent */}
            <path
              d="M 67 62 Q 76 66 82 64 Q 88 62 92 60"
              fill="none"
              stroke="#2a1a10"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <path
              d="M 67 62 Q 76 66 82 64 Q 88 62 92 60"
              fill="none"
              stroke="#5a3a22"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
            {/* Mouthpiece tip */}
            <circle cx={67} cy={62} r={1.6} fill="#1a0a06" />
            {/* Bowl */}
            <path
              d="M 92 60 Q 90 52 94 48 L 104 48 Q 108 52 106 62 Q 104 66 100 66 Q 94 66 92 60 Z"
              fill="#5a3a22"
              stroke="#2a1a10"
              strokeWidth={1.2}
            />
            {/* Ember inside bowl */}
            <ellipse cx={99} cy={51} rx={4} ry={1.5} fill="#ff8c3b" opacity={0.9}>
              <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
            </ellipse>

            {/* Smoke — 4 puffs at staggered delays. */}
            {[0, 0.8, 1.6, 2.4].map((delay, i) => (
              <circle
                key={`puff-${i}`}
                cx={99}
                cy={46}
                r={i === 3 ? 4.5 : 3.5 + i * 0.5}
                fill="#e8e4da"
                opacity={0}
                style={{
                  transformOrigin: '99px 46px',
                  animation: `review-smoke 3.2s ease-out infinite`,
                  animationDelay: `${delay}s`,
                  animationPlayState: loopState,
                }}
              />
            ))}
          </g>

          {/* ============== PAPER + MAGNIFIER (left hand) ============== */}
          {/* Grouped so the magnifier-drift animation drifts them together,
              but really only the magnifier should drift — so wrap paper static,
              magnifier in inner group with the drift animation. */}
          <g>
            {/* Sheet of paper — held in front of the chest */}
            <g
              style={{
                transformOrigin: '36px 98px',
                transform: 'rotate(-8deg)',
              }}
            >
              <rect
                x={8}
                y={80}
                width={42}
                height={34}
                rx={1}
                fill="#f5ead0"
                stroke="#8a6238"
                strokeWidth={1}
                style={{ filter: 'drop-shadow(1px 2px 2px rgba(0,0,0,0.4))' }}
              />
              {/* Ruled lines */}
              <line x1={12} y1={86} x2={46} y2={86} stroke="#7a5530" strokeWidth={0.5} opacity={0.5} />
              <line x1={12} y1={91} x2={46} y2={91} stroke="#7a5530" strokeWidth={0.5} opacity={0.5} />
              <line x1={12} y1={96} x2={42} y2={96} stroke="#7a5530" strokeWidth={0.5} opacity={0.5} />
              <line x1={12} y1={101} x2={46} y2={101} stroke="#7a5530" strokeWidth={0.5} opacity={0.5} />
              <line x1={12} y1={106} x2={38} y2={106} stroke="#7a5530" strokeWidth={0.5} opacity={0.5} />
              <line x1={12} y1={111} x2={44} y2={111} stroke="#7a5530" strokeWidth={0.5} opacity={0.5} />
              {/* A red clue scribble */}
              <path
                d="M 14 94 Q 18 92 22 94 Q 26 96 30 94"
                fill="none"
                stroke="#c24040"
                strokeWidth={0.8}
                opacity={0.7}
              />
            </g>

            {/* Magnifier — drifts in a slow circle */}
            <g
              style={{
                transformOrigin: '30px 96px',
                animation: 'review-magnifier-drift 3s ease-in-out infinite',
                animationPlayState: loopState,
              }}
            >
              {/* Handle */}
              <line
                x1={36}
                y1={104}
                x2={48}
                y2={118}
                stroke="#3a2818"
                strokeWidth={3}
                strokeLinecap="round"
              />
              <line
                x1={36}
                y1={104}
                x2={48}
                y2={118}
                stroke="#6b4a2a"
                strokeWidth={1.4}
                strokeLinecap="round"
              />
              {/* Lens frame (magenta accent) */}
              <circle
                cx={26}
                cy={96}
                r={12}
                fill="none"
                stroke={outlineColor}
                strokeWidth={2.2}
                style={{ filter: `drop-shadow(0 0 4px ${outlineColor})` }}
              />
              {/* Lens glass */}
              <circle
                cx={26}
                cy={96}
                r={10.5}
                fill="#b8d8e8"
                opacity={0.28}
              />
              {/* Cross-hatch glass texture */}
              <g clipPath={`url(#${lensClipId})`} opacity={0.5}>
                <line x1={16} y1={88} x2={36} y2={108} stroke="#ffffff" strokeWidth={0.4} opacity={0.7} />
                <line x1={20} y1={86} x2={34} y2={104} stroke="#ffffff" strokeWidth={0.4} opacity={0.5} />
                <line x1={26} y1={86} x2={26} y2={106} stroke="#ffffff" strokeWidth={0.3} opacity={0.4} />
                <line x1={16} y1={96} x2={36} y2={96} stroke="#ffffff" strokeWidth={0.3} opacity={0.4} />
              </g>
              {/* Bright highlight on lens */}
              <ellipse cx={22} cy={92} rx={3} ry={2} fill="#ffffff" opacity={0.55} />
            </g>
          </g>
        </svg>
      </div>
    </>
  );
}
