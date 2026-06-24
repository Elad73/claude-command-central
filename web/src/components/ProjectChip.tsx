import { useTheme } from '../theme/ThemeProvider';
import type { RobotColor } from '../theme/registry';

/** Deterministic hue per project slug (0–359). */
const hashHue = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h % 360;
};

const hslToHex = (h: number, s: number, l: number): string => {
  const ll = l / 100;
  const a = (s * Math.min(ll, 1 - ll)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ll - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/** Default robot color treatment (matches neon-noir) for theme-less callers. */
const DEFAULT_ROBOT: RobotColor = { sat: 90, light: 65 };

/**
 * Deterministic per-project hex. `robot` (from the active theme) remaps the
 * hashed hue into the theme's band and sets saturation/lightness, so robots fit
 * each theme while staying distinguishable per project. Returns hex so callers
 * can safely append alpha suffixes like `${color}AA`.
 */
export const projectColor = (slug: string, robot: RobotColor = DEFAULT_ROBOT): string => {
  const raw = hashHue(slug);
  const hue = robot.hueRange
    ? robot.hueRange[0] + (raw % Math.max(1, robot.hueRange[1] - robot.hueRange[0]))
    : raw;
  return hslToHex(hue, robot.sat, robot.light);
};

/** Hook form: returns a `projectColor` bound to the active theme's robot params. */
export const useProjectColor = (): ((slug: string) => string) => {
  const { theme } = useTheme();
  return (slug: string) => projectColor(slug, theme.robot);
};

/**
 * Collapse a project slug to a 2–3 char code for compact display.
 *   claude-command-central → CCC
 *   gmail-board            → GB
 *   daily-logger           → DL
 *   expense-tracker        → ET
 *   singleword             → SIN
 */
export const projectShortCode = (slug: string): string => {
  const parts = slug.split(/[-_.\s/]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.slice(0, 3).map((p) => p[0]!.toUpperCase()).join('');
  }
  const only = parts[0] ?? slug;
  return only.slice(0, 3).toUpperCase();
};

interface Props {
  project: string;
  active?: boolean;
  size?: 'sm' | 'md';
  /** When true, show only the short code (e.g. "CCC") — for tight layouts like the live feed. */
  compact?: boolean;
}

export function ProjectChip({ project, active = false, size = 'md', compact = false }: Props) {
  const color = useProjectColor()(project);
  const padY = size === 'sm' ? 2 : 4;
  const padX = size === 'sm' ? (compact ? 5 : 6) : 10;
  const fontSize = size === 'sm' ? 10 : 11;
  const label = compact ? projectShortCode(project) : project;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-mono tracking-wider uppercase whitespace-nowrap"
      title={compact ? project : undefined}
      style={{
        padding: `${padY}px ${padX}px`,
        fontSize,
        background: active ? `${color}30` : `${color}12`,
        border: `1px solid ${active ? color : `${color}55`}`,
        color: active ? '#ffffff' : `${color}`,
        boxShadow: active ? `0 0 10px ${color}60` : 'none',
        textShadow: active ? `0 0 6px ${color}` : 'none',
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{
          width: 6,
          height: 6,
          background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: active ? 'pulse-glow 1.6s infinite' : 'none',
        }}
      />
      {label}
    </span>
  );
}
