import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { AgentSprite } from '../AgentSprite';
import { useProjectColor } from '../ProjectChip';
import { AgentLabel } from './AgentLabel';
import { isResting, type SceneProps } from './types';
import { Atmosphere } from './Atmosphere';
import type { AgentState } from '../../types';

/**
 * DEPLOY scene — launch pad, rocket, distant star, box delivery.
 *
 * Per-agent 8s choreography:
 *   0.0 – 0.8s  Boarding: ground agent is visible beside the rocket, then
 *                         fades up into the porthole.
 *   0.8 – 1.8s  Launch:   thrust flame flares, rocket shakes + just begins
 *                         to lift off the pad.
 *   1.8 – 4.0s  Flight:   rocket follows an arc (translate + rotate) from
 *                         pad (bottom-left) to star (top-right). Rotation
 *                         aligns the nose with the velocity vector.
 *   4.0 – 5.5s  Docked:   rocket parks near the star, a box slides out of
 *                         the porthole and settles at the star's base.
 *   5.5 – 7.0s  Return:   rocket reverses the arc back toward the pad.
 *   7.0 – 8.0s  Dismount: small cushion flame, rocket settles, agent pops
 *                         out onto the pad and waves.
 *
 * After each complete cycle the delivered-box stack at the star grows by 1,
 * capped at MAX_DELIVERED (=4) then wrapping to 0 to create a sense of
 * accumulating work.
 *
 * The curved trajectory is driven by framer-motion: we measure the lane's
 * bounding box with ResizeObserver, compute a target offset (top-right of
 * the lane relative to the rocket's starting position above the pad), and
 * feed a sampled parabolic arc as keyframe arrays into `motion.div.animate`.
 * This lets the arc scale with lane size — narrow lanes still look correct.
 *
 * Per-agent lanes are staggered by index * STAGGER_MS via `animationDelay`
 * (CSS) and framer's `delay` (flight), so N rockets don't move in lockstep.
 *
 * When an agent is resting (`isResting`), its flight pauses wherever it is
 * and CSS animations flip to `animationPlayState: paused`. The star's halo
 * keeps pulsing as ambience regardless of agent state.
 */

const CYCLE_S = 8;
const CYCLE_MS = CYCLE_S * 1000;
const STAGGER_MS = 1500;
const STAR_COLOR = '#ffd166';
const MAX_DELIVERED = 4;

/** Rocket SVG — cone nose, cylindrical body, fins, porthole, optional thrust
 *  flame (animated via CSS keyframes to only flare during launch/landing). */
function Rocket({ color, delayMs, playState }: {
  color: string;
  delayMs: number;
  playState: CSSProperties['animationPlayState'];
}) {
  return (
    <svg
      width={36}
      height={64}
      viewBox="0 0 36 64"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      {/* Thrust flame — scales from 0 only during launch & landing windows. */}
      <g
        style={{
          transformOrigin: '18px 52px',
          animation: `deploy-thrust ${CYCLE_MS}ms linear infinite`,
          animationDelay: `${delayMs}ms`,
          animationPlayState: playState,
        }}
      >
        <path
          d="M 12 52 Q 18 78 24 52 Q 21 62 18 57 Q 15 62 12 52 Z"
          fill={color}
          fillOpacity={0.85}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <path
          d="M 14 52 Q 18 68 22 52 Q 20 58 18 55 Q 16 58 14 52 Z"
          fill="#fff8dc"
          fillOpacity={0.95}
        />
      </g>

      {/* Left fin */}
      <path
        d="M 8 44 L 4 54 L 12 50 Z"
        fill={color}
        fillOpacity={0.55}
        stroke={color}
        strokeWidth={1}
      />
      {/* Right fin */}
      <path
        d="M 28 44 L 32 54 L 24 50 Z"
        fill={color}
        fillOpacity={0.55}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body (cylinder) */}
      <rect
        x={11}
        y={18}
        width={14}
        height={34}
        rx={3}
        fill={color}
        fillOpacity={0.35}
        stroke={color}
        strokeWidth={1.4}
      />
      {/* Body seam */}
      <line x1={18} y1={18} x2={18} y2={52} stroke={color} strokeWidth={0.6} opacity={0.45} />
      {/* Cone nose */}
      <path
        d="M 11 18 Q 18 2 25 18 Z"
        fill={color}
        fillOpacity={0.5}
        stroke={color}
        strokeWidth={1.4}
      />
      {/* Nose tip highlight */}
      <circle cx={18} cy={6} r={1.2} fill="#ffffff" opacity={0.9} />
      {/* Porthole (window) */}
      <circle
        cx={18}
        cy={28}
        r={4.8}
        fill="#05050d"
        stroke={color}
        strokeWidth={1.4}
      />
      <circle cx={18} cy={28} r={3.4} fill={color} fillOpacity={0.25} />
      <circle cx={16.5} cy={26.5} r={0.9} fill="#ffffff" opacity={0.8} />
      {/* Lower panel detailing */}
      <rect
        x={13}
        y={40}
        width={10}
        height={8}
        rx={1}
        fill="none"
        stroke={color}
        strokeWidth={0.7}
        opacity={0.55}
      />
    </svg>
  );
}

/** Launch pad — short deck with 2 vertical support rods and a refuel hose. */
function LaunchPad({ color }: { color: string }) {
  return (
    <svg
      width={60}
      height={42}
      viewBox="0 0 60 42"
      style={{ display: 'block' }}
      aria-hidden
    >
      {/* Left support rod */}
      <rect x={6} y={8} width={3} height={24} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={0.8} />
      {/* Right support rod */}
      <rect x={51} y={8} width={3} height={24} fill={color} fillOpacity={0.4} stroke={color} strokeWidth={0.8} />
      {/* Platform deck */}
      <rect x={2} y={30} width={56} height={5} rx={1} fill={color} fillOpacity={0.45} stroke={color} strokeWidth={1} />
      {/* Platform base */}
      <rect x={6} y={35} width={48} height={4} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.8} />
      {/* Refueling hose — curves from left rod up toward the rocket */}
      <path
        d="M 9 12 Q 20 4 28 16"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        opacity={0.75}
        strokeLinecap="round"
      />
      {/* Hose nozzle tip */}
      <circle cx={28} cy={16} r={1.4} fill={color} />
      {/* Platform warning light */}
      <circle cx={30} cy={32.5} r={1} fill={color} opacity={0.85} style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

/** 5-point star with soft pulsing halo (pulse runs always — it's ambience). */
function Star() {
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 48 48"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <circle
        cx={24}
        cy={24}
        r={19}
        fill={STAR_COLOR}
        fillOpacity={0.11}
        style={{
          animation: 'deploy-star-halo 2.4s ease-in-out infinite',
          transformOrigin: '24px 24px',
        }}
      />
      <circle
        cx={24}
        cy={24}
        r={13}
        fill={STAR_COLOR}
        fillOpacity={0.2}
        style={{
          animation: 'deploy-star-halo 2.4s ease-in-out infinite',
          animationDelay: '0.6s',
          transformOrigin: '24px 24px',
        }}
      />
      <path
        d="M 24 4 L 28.5 18 L 44 18 L 31.5 27 L 36 42 L 24 32.5 L 12 42 L 16.5 27 L 4 18 L 19.5 18 Z"
        fill={STAR_COLOR}
        stroke={STAR_COLOR}
        strokeWidth={1.2}
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 8px ${STAR_COLOR})` }}
      />
      <circle cx={24} cy={24} r={3.2} fill="#fff8dc" opacity={0.88} />
    </svg>
  );
}

/** Stack of boxes that grows each cycle, rendered next to the star base. */
function BoxStack({ count, color }: { count: number; color: string }) {
  const positions: readonly { x: number; y: number }[] = [
    { x: 0, y: 18 },   // bottom-left
    { x: 12, y: 18 },  // bottom-right
    { x: 6, y: 6 },    // middle top
    { x: 18, y: 6 },   // top right
  ];
  const shown = Math.max(0, Math.min(count, positions.length));
  const items: { x: number; y: number }[] = [];
  for (let i = 0; i < shown; i += 1) {
    const p = positions[i];
    if (p) items.push(p);
  }
  return (
    <svg
      width={32}
      height={30}
      viewBox="0 0 32 30"
      style={{ display: 'block' }}
      aria-hidden
    >
      {items.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x}
            y={b.y}
            width={10}
            height={10}
            rx={1}
            fill={color}
            fillOpacity={0.5}
            stroke={color}
            strokeWidth={1}
          />
          <line
            x1={b.x + 5}
            y1={b.y}
            x2={b.x + 5}
            y2={b.y + 10}
            stroke={color}
            strokeWidth={0.5}
            opacity={0.6}
          />
        </g>
      ))}
    </svg>
  );
}

/** Sample a parabolic-ish arc between (0,0) and (dx, dy) at a given progress.
 *  t in [0, 1]. The peak is lifted above the straight-line by `lift` px. */
function arcPoint(t: number, dx: number, dy: number, lift: number): { x: number; y: number } {
  const x = dx * t;
  // Linear interpolation on y (negative = upward), plus a parabolic lift.
  const yLine = dy * t;
  const parabola = -4 * lift * t * (1 - t);
  return { x, y: yLine + parabola };
}

/** Slope angle (in degrees) between two sampled points — used to rotate
 *  the rocket so its nose points along the flight path. Nose points +Y up
 *  by default (rocket SVG has nose at top, body below), so we add +90deg. */
function angleBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rad = Math.atan2(dy, dx);
  return (rad * 180) / Math.PI + 90;
}

/** Build the keyframe arrays (x, y, rotate) for one full 8s cycle, covering:
 *  boarding (hold at pad), launch (tiny upward lift), flight (arc out),
 *  dock (hold at star), return (arc back), dismount (hold at pad).
 */
function buildFlightKeyframes(dx: number, dy: number): {
  x: number[];
  y: number[];
  rotate: number[];
  times: number[];
} {
  const lift = Math.max(40, Math.abs(dy) * 0.4 + Math.abs(dx) * 0.15);
  const samples = 6;

  const x: number[] = [];
  const y: number[] = [];
  const rotate: number[] = [];
  const times: number[] = [];

  // 0.00 – 0.10  boarding (stationary at pad)
  x.push(0); y.push(0); rotate.push(0); times.push(0);
  x.push(0); y.push(0); rotate.push(0); times.push(0.1);
  // 0.10 – 0.225  launch liftoff (slight vertical nudge)
  x.push(0); y.push(-8); rotate.push(0); times.push(0.225);
  // 0.225 – 0.5 flight out (sampled arc)
  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const pt = arcPoint(t, dx, dy, lift);
    const prev = arcPoint(Math.max(0.0001, t - 0.001), dx, dy, lift);
    const rot = angleBetween(prev, pt);
    const timeAt = 0.225 + (0.5 - 0.225) * t;
    x.push(pt.x); y.push(pt.y); rotate.push(rot); times.push(timeAt);
  }
  // 0.5 – 0.6875 docked at star (hold + tiny hover bob)
  x.push(dx); y.push(dy - 2); rotate.push(0); times.push(0.56);
  x.push(dx); y.push(dy); rotate.push(0); times.push(0.6875);
  // 0.6875 – 0.875 return flight (arc back, mirrored rotation)
  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const pt = arcPoint(1 - t, dx, dy, lift);
    const prev = arcPoint(Math.min(0.9999, 1 - t + 0.001), dx, dy, lift);
    const rot = angleBetween(prev, pt);
    const timeAt = 0.6875 + (0.875 - 0.6875) * t;
    x.push(pt.x); y.push(pt.y); rotate.push(rot); times.push(timeAt);
  }
  // 0.875 – 1.0 dismount (settle on pad)
  x.push(0); y.push(-4); rotate.push(0); times.push(0.9375);
  x.push(0); y.push(0); rotate.push(0); times.push(1);

  return { x, y, rotate, times };
}

/** One launch-and-deliver lane with pad, rocket, star, boxes, and the agent. */
function Lane({
  agent,
  index,
  color,
}: {
  agent: AgentState;
  index: number;
  color: string;
}) {
  const projectColor = useProjectColor();
  const agentColor = projectColor(agent.project);
  const resting = isResting(agent.status);
  const delayMs = index * STAGGER_MS;
  const playState: CSSProperties['animationPlayState'] = resting ? 'paused' : 'running';

  // Per-agent delivered-box counter. Tick fires once per full cycle just
  // after the unload beat (~5.2s), so the stack visibly grows right AFTER
  // the box has arrived at the star.
  const [delivered, setDelivered] = useState(0);
  useEffect(() => {
    if (resting) return undefined;
    let intervalHandle: ReturnType<typeof setInterval> | undefined;
    const startHandle = setTimeout(() => {
      setDelivered((d) => (d + 1) % (MAX_DELIVERED + 1));
      intervalHandle = setInterval(() => {
        setDelivered((d) => (d + 1) % (MAX_DELIVERED + 1));
      }, CYCLE_MS);
    }, delayMs + 5200);
    return () => {
      clearTimeout(startHandle);
      if (intervalHandle) clearInterval(intervalHandle);
    };
  }, [delayMs, resting]);

  // Measure the lane so we can build a flight path that spans its actual
  // box, regardless of agent count / window size.
  const laneRef = useRef<HTMLDivElement | null>(null);
  const [laneBox, setLaneBox] = useState<{ w: number; h: number }>({ w: 240, h: 200 });
  useLayoutEffect(() => {
    const el = laneRef.current;
    if (!el) return undefined;
    const update = (): void => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setLaneBox({ w: r.width, h: r.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rocket starts at (left:20, bottom:30) — roughly above the pad. Star sits
  // at (right:8, top:6) anchored by its 48px width. Compute dx/dy as the
  // delta to move the rocket's CENTER to roughly the star's CENTER.
  const rocketW = 36;
  const rocketH = 64;
  const rocketStartLeft = 20;
  const rocketStartBottom = 30;
  const starRight = 8;
  const starTop = 6;
  const starW = 48;
  const starH = 48;

  // Target top-left for rocket when docked: just beneath/left of the star.
  const targetLeft = laneBox.w - starRight - starW - rocketW * 0.2;
  const targetTop = starTop + starH * 0.2;
  // Starting top-left in the same coord system (top-based) for the rocket:
  const startLeft = rocketStartLeft;
  const startTop = laneBox.h - rocketStartBottom - rocketH;
  const dx = targetLeft - startLeft;
  const dy = targetTop - startTop;

  const { x, y, rotate, times } = buildFlightKeyframes(dx, dy);

  // Imperative flight controls — gives us a clean start/stop so the rocket
  // freezes wherever it is when the agent rests, and resumes on reactivate.
  const flightControls = useAnimationControls();
  useEffect(() => {
    if (resting) {
      flightControls.stop();
      return undefined;
    }
    let cancelled = false;
    const startTimer = setTimeout(() => {
      if (cancelled) return;
      void flightControls.start({
        x,
        y,
        rotate,
        transition: {
          duration: CYCLE_S,
          times,
          ease: 'linear',
          repeat: Infinity,
        },
      });
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
    // JSON-stringify keyframes so we only restart when the arc geometry changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resting, delayMs, laneBox.w, laneBox.h]);

  return (
    <div ref={laneRef} className="relative w-full h-full">
      {/* Trajectory arc — faint dashed curve from pad up to star. */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M 14 82 Q 52 8 85 22"
          fill="none"
          stroke={color}
          strokeWidth={0.3}
          strokeDasharray="1.5 2"
          opacity={0.3}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Star (upper-right corner) */}
      <div className="absolute" style={{ right: starRight, top: starTop }}>
        <Star />
      </div>

      {/* Delivered box stack tucked next to the star's base */}
      <div
        className="absolute"
        style={{
          right: starRight + starW + 2,
          top: starTop + starH - 20,
        }}
      >
        <BoxStack count={delivered} color={agentColor} />
      </div>

      {/* Launch pad at bottom-left */}
      <div className="absolute" style={{ left: 6, bottom: 4 }}>
        <LaunchPad color={color} />
      </div>

      {/* Rocket + agent-in-porthole group — flies along the arc.
       *  Flight is driven by imperative controls so rest/resume works cleanly.
       *  NOTE: x, y, rotate, times are referenced inside the effect; listing
       *  them on the tag would reset framer on every render (we only want to
       *  restart when the geometry changes — already tracked via laneBox). */}
      <motion.div
        className="absolute"
        animate={flightControls}
        style={{
          left: rocketStartLeft,
          top: startTop,
          width: rocketW,
          height: rocketH,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        {/* Shake layer — only perceptible during launch via CSS keyframe. */}
        <div
          style={{
            width: '100%',
            height: '100%',
            animation: `deploy-shake ${CYCLE_MS}ms linear infinite`,
            animationDelay: `${delayMs}ms`,
            animationPlayState: playState,
            position: 'relative',
          }}
        >
          <Rocket color={color} delayMs={delayMs} playState={playState} />

          {/* Agent upper body pokes out of the porthole during flight.
           *  The sprite is sm-sized (52x78). We position it so the chest
           *  overlaps the porthole (rocket y=28). Visibility is controlled
           *  by CSS so the agent only shows during ride/dock/return. */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -22,
              transform: 'translateX(-50%)',
              width: 52,
              animation: `deploy-agent-visibility ${CYCLE_MS}ms ease-in-out infinite`,
              animationDelay: `${delayMs}ms`,
              animationPlayState: playState,
              pointerEvents: 'none',
            }}
          >
            <AgentSprite
              color={agentColor}
              status={agent.status}
              phase={agent.phase}
              size="sm"
            />
          </div>

          {/* Delivery box — slides out of the porthole during the dock beat
           *  and settles at the star's base. Off-screen otherwise. */}
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: 24,
              width: 14,
              height: 12,
              borderRadius: 2,
              background: `${agentColor}aa`,
              border: `1px solid ${agentColor}`,
              boxShadow: `0 0 6px ${agentColor}`,
              animation: `deploy-box-drop ${CYCLE_MS}ms ease-out infinite`,
              animationDelay: `${delayMs}ms`,
              animationPlayState: playState,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      </motion.div>

      {/* Ground agent beside the pad — only visible during boarding (0–0.8s)
       *  and dismount (7–8s). Gives the illusion of entering / exiting the
       *  rocket without fighting with the flight-path sprite. */}
      <div
        className="absolute"
        style={{
          left: 48,
          bottom: 12,
          width: 52,
          animation: `deploy-ground-agent ${CYCLE_MS}ms ease-in-out infinite`,
          animationDelay: `${delayMs}ms`,
          animationPlayState: playState,
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <AgentSprite
          color={agentColor}
          status={agent.status}
          phase={agent.phase}
          size="sm"
        />
      </div>

      {/* Label sits at the BOTTOM of the lane, below the launch pad. */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: -4 }}
      >
        <AgentLabel agent={agent} />
      </div>
    </div>
  );
}

export function DeployScene({ agents, color }: SceneProps) {
  if (agents.length === 0) {
    return (
      <>
        <Atmosphere phase="DEPLOY" color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="font-display tracking-[0.4em] text-sm"
            style={{ color, opacity: 0.55, textShadow: `0 0 8px ${color}` }}
          >
            // LAUNCH PAD STANDBY //
          </div>
        </div>
      </>
    );
  }

  const count = Math.min(agents.length, 4);

  return (
    <>
      <Atmosphere phase="DEPLOY" color={color} />
      <div className="absolute inset-0 pt-11 pb-10 px-2 overflow-hidden">
        <div className="relative w-full h-full flex flex-row items-stretch justify-around gap-1">
          <AnimatePresence mode="popLayout">
            {agents.slice(0, count).map((agent, index) => {
              const resting = isResting(agent.status);
              return (
                <motion.div
                  key={agent.key}
                  layoutId={`agent-${agent.key}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: resting ? 0.7 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  className="relative h-full"
                  style={{
                    flexBasis: `${100 / count}%`,
                    minWidth: 0,
                  }}
                >
                  <Lane agent={agent} index={index} color={color} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
