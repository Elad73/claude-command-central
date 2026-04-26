import type { CSSProperties, ReactElement } from 'react';
import type { Phase } from '../../types';

/**
 * Pass-2 atmospherics. Three additive layers stamped behind every scene's
 * existing furniture/agents so the rooms feel inhabited and have depth:
 *
 *   1. Perspective floor grid — fake horizon lines + lateral ribs converging
 *      at the back wall. Phase-tinted.
 *   2. Volumetric light wash — a single radial gradient placed at a phase-
 *      specific anchor (REVIEW = lower-left fireplace, STRATEGY = top-center
 *      lamp, DEPLOY = upper-right star, etc.). Slow opacity breathing.
 *   3. Ambient particles — a fixed roster of small dots animated with one
 *      shared keyframe per behavior, staggered via animation-delay. Density,
 *      direction, color, and speed vary per phase.
 *
 * No props beyond `phase` and `color` (the room/phase color). Renders
 * `pointer-events: none` and lives at z-index 0 inside the scene's clipping
 * box, so the existing scene content draws on top untouched.
 */

interface Props {
  phase: Phase;
  color: string;
}

interface ParticleSpec {
  /** "drift-down" = top→bottom; "rise" = bottom→top; "twinkle" = blink in place. */
  motion: 'drift-down' | 'rise' | 'twinkle' | 'spark-fall';
  /** Number of particles to render. Keep small (8–18) for perf. */
  count: number;
  /** CSS size (px). */
  size: number;
  /** Per-particle CSS color (often the phase color or a warm accent). */
  color: string;
  /** Animation duration in seconds. */
  duration: number;
  /** Optional secondary color for variety (every other particle). */
  altColor?: string;
}

interface AtmosphereSpec {
  particles: ParticleSpec[];
  /** Volumetric light gradient — anchor + tint. */
  light: { x: string; y: string; tint: string; size: string; opacity: number };
  /** Floor-grid stroke alpha multiplier (0–1). 0 = no grid. */
  gridOpacity: number;
}

const SPEC: Record<Phase, AtmosphereSpec> = {
  PROMPT: {
    particles: [
      { motion: 'drift-down', count: 22, size: 2.2, color: '#3d7bff', altColor: '#5fa0ff', duration: 8 },
    ],
    light: { x: '50%', y: '0%', tint: 'rgba(61, 123, 255, 0.45)', size: '80% 60%', opacity: 1 },
    gridOpacity: 1,
  },
  PLAN: {
    particles: [
      { motion: 'rise', count: 20, size: 2.4, color: '#00f5ff', altColor: '#a855f7', duration: 9 },
    ],
    light: { x: '50%', y: '20%', tint: 'rgba(0, 245, 255, 0.40)', size: '70% 70%', opacity: 1 },
    gridOpacity: 1,
  },
  BUILD: {
    particles: [
      { motion: 'spark-fall', count: 26, size: 2.6, color: '#ffb400', altColor: '#ff8a00', duration: 3.6 },
    ],
    light: { x: '50%', y: '8%', tint: 'rgba(255, 180, 0, 0.50)', size: '85% 65%', opacity: 1 },
    gridOpacity: 1,
  },
  REVIEW: {
    particles: [
      { motion: 'rise', count: 22, size: 2.4, color: '#ff8a3d', altColor: '#ff4df5', duration: 6 },
    ],
    light: { x: '20%', y: '78%', tint: 'rgba(255, 120, 60, 0.65)', size: '70% 65%', opacity: 1 },
    gridOpacity: 0.95,
  },
  TEST: {
    particles: [
      { motion: 'rise', count: 22, size: 3.0, color: '#39ff14', altColor: '#7fff5a', duration: 5 },
    ],
    light: { x: '50%', y: '95%', tint: 'rgba(57, 255, 20, 0.50)', size: '85% 55%', opacity: 1 },
    gridOpacity: 1,
  },
  DEPLOY: {
    particles: [
      { motion: 'twinkle', count: 26, size: 2.0, color: '#ffffff', altColor: '#ff1e6b', duration: 3.5 },
    ],
    light: { x: '78%', y: '22%', tint: 'rgba(255, 30, 107, 0.55)', size: '70% 65%', opacity: 1 },
    gridOpacity: 1.1,
  },
};

/** Pseudo-random but deterministic-per-index — keeps positions stable across
 *  re-renders so particles don't jitter each animation frame. */
function placeParticle(seed: number): { left: string; top: string; delay: string } {
  const x = (seed * 53.13) % 100;
  const y = (seed * 31.41) % 100;
  const d = (seed * 0.371) % 1;
  return { left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%`, delay: `${d.toFixed(2)}s` };
}

function ParticleField({ specs, salt }: { specs: ParticleSpec[]; salt: number }) {
  const out: ReactElement[] = [];
  let key = 0;
  for (const s of specs) {
    for (let i = 0; i < s.count; i++) {
      const { left, top, delay } = placeParticle((i + salt * 7) * (key + 1) + 1);
      const isAlt = !!s.altColor && i % 2 === 0;
      const c = isAlt ? s.altColor! : s.color;
      out.push(
        <span
          key={`${key}-${i}`}
          aria-hidden
          style={{
            position: 'absolute',
            left,
            top,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: c,
            boxShadow: `0 0 ${Math.max(3, s.size * 2.5)}px ${c}`,
            opacity: 0,
            animationName: `atm-${s.motion}`,
            animationDuration: `${s.duration}s`,
            animationTimingFunction: s.motion === 'twinkle' ? 'ease-in-out' : 'linear',
            animationIterationCount: 'infinite',
            animationDelay: delay,
            willChange: 'transform, opacity',
          }}
        />,
      );
    }
    key++;
  }
  return <>{out}</>;
}

const FLOOR_GRID_STYLE = (color: string, alpha: number): CSSProperties => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: '46%',
  // Two layered linear-gradients build the converging ribs + horizon stripes.
  // The wrapper is then perspective-transformed so the lines appear to recede
  // toward a vanishing point at the back wall.
  // Stronger alpha than v0 — without this the grid just disappears against
  // the dark backdrop. Base multipliers ~3× the original so the depth read.
  background: `
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent 28px,
      ${color}${Math.min(255, Math.round(alpha * 110)).toString(16).padStart(2, '0')} 28px,
      ${color}${Math.min(255, Math.round(alpha * 110)).toString(16).padStart(2, '0')} 29px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 16px,
      ${color}${Math.min(255, Math.round(alpha * 80)).toString(16).padStart(2, '0')} 16px,
      ${color}${Math.min(255, Math.round(alpha * 80)).toString(16).padStart(2, '0')} 17px
    )
  `,
  transform: 'perspective(420px) rotateX(58deg)',
  transformOrigin: 'center bottom',
  // Soft fade to dark at the back wall + edges so the grid doesn't visually
  // collide with the room border.
  maskImage:
    'radial-gradient(ellipse 75% 90% at 50% 100%, black 35%, transparent 90%)',
  WebkitMaskImage:
    'radial-gradient(ellipse 75% 90% at 50% 100%, black 35%, transparent 90%)',
  pointerEvents: 'none',
});

export function Atmosphere({ phase, color }: Props) {
  const spec = SPEC[phase];
  if (!spec) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* 1. Perspective floor grid (back) */}
      {spec.gridOpacity > 0 && <div style={FLOOR_GRID_STYLE(color, spec.gridOpacity)} />}

      {/* 2. Volumetric light wash — slow breathing on opacity */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse ${spec.light.size} at ${spec.light.x} ${spec.light.y}, ${spec.light.tint}, transparent 75%)`,
          opacity: spec.light.opacity,
          animation: 'atm-light-breathe 6s ease-in-out infinite',
          mixBlendMode: 'screen',
        }}
      />

      {/* 3. Ambient particles (front of atmosphere, still behind scene chrome) */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <ParticleField specs={spec.particles} salt={hashPhase(phase)} />
      </div>
    </div>
  );
}

const hashPhase = (p: Phase): number =>
  p.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
