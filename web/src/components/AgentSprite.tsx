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
 * Detailed cyberpunk android — helmet with status-aware visor HUD,
 * lit-from-above gradient stack, ground shadow, joint highlights,
 * idle breathing on resting, plus the per-phase activity loops.
 */
export function AgentSprite({ color, status, phase, size = 'lg' }: Props) {
  const { w, h } = DIMENSIONS[size];
  const active = status === 'active' || status === 'running';
  const errored = status === 'blocked' || status === 'error';
  const done = status === 'done';
  const idle = status === 'idle';
  const resting = done || idle;

  const colorKey = color.replace('#', '');
  const tintId = `tint-${colorKey}`;
  const rimId = `rim-${colorKey}`;
  const shadowId = `shadow-${colorKey}`;

  // Resting agents visibly power down: dimmer glow, softer overall opacity,
  // no reactor pulse, no antenna blink, no body bob.
  const glowPx = resting ? 3 : 14;
  const bodyOpacity = resting ? 0.55 : 1;

  // Per-phase motion — each room gets a distinct "activity" so you can tell
  // at a glance what the worker in that room is doing.
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
          {/* Body tint — vertical fade of the project color. */}
          <linearGradient id={tintId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="60%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.08} />
          </linearGradient>
          {/* Lit-from-above rim — a soft white wash on top edges only. */}
          <linearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
            <stop offset="35%" stopColor="#ffffff" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
          {/* Ground shadow — soft radial pool under the boots. */}
          <radialGradient id={shadowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#000" stopOpacity={0.55} />
            <stop offset="60%" stopColor="#000" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#000" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* GROUND SHADOW — soft pool tucked right under the boots. Sits inside
            the viewBox at y≈178 so it isn't clipped by the SVG bounds. */}
        <ellipse
          cx={60}
          cy={178}
          rx={resting ? 24 : 30}
          ry={4}
          fill={`url(#${shadowId})`}
          opacity={resting ? 0.55 : 0.9}
        />

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
            fill={`url(#${tintId})`}
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* Helmet rim light — top half only */}
          <path
            d="M 45 20 L 75 20 L 80 30 L 78 38 L 42 38 L 40 30 Z"
            fill={`url(#${rimId})`}
            opacity={0.85}
          />
          {/* Crest seam down center */}
          <line x1={60} y1={20} x2={60} y2={36} stroke={color} strokeWidth={0.9} opacity={0.7} />
          {/* Helmet top highlight strip */}
          <path d="M 48 24 L 72 24" stroke="#ffffff" strokeWidth={1.2} opacity={0.55} strokeLinecap="round" />
          {/* Side vents — three short slats per side */}
          <line x1={42} y1={34} x2={42} y2={37} stroke={color} strokeWidth={1} opacity={0.6} />
          <line x1={42} y1={39} x2={42} y2={42} stroke={color} strokeWidth={1} opacity={0.6} />
          <line x1={42} y1={44} x2={42} y2={47} stroke={color} strokeWidth={1} opacity={0.6} />
          <line x1={78} y1={34} x2={78} y2={37} stroke={color} strokeWidth={1} opacity={0.6} />
          <line x1={78} y1={39} x2={78} y2={42} stroke={color} strokeWidth={1} opacity={0.6} />
          <line x1={78} y1={44} x2={78} y2={47} stroke={color} strokeWidth={1} opacity={0.6} />

          {/* VISOR FRAME */}
          <rect
            x={44}
            y={36}
            width={32}
            height={9}
            rx={1.5}
            fill="#000"
            fillOpacity={0.7}
            stroke={color}
            strokeWidth={1}
          />
          {/* Visor inner glow */}
          <rect x={45} y={37} width={30} height={7} rx={1} fill={color} fillOpacity={0.22} />

          {/* STATUS-AWARE HUD */}
          {active && !errored && (
            <>
              {/* Scanning beam — sweeps across visor */}
              <g style={{ animation: 'visor-scan 2.2s linear infinite' }}>
                <rect x={45} y={38} width={6} height={5} fill={color} opacity={0.9} rx={0.5} />
                <rect
                  x={45}
                  y={38}
                  width={6}
                  height={5}
                  fill={color}
                  opacity={0.4}
                  rx={0.5}
                  style={{ filter: `blur(2px)` }}
                />
              </g>
              {/* Anchor pips at visor edges */}
              <circle cx={47} cy={40.5} r={0.7} fill={color} opacity={0.95} />
              <circle cx={73} cy={40.5} r={0.7} fill={color} opacity={0.95} />
            </>
          )}

          {done && !errored && (
            <g
              style={{
                animation: 'sprite-done-stamp 600ms ease-out 1 forwards',
                transformOrigin: '60px 40.5px',
              }}
            >
              {/* Bright halo behind check */}
              <circle cx={60} cy={40.5} r={5} fill={color} opacity={0.55} />
              <circle cx={60} cy={40.5} r={5} fill="none" stroke={color} strokeWidth={0.6} opacity={0.9} />
              {/* Check mark — bold, centered, color-tinted with white core */}
              <path
                d="M 54 41 L 58.5 44.5 L 66 37.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 54 41 L 58.5 44.5 L 66 37.5"
                fill="none"
                stroke={color}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.6}
              />
            </g>
          )}

          {errored && (
            <motion.g
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 0.55, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Red wash behind glyph */}
              <rect x={45} y={37} width={30} height={7} rx={1} fill="#ff1e6b" opacity={0.35} />
              {/* Pulsing red bars left + right of the "!" */}
              <rect x={46} y={38} width={3} height={5} fill="#ff1e6b" rx={0.5} />
              <rect x={71} y={38} width={3} height={5} fill="#ff1e6b" rx={0.5} />
              {/* Bold ! glyph — exclamation rectangle + dot, vector-drawn so
                  it stays crisp at any zoom (text glyphs were too thin). */}
              <rect
                x={59}
                y={37.5}
                width={2}
                height={4}
                fill="#ffffff"
                style={{ filter: 'drop-shadow(0 0 2px #ff1e6b)' }}
              />
              <rect
                x={59}
                y={42.5}
                width={2}
                height={1.5}
                fill="#ffffff"
                style={{ filter: 'drop-shadow(0 0 2px #ff1e6b)' }}
              />
            </motion.g>
          )}

          {!active && !done && !errored && (
            <>
              {/* Idle: single dim pulsing dot, centered. */}
              <circle
                cx={60}
                cy={40.5}
                r={1.4}
                fill={color}
                style={{
                  animation: 'sprite-idle-eye 2.4s ease-in-out infinite',
                  filter: `drop-shadow(0 0 2px ${color})`,
                }}
              />
              {/* Faint side anchors */}
              <circle cx={47} cy={40.5} r={0.6} fill={color} opacity={0.5} />
              <circle cx={73} cy={40.5} r={0.6} fill={color} opacity={0.5} />
            </>
          )}

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

        {/* UPPER BODY GROUP — gets the resting "breathing" scaleY.
            Transform-origin pinned to belt so the head/legs don't drift. */}
        <g
          style={{
            transformOrigin: '60px 130px',
            animation: resting ? 'sprite-breathing 4.2s ease-in-out infinite' : 'none',
          }}
        >
          {/* SHOULDERS */}
          <path
            d="M 26 70 Q 30 64 36 64 L 84 64 Q 90 64 94 70 L 96 80 L 84 83 L 36 83 L 24 80 Z"
            fill={`url(#${tintId})`}
            stroke={color}
            strokeWidth={1.8}
          />
          {/* Shoulder rim light — top crescent */}
          <path
            d="M 26 70 Q 30 64 36 64 L 84 64 Q 90 64 94 70 L 92 73 Q 88 67 84 67 L 36 67 Q 32 67 28 73 Z"
            fill={`url(#${rimId})`}
            opacity={0.85}
          />
          {/* Shoulder-pad lights — outer ring + inner core */}
          <circle cx={32} cy={73} r={3.5} fill={color} fillOpacity={0.5} stroke={color} strokeWidth={1} />
          <circle cx={88} cy={73} r={3.5} fill={color} fillOpacity={0.5} stroke={color} strokeWidth={1} />
          <circle cx={32} cy={73} r={1.3} fill={color} />
          <circle cx={88} cy={73} r={1.3} fill={color} />
          {/* Shoulder-pad highlight specular */}
          <circle cx={31} cy={72} r={0.5} fill="#ffffff" opacity={0.85} />
          <circle cx={87} cy={72} r={0.5} fill="#ffffff" opacity={0.85} />

          {/* LEFT ARM */}
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
            <rect x={22} y={76} width={10} height={26} rx={4} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
            {/* Bicep rim light */}
            <rect x={22} y={76} width={3} height={26} rx={2} fill={`url(#${rimId})`} opacity={0.65} />
            {/* Elbow joint */}
            <circle cx={27} cy={102} r={3.4} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={0.7} />
            <circle cx={26} cy={101} r={0.6} fill="#ffffff" opacity={0.85} />
            {/* Forearm */}
            <rect x={20} y={104} width={12} height={24} rx={4} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
            <rect x={20} y={104} width={3} height={24} rx={2} fill={`url(#${rimId})`} opacity={0.6} />
            {/* Hand */}
            <circle cx={26} cy={130} r={4.5} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
            <circle cx={26} cy={130} r={1.2} fill={color} />
          </g>

          {/* RIGHT ARM */}
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
            <rect x={88} y={76} width={10} height={26} rx={4} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
            <rect x={88} y={76} width={3} height={26} rx={2} fill={`url(#${rimId})`} opacity={0.65} />
            <circle cx={93} cy={102} r={3.4} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={0.7} />
            <circle cx={92} cy={101} r={0.6} fill="#ffffff" opacity={0.85} />
            <rect x={88} y={104} width={12} height={24} rx={4} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
            <rect x={88} y={104} width={3} height={24} rx={2} fill={`url(#${rimId})`} opacity={0.6} />
            <circle cx={94} cy={130} r={4.5} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
            <circle cx={94} cy={130} r={1.2} fill={color} />
          </g>

          {/* TORSO */}
          <path
            d="M 38 83 L 82 83 L 79 126 L 41 126 Z"
            fill={`url(#${tintId})`}
            stroke={color}
            strokeWidth={1.8}
          />
          {/* Chest rim light — top edge */}
          <path
            d="M 38 83 L 82 83 L 80 90 L 40 90 Z"
            fill={`url(#${rimId})`}
            opacity={0.85}
          />
          {/* Chest plate outline */}
          <path
            d="M 45 90 L 75 90 L 73 114 L 47 114 Z"
            fill="none"
            stroke={color}
            strokeWidth={0.7}
            opacity={0.55}
          />
          {/* Diagonal seams across chest */}
          <line x1={45} y1={90} x2={50} y2={114} stroke={color} strokeWidth={0.5} opacity={0.4} />
          <line x1={75} y1={90} x2={70} y2={114} stroke={color} strokeWidth={0.5} opacity={0.4} />
          {/* Belly seams */}
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
          {/* Reactor inner ring detail */}
          <circle
            cx={60}
            cy={102}
            r={4.2}
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.4}
            opacity={resting ? 0.25 : 0.55}
          />
        </g>

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
          fill={`url(#${tintId})`}
          stroke={color}
          strokeWidth={1.2}
        />
        <rect x={42} y={132} width={36} height={1.5} fill={`url(#${rimId})`} opacity={0.7} />

        {/* LEFT LEG */}
        <g
          style={{
            transformOrigin: '52px 137px',
            animation: legActive ? 'leg-shift 2.2s ease-in-out infinite' : 'none',
          }}
        >
          <rect x={45} y={137} width={13} height={22} rx={2} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
          <rect x={45} y={137} width={3.5} height={22} rx={1.5} fill={`url(#${rimId})`} opacity={0.6} />
          {/* Knee joint */}
          <circle cx={51} cy={159} r={2.8} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={0.7} />
          <circle cx={50.5} cy={158.4} r={0.55} fill="#ffffff" opacity={0.85} />
          <rect x={44} y={161} width={15} height={16} rx={2} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
          <rect x={44} y={161} width={3.5} height={16} rx={1.5} fill={`url(#${rimId})`} opacity={0.55} />
        </g>

        {/* RIGHT LEG — note: animation is the longhand `animationName` etc.
            so we can also set `animationDelay` without React 19 warning about
            mixing shorthand + longhand. */}
        <g
          style={{
            transformOrigin: '68px 137px',
            animationName: legActive ? 'leg-shift' : 'none',
            animationDuration: '2.2s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: '1.1s',
          }}
        >
          <rect x={62} y={137} width={13} height={22} rx={2} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
          <rect x={62} y={137} width={3.5} height={22} rx={1.5} fill={`url(#${rimId})`} opacity={0.6} />
          <circle cx={68} cy={159} r={2.8} fill={color} fillOpacity={0.55} stroke={color} strokeWidth={0.7} />
          <circle cx={67.5} cy={158.4} r={0.55} fill="#ffffff" opacity={0.85} />
          <rect x={61} y={161} width={15} height={16} rx={2} fill={`url(#${tintId})`} stroke={color} strokeWidth={1.2} />
          <rect x={61} y={161} width={3.5} height={16} rx={1.5} fill={`url(#${rimId})`} opacity={0.55} />
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
        {/* Boot toe highlights */}
        <line x1={43} y1={176} x2={58} y2={176} stroke="#ffffff" strokeWidth={0.7} opacity={0.55} />
        <line x1={62} y1={176} x2={77} y2={176} stroke="#ffffff" strokeWidth={0.7} opacity={0.55} />

        {/* OVERHEAD ERROR WARNING — kept as redundant alert above the helmet. */}
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
