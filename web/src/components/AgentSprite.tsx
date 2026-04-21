import { motion } from 'framer-motion';
import type { Phase } from '../types';

interface Props {
  color: string;
  status: string;
  phase?: Phase;
  size?: 'sm' | 'md' | 'lg';
}

const DIMENSIONS = {
  sm: { w: 52, h: 78 },
  md: { w: 80, h: 120 },
  lg: { w: 110, h: 165 },
} as const;

/**
 * Detailed cyberpunk android — helmet with scanning visor, blinking antenna,
 * shoulder pads, pulsing reactor core, utility belt, articulated arms/legs.
 *
 * Motion layers:
 *   - Body bob (framer)
 *   - Reactor pulse (framer)
 *   - Visor scan line (CSS keyframes, horizontal sweep)
 *   - Antenna LED blink (CSS keyframes)
 *   - Arm swing on BUILD/active (CSS keyframes, rotate around shoulder)
 *   - Leg shift on active (CSS keyframes)
 *   - Head tilt on PLAN (CSS keyframes, slow)
 */
export function AgentSprite({ color, status, phase, size = 'lg' }: Props) {
  const { w, h } = DIMENSIONS[size];
  const active = status === 'active' || status === 'running';
  const errored = status === 'blocked' || status === 'error';
  const resting = status === 'done' || status === 'idle';
  const id = `grad-${color.replace('#', '')}`;

  // Resting agents visibly power down: dimmer glow, softer overall opacity,
  // no reactor pulse, no antenna blink, no body bob.
  const glowPx = resting ? 3 : 14;
  const bodyOpacity = resting ? 0.55 : 1;

  // Per-phase motion — each room gets a distinct "activity" so you can tell
  // at a glance what the worker in that room is doing, even with the sound off.
  //   PROMPT  — listening / nodding (head-nod)
  //   PLAN    — pacing / pondering (head-tilt + subtle body sway)
  //   BUILD   — hammering (arm swing both sides)
  //   REVIEW  — scanning (whole body turns left/right)
  //   TEST    — mixing (one arm stirs, other holds)
  //   DEPLOY  — launching (arms raised, body slight upward drift)
  const armSwing = active && phase === 'BUILD';
  const stirring = active && phase === 'TEST';
  const launching = active && phase === 'DEPLOY';
  const headBob = active && phase === 'PLAN';
  const headNod = active && phase === 'PROMPT';
  const scanning = active && phase === 'REVIEW';
  const legActive = active;

  const bodyYAmp = launching ? [0, -6, 0] : [0, -3, 0];

  return (
    <motion.div
      style={{
        width: w,
        height: h,
        color,
        opacity: bodyOpacity,
        transformOrigin: 'center bottom',
        animation: scanning ? 'body-scan 3s ease-in-out infinite' : 'none',
      }}
      animate={resting ? { y: 0 } : { y: bodyYAmp }}
      transition={{ duration: active ? 1.6 : 3, repeat: resting ? 0 : Infinity, ease: 'easeInOut' }}
    >
      <svg
        viewBox="0 0 120 180"
        width="100%"
        height="100%"
        style={{ filter: `drop-shadow(0 0 ${glowPx}px ${color})`, overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.08} />
          </linearGradient>
        </defs>

        {/* ANTENNA */}
        <line x1={60} y1={6} x2={60} y2={18} stroke={color} strokeWidth={1.5} />
        <circle
          cx={60}
          cy={4}
          r={2.5}
          fill={color}
          style={{
            filter: `drop-shadow(0 0 4px ${color})`,
            animation: resting ? 'none' : 'antenna-blink 0.9s ease-in-out infinite',
            opacity: resting ? 0.4 : 1,
          }}
        />

        {/* HEAD GROUP — phase-specific motion */}
        <g
          style={{
            transformOrigin: '60px 55px',
            animation: headBob
              ? 'head-tilt 2.8s ease-in-out infinite'
              : headNod
                ? 'head-nod 1.6s ease-in-out infinite'
                : 'none',
          }}
        >
          {/* Helmet shell */}
          <path
            d="M 45 20 L 75 20 L 80 30 L 78 50 L 75 58 L 45 58 L 42 50 L 40 30 Z"
            fill={`url(#${id})`}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Helmet top highlight strip */}
          <path d="M 48 24 L 72 24" stroke={color} strokeWidth={1.2} opacity={0.8} />
          {/* Side vents */}
          <line x1={42} y1={36} x2={42} y2={42} stroke={color} strokeWidth={1} opacity={0.6} />
          <line x1={78} y1={36} x2={78} y2={42} stroke={color} strokeWidth={1} opacity={0.6} />

          {/* VISOR FRAME */}
          <rect
            x={44}
            y={36}
            width={32}
            height={9}
            rx={1.5}
            fill="#000"
            fillOpacity={0.6}
            stroke={color}
            strokeWidth={1}
          />
          {/* Visor inner glow */}
          <rect x={45} y={37} width={30} height={7} rx={1} fill={color} fillOpacity={0.22} />
          {/* Scanning beam */}
          <g style={{ animation: 'visor-scan 2.2s linear infinite' }}>
            <rect x={45} y={38} width={6} height={5} fill={color} opacity={0.9} rx={0.5} />
            <rect x={45} y={38} width={6} height={5} fill={color} opacity={0.4} rx={0.5} style={{ filter: `blur(2px)` }} />
          </g>
          {/* HUD dots */}
          <circle cx={47} cy={40.5} r={0.7} fill={color} opacity={0.95} />
          <circle cx={73} cy={40.5} r={0.7} fill={color} opacity={0.95} />

          {/* Jaw / chin plate */}
          <path
            d="M 48 58 L 72 58 L 70 63 L 50 63 Z"
            fill={color}
            fillOpacity={0.3}
            stroke={color}
            strokeWidth={0.8}
          />
          {/* Mouth vent */}
          <line x1={53} y1={61} x2={67} y2={61} stroke={color} strokeWidth={0.8} opacity={0.6} />
        </g>

        {/* NECK */}
        <rect
          x={54}
          y={63}
          width={12}
          height={5}
          fill={color}
          fillOpacity={0.5}
          stroke={color}
          strokeWidth={0.8}
        />

        {/* SHOULDERS */}
        <path
          d="M 26 70 Q 30 64 36 64 L 84 64 Q 90 64 94 70 L 96 80 L 84 83 L 36 83 L 24 80 Z"
          fill={`url(#${id})`}
          stroke={color}
          strokeWidth={1.8}
        />
        {/* Shoulder-pad lights */}
        <circle cx={32} cy={73} r={3.5} fill={color} fillOpacity={0.5} stroke={color} strokeWidth={1} />
        <circle cx={88} cy={73} r={3.5} fill={color} fillOpacity={0.5} stroke={color} strokeWidth={1} />
        <circle cx={32} cy={73} r={1.3} fill={color} />
        <circle cx={88} cy={73} r={1.3} fill={color} />

        {/* LEFT ARM — BUILD hammers, TEST stirs, DEPLOY raises */}
        <g
          style={{
            transformOrigin: '32px 76px',
            animation: armSwing
              ? 'arm-swing-left 1.4s ease-in-out infinite'
              : stirring
                ? 'arm-stir-left 1.6s linear infinite'
                : launching
                  ? 'arm-raise-left 2.4s ease-in-out infinite'
                  : 'none',
          }}
        >
          <rect x={22} y={76} width={10} height={26} rx={4} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={27} cy={102} r={3.2} fill={color} fillOpacity={0.55} />
          <rect x={20} y={104} width={12} height={24} rx={4} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={26} cy={130} r={4.5} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={26} cy={130} r={1.2} fill={color} />
        </g>

        {/* RIGHT ARM — BUILD hammers, TEST stirs (paired), DEPLOY raises */}
        <g
          style={{
            transformOrigin: '88px 76px',
            animation: armSwing
              ? 'arm-swing-right 1.4s ease-in-out infinite'
              : stirring
                ? 'arm-stir-right 1.6s linear infinite'
                : launching
                  ? 'arm-raise-right 2.4s ease-in-out infinite'
                  : 'none',
          }}
        >
          <rect x={88} y={76} width={10} height={26} rx={4} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={93} cy={102} r={3.2} fill={color} fillOpacity={0.55} />
          <rect x={88} y={104} width={12} height={24} rx={4} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={94} cy={130} r={4.5} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={94} cy={130} r={1.2} fill={color} />
        </g>

        {/* TORSO */}
        <path
          d="M 38 83 L 82 83 L 79 126 L 41 126 Z"
          fill={`url(#${id})`}
          stroke={color}
          strokeWidth={1.8}
        />
        {/* Chest plate outline */}
        <path
          d="M 45 90 L 75 90 L 73 114 L 47 114 Z"
          fill="none"
          stroke={color}
          strokeWidth={0.7}
          opacity={0.55}
        />
        {/* Chest panel seams */}
        <line x1={48} y1={119} x2={72} y2={119} stroke={color} strokeWidth={0.7} opacity={0.55} />
        <line x1={52} y1={123} x2={68} y2={123} stroke={color} strokeWidth={0.7} opacity={0.4} />

        {/* REACTOR CORE */}
        <motion.circle
          cx={60}
          cy={102}
          r={resting ? 5 : 7}
          fill={color}
          fillOpacity={resting ? 0.25 : 0.5}
          animate={resting ? { r: 5, fillOpacity: 0.25 } : { r: [6, 9, 6], fillOpacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: active ? 1.2 : 2.2, repeat: resting ? 0 : Infinity, ease: 'easeInOut' }}
          style={{ filter: `drop-shadow(0 0 ${resting ? 3 : 10}px ${color})` }}
        />
        <circle cx={60} cy={102} r={3} fill={color} />
        <circle cx={60} cy={102} r={1.2} fill="#ffffff" opacity={0.95} />

        {/* BELT */}
        <rect
          x={40}
          y={126}
          width={40}
          height={6}
          rx={1}
          fill={color}
          fillOpacity={0.55}
          stroke={color}
          strokeWidth={1.2}
        />
        <rect x={48} y={128} width={3} height={8} fill={color} opacity={0.85} />
        <rect x={58.5} y={128} width={3} height={8} fill={color} opacity={0.85} />
        <rect x={69} y={128} width={3} height={8} fill={color} opacity={0.85} />

        {/* HIP PLATE */}
        <rect
          x={42}
          y={132}
          width={36}
          height={5}
          fill={`url(#${id})`}
          stroke={color}
          strokeWidth={1.2}
        />

        {/* LEFT LEG */}
        <g
          style={{
            transformOrigin: '52px 137px',
            animation: legActive ? 'leg-shift 2.2s ease-in-out infinite' : 'none',
          }}
        >
          <rect x={45} y={137} width={13} height={22} rx={2} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={51} cy={159} r={2.5} fill={color} fillOpacity={0.55} />
          <rect x={44} y={161} width={15} height={16} rx={2} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
        </g>

        {/* RIGHT LEG */}
        <g
          style={{
            transformOrigin: '68px 137px',
            animation: legActive ? 'leg-shift 2.2s ease-in-out infinite' : 'none',
            animationDelay: '1.1s',
          }}
        >
          <rect x={62} y={137} width={13} height={22} rx={2} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
          <circle cx={68} cy={159} r={2.5} fill={color} fillOpacity={0.55} />
          <rect x={61} y={161} width={15} height={16} rx={2} fill={`url(#${id})`} stroke={color} strokeWidth={1.2} />
        </g>

        {/* BOOTS */}
        <path
          d="M 42 177 Q 42 175 44 175 L 59 175 L 59 181 L 42 181 Z"
          fill={color}
          fillOpacity={0.55}
          stroke={color}
          strokeWidth={1.2}
        />
        <path
          d="M 61 175 L 76 175 Q 78 175 78 177 L 78 181 L 61 181 Z"
          fill={color}
          fillOpacity={0.55}
          stroke={color}
          strokeWidth={1.2}
        />

        {/* ERROR WARNING OVERLAY */}
        {errored && (
          <motion.g
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <path
              d="M 60 -4 L 70 10 L 50 10 Z"
              fill="#ff1e6b"
              stroke="#ff1e6b"
              strokeWidth={1}
              style={{ filter: 'drop-shadow(0 0 6px #ff1e6b)' }}
            />
            <text
              x={60}
              y={8}
              textAnchor="middle"
              fill="#000"
              fontSize={9}
              fontWeight="bold"
              fontFamily="monospace"
            >
              !
            </text>
          </motion.g>
        )}
      </svg>
    </motion.div>
  );
}
