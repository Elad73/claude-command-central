import type { Phase } from '../types';

interface Props {
  phase: Phase;
  color: string;
}

/**
 * Phase identity surface:
 *   - Tiled wallpaper of tiny icons (background fill — makes the empty room
 *     immediately "feel" like the BUILD BAY / QA LAB / etc.)
 *   - Large feature emblem in the bottom-right (anchor motif)
 * Low opacity everywhere so agents sit in front cleanly.
 */
export function RoomGlyph({ phase, color }: Props) {
  const patternId = `tile-${phase.toLowerCase()}`;
  const tileSize = 56;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Tiled wallpaper */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.12, color }}
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width={tileSize}
            height={tileSize}
            patternUnits="userSpaceOnUse"
          >
            <g transform="translate(4 4) scale(0.48)">
              {GLYPHS[phase](color)}
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Large feature emblem (bottom-right anchor) */}
      <div
        className="absolute bottom-5 right-5"
        style={{ opacity: 0.3, color }}
      >
        <svg
          width={140}
          height={140}
          viewBox="0 0 100 100"
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        >
          {GLYPHS[phase](color)}
        </svg>
      </div>
    </div>
  );
}

const GLYPHS: Record<Phase, (color: string) => React.ReactNode> = {
  // PROMPT — inbox tray with incoming messages
  PROMPT: (color) => (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <rect x={18} y={50} width={64} height={32} rx={3} />
      <path d="M 18 50 L 32 30 L 68 30 L 82 50" />
      <path d="M 32 30 L 32 50 L 68 50 L 68 30" />
      <line x1={28} y1={62} x2={72} y2={62} strokeDasharray="4 3" />
      <line x1={32} y1={70} x2={68} y2={70} strokeDasharray="4 3" />
      <path d="M 36 22 L 36 14 M 50 22 L 50 8 M 64 22 L 64 14" strokeWidth={1.5} />
    </g>
  ),

  // PLAN — node graph / flowchart
  PLAN: (color) => (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <circle cx={20} cy={24} r={7} />
      <circle cx={80} cy={24} r={7} />
      <circle cx={50} cy={50} r={7} />
      <circle cx={20} cy={78} r={7} />
      <circle cx={80} cy={78} r={7} />
      <line x1={25} y1={28} x2={45} y2={46} />
      <line x1={75} y1={28} x2={55} y2={46} />
      <line x1={45} y1={54} x2={25} y2={74} />
      <line x1={55} y1={54} x2={75} y2={74} />
      <line x1={27} y1={78} x2={73} y2={78} strokeDasharray="3 3" />
    </g>
  ),

  // BUILD — gear and wrench, in motion
  BUILD: (color) => (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <g transform="translate(35 35)">
        <path d="M 0 -22 L 6 -22 L 6 -16 L 0 -16 Z M 0 22 L 6 22 L 6 16 L 0 16 Z M 22 0 L 22 6 L 16 6 L 16 0 Z M -22 0 L -22 6 L -16 6 L -16 0 Z" transform="translate(3 3)" />
        <circle cx={3} cy={3} r={15} />
        <circle cx={3} cy={3} r={5} />
      </g>
      <g transform="translate(55 55) rotate(45)">
        <path d="M 0 0 L 30 0 L 36 4 L 36 10 L 30 14 L 0 14 Z" />
        <circle cx={4} cy={7} r={4} />
      </g>
      <line x1={70} y1={18} x2={76} y2={12} strokeWidth={1.5} />
      <line x1={80} y1={20} x2={86} y2={14} strokeWidth={1.5} />
      <line x1={75} y1={28} x2={83} y2={24} strokeWidth={1.5} />
    </g>
  ),

  // REVIEW — magnifying glass over checklist
  REVIEW: (color) => (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <rect x={15} y={20} width={50} height={60} rx={3} />
      <path d="M 22 32 L 26 36 L 32 28" strokeWidth={2.2} />
      <line x1={38} y1={32} x2={58} y2={32} />
      <path d="M 22 48 L 26 52 L 32 44" strokeWidth={2.2} />
      <line x1={38} y1={48} x2={58} y2={48} />
      <line x1={22} y1={64} x2={58} y2={64} strokeDasharray="3 3" />
      <g transform="translate(60 60)">
        <circle cx={0} cy={0} r={16} strokeWidth={2.4} />
        <line x1={12} y1={12} x2={22} y2={22} strokeWidth={3} />
        <circle cx={0} cy={0} r={9} opacity={0.5} strokeDasharray="2 2" />
      </g>
    </g>
  ),

  // TEST — flask / beaker with bubbles
  TEST: (color) => (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M 40 15 L 40 38 L 24 74 Q 22 82 30 82 L 70 82 Q 78 82 76 74 L 60 38 L 60 15 Z" />
      <line x1={36} y1={15} x2={64} y2={15} strokeWidth={3} />
      <path d="M 30 62 Q 50 56 70 62 L 74 74 Q 72 80 67 80 L 33 80 Q 28 80 26 74 Z" fillOpacity={0.25} fill={color} />
      <circle cx={46} cy={68} r={2} fill={color} fillOpacity={0.6} />
      <circle cx={56} cy={72} r={1.5} fill={color} fillOpacity={0.6} />
      <circle cx={50} cy={76} r={1.3} fill={color} fillOpacity={0.6} />
      <path d="M 44 8 Q 46 4 44 0 Q 42 -4 44 -8" strokeWidth={1.5} opacity={0.7} />
      <path d="M 50 6 Q 52 2 50 -2 Q 48 -6 50 -10" strokeWidth={1.5} opacity={0.7} />
      <path d="M 56 8 Q 58 4 56 0 Q 54 -4 56 -8" strokeWidth={1.5} opacity={0.7} />
    </g>
  ),

  // DEPLOY — rocket launching with thrust
  DEPLOY: (color) => (
    <g fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <path d="M 50 10 Q 58 22 58 38 L 58 68 L 42 68 L 42 38 Q 42 22 50 10 Z" />
      <circle cx={50} cy={36} r={5} />
      <circle cx={50} cy={36} r={2} fill={color} fillOpacity={0.6} />
      <path d="M 42 55 L 32 72 L 42 68 Z" fill={color} fillOpacity={0.3} />
      <path d="M 58 55 L 68 72 L 58 68 Z" fill={color} fillOpacity={0.3} />
      <path d="M 44 70 Q 42 80 46 88 Q 48 82 50 88 Q 52 82 54 88 Q 58 80 56 70" fill={color} fillOpacity={0.35} strokeWidth={1.5} />
      <line x1={20} y1={92} x2={80} y2={92} />
      <path d="M 18 22 L 20 22 M 19 21 L 19 23" strokeWidth={1.5} />
      <path d="M 82 30 L 84 30 M 83 29 L 83 31" strokeWidth={1.5} />
      <path d="M 12 50 L 14 50 M 13 49 L 13 51" strokeWidth={1.5} />
    </g>
  ),
};
