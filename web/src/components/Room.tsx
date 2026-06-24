import { ROOM_BY_PHASE, type AgentState, type Phase } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { RoomGlyph } from './RoomGlyph';
import { SceneHost } from './scenes/SceneHost';

interface Props {
  phase: Phase;
  agents: AgentState[];
}

const MAX_VISIBLE = 4;

export function Room({ phase, agents }: Props) {
  const { phaseHex } = useTheme();
  const color = phaseHex[phase];
  // Lamps / border glow track *live* work only. Resting agents (done/idle)
  // stay visible as a record, but the room visibly powers down once nobody's
  // actively doing anything here.
  const liveCount = agents.filter(
    (a) => a.status === 'active' || a.status === 'running',
  ).length;
  const occupied = liveCount > 0;
  const label = ROOM_BY_PHASE[phase];
  const visible = agents.slice(0, MAX_VISIBLE);
  const overflow = agents.length - visible.length;

  return (
    <div
      className="relative rounded-lg border bg-ink-900/60 backdrop-blur-sm overflow-hidden"
      style={{
        borderColor: occupied ? color : `${color}3A`,
        boxShadow: occupied
          ? `inset 0 0 60px ${color}14, 0 0 20px ${color}2A`
          : `inset 0 0 28px ${color}08`,
      }}
    >
      <CornerLights color={color} occupied={occupied} />

      {/* Phase-specific scenery glyph — tiled wallpaper behind the scene */}
      <RoomGlyph phase={phase} color={color} />

      {/* Header */}
      <div className="absolute top-2 left-4 right-4 flex justify-between items-center z-10">
        <span
          className="font-display text-sm tracking-[0.3em] font-bold"
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {label}
        </span>
        <span
          className="font-mono text-[0.7rem] tracking-widest font-bold"
          style={{ color: occupied ? color : `${color}AA` }}
        >
          {phase} // {agents.length.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Floor grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${color}66 1px, transparent 1px), linear-gradient(90deg, ${color}66 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          backgroundPosition: 'center',
          mask: 'linear-gradient(to bottom, transparent 0%, black 30%, black 100%)',
          WebkitMask: 'linear-gradient(to bottom, transparent 0%, black 30%, black 100%)',
        }}
      />

      {/* Phase-specific theatrical scene */}
      <SceneHost phase={phase} agents={visible} color={color} />

      {overflow > 0 && (
        <div
          className="absolute bottom-2 right-3 font-mono text-[0.7rem] tracking-widest z-10"
          style={{ color: `${color}DD` }}
        >
          +{overflow} more
        </div>
      )}
    </div>
  );
}

/**
 * Four corner lights that clearly illuminate when the room is occupied
 * and fade to a dim ember when empty.
 */
function CornerLights({ color, occupied }: { color: string; occupied: boolean }) {
  const corners: Array<'tl' | 'tr' | 'bl' | 'br'> = ['tl', 'tr', 'bl', 'br'];
  return (
    <>
      {corners.map((pos, i) => (
        <CornerLight key={pos} pos={pos} color={color} occupied={occupied} delayMs={i * 180} />
      ))}
    </>
  );
}

function CornerLight({
  pos,
  color,
  occupied,
  delayMs,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br';
  color: string;
  occupied: boolean;
  delayMs: number;
}) {
  const bracketSize = 18;
  const thick = 2;
  const lampSize = 8;
  const inset = 6;

  const bracket = {
    tl: { top: 0, left: 0, borderTop: `${thick}px solid`, borderLeft: `${thick}px solid` },
    tr: { top: 0, right: 0, borderTop: `${thick}px solid`, borderRight: `${thick}px solid` },
    bl: { bottom: 0, left: 0, borderBottom: `${thick}px solid`, borderLeft: `${thick}px solid` },
    br: { bottom: 0, right: 0, borderBottom: `${thick}px solid`, borderRight: `${thick}px solid` },
  }[pos];

  const lamp = {
    tl: { top: inset, left: inset },
    tr: { top: inset, right: inset },
    bl: { bottom: inset, left: inset },
    br: { bottom: inset, right: inset },
  }[pos];

  return (
    <>
      <div
        className="absolute pointer-events-none z-10"
        style={{
          ...bracket,
          width: bracketSize,
          height: bracketSize,
          borderColor: color,
          boxShadow: occupied ? `0 0 14px ${color}` : 'none',
          opacity: occupied ? 1 : 0.45,
          transition: 'opacity 400ms ease, box-shadow 400ms ease',
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full z-10"
        style={{
          ...lamp,
          width: lampSize,
          height: lampSize,
          background: occupied ? color : 'transparent',
          border: `1px solid ${occupied ? color : `${color}55`}`,
          boxShadow: occupied
            ? `0 0 10px ${color}, 0 0 20px ${color}AA, inset 0 0 4px #ffffffAA`
            : 'none',
          opacity: occupied ? 1 : 0.35,
          animation: occupied ? 'lamp-pulse 2.4s ease-in-out infinite' : 'none',
          animationDelay: `${delayMs}ms`,
          transition: 'opacity 400ms ease',
        }}
      />
    </>
  );
}
