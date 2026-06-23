/**
 * Theme registry — the single source of truth for CCC's palette + motion.
 *
 * A theme is a plain object. Its `vars` map is written onto the document root as
 * CSS custom properties; because Tailwind v4 emits utilities as `var(--color-*)`,
 * overriding those vars at runtime retints every utility-driven surface. The
 * `phaseHex` map is the hex source for the robots/rooms (which concatenate alpha
 * suffixes like `${color}AA`, so it must stay hex, not `var(...)`).
 *
 * See DESIGN.md §2–§4 for the token tiers and motion system.
 */

import type { Phase } from '../types';

export interface Theme {
  id: string;
  name: string;
  blurb: string;
  /** CSS custom properties applied to document.documentElement. */
  vars: Record<string, string>;
  /** Per-phase room/robot hex (alpha suffixes appended by consumers). */
  phaseHex: Record<Phase, string>;
}

/** Shared motion tokens — the existing curves, promoted to named tokens. */
const EASE = {
  '--ccc-ease-contact': 'cubic-bezier(0.55, 0.06, 0.35, 1.1)',
  '--ccc-ease-settle': 'cubic-bezier(0.34, 1.2, 0.5, 1)',
  '--ccc-ease-ambient': 'ease-in-out',
};

// ---------------------------------------------------------------------------
// neon-noir — the default. Cyberpunk control room: deep indigo-black + neon.
// ---------------------------------------------------------------------------
const neonNoir: Theme = {
  id: 'neon-noir',
  name: 'Neon Noir',
  blurb: 'Cyberpunk control room',
  vars: {
    '--color-ink-950': '#05050d',
    '--color-ink-900': '#0a0a18',
    '--color-ink-800': '#11112a',
    '--color-ink-700': '#1a1a3b',
    '--color-ink-600': '#252555',
    '--color-neon-cyan': '#00f5ff',
    '--color-neon-blue': '#3d7bff',
    '--color-neon-magenta': '#ff4df5',
    '--color-neon-pink': '#ff1e6b',
    '--color-neon-amber': '#ffb400',
    '--color-neon-green': '#39ff14',
    '--color-neon-purple': '#a855f7',
    '--ccc-accent': '#00f5ff',
    '--ccc-text': '#f5f5ff',
    '--ccc-text-muted': '#9ca3af',
    '--ccc-scanline-alpha': '0.015',
    '--ccc-motion-scale': '1',
    ...EASE,
  },
  phaseHex: {
    PROMPT: '#3d7bff',
    PLAN: '#00f5ff',
    BUILD: '#ffb400',
    REVIEW: '#ff4df5',
    TEST: '#39ff14',
    DEPLOY: '#ff1e6b',
  },
};

// ---------------------------------------------------------------------------
// amber-crt — retro single-phosphor terminal. Warm-black + amber/green glow.
// ---------------------------------------------------------------------------
const amberCrt: Theme = {
  id: 'amber-crt',
  name: 'Amber CRT',
  blurb: 'Retro phosphor terminal',
  vars: {
    '--color-ink-950': '#0a0600',
    '--color-ink-900': '#120c02',
    '--color-ink-800': '#1c1404',
    '--color-ink-700': '#2a1f08',
    '--color-ink-600': '#3a2c0e',
    // Every neon utility resolves to an amber/green phosphor tone.
    '--color-neon-cyan': '#ffd700',
    '--color-neon-blue': '#ffb000',
    '--color-neon-magenta': '#ff9500',
    '--color-neon-pink': '#ff7b00',
    '--color-neon-amber': '#ffb000',
    '--color-neon-green': '#aaff66',
    '--color-neon-purple': '#ffae42',
    '--ccc-accent': '#ffb000',
    '--ccc-text': '#ffe0a8',
    '--ccc-text-muted': '#9a7636',
    '--ccc-scanline-alpha': '0.05',
    '--ccc-motion-scale': '1',
    ...EASE,
  },
  phaseHex: {
    PROMPT: '#ffc04d',
    PLAN: '#ffd700',
    BUILD: '#ff9500',
    REVIEW: '#ffae42',
    TEST: '#aaff66',
    DEPLOY: '#ff7b00',
  },
};

// ---------------------------------------------------------------------------
// clay — warm, editorial, "Anthropic" light mode. Bone substrate + terracotta.
//   NOTE: v1 retints chrome/cards/text correctly; the office scenes were drawn
//   for a dark stage and will read softer on light until the scene art pass.
// ---------------------------------------------------------------------------
const clay: Theme = {
  id: 'clay',
  name: 'Clay',
  blurb: 'Warm editorial light',
  vars: {
    // "ink" ramp inverts: darkest token = body bg (lightest), surfaces step down.
    '--color-ink-950': '#f4efe6',
    '--color-ink-900': '#ece4d6',
    '--color-ink-800': '#e2d7c4',
    '--color-ink-700': '#d4c6ad',
    '--color-ink-600': '#c2b193',
    '--color-neon-cyan': '#3f7d6e',
    '--color-neon-blue': '#3f7d6e',
    '--color-neon-magenta': '#9c5a8a',
    '--color-neon-pink': '#c0492f',
    '--color-neon-amber': '#b8862b',
    '--color-neon-green': '#5e8c4a',
    '--color-neon-purple': '#9c5a8a',
    '--ccc-accent': '#c4612f',
    '--ccc-text': '#2a2118',
    '--ccc-text-muted': '#6b5d49',
    '--ccc-scanline-alpha': '0',
    '--ccc-motion-scale': '1',
    ...EASE,
  },
  phaseHex: {
    PROMPT: '#3f7d6e',
    PLAN: '#c4612f',
    BUILD: '#b8862b',
    REVIEW: '#9c5a8a',
    TEST: '#5e8c4a',
    DEPLOY: '#c0492f',
  },
};

export const THEMES: Theme[] = [neonNoir, amberCrt, clay];
export const DEFAULT_THEME_ID = neonNoir.id;

export const themeById = (id: string): Theme =>
  THEMES.find((t) => t.id === id) ?? neonNoir;
