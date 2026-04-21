import { useEffect, useRef, useState } from 'react';
import type { LogLine } from '../types';
import { ProjectChip, projectColor } from './ProjectChip';

interface Props {
  lines: readonly LogLine[];
  multiProject: boolean;
  /** Width in pixels when expanded. */
  width: number;
  /** User toggled collapse state. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Called while the user drags the resize handle. Expects the NEW width in px. */
  onResize: (nextWidth: number) => void;
}

const MIN_WIDTH = 260;
const MAX_WIDTH = 720;
const COLLAPSED_WIDTH = 44;

export function LiveFeed({
  lines,
  multiProject,
  width,
  collapsed,
  onToggleCollapsed,
  onResize,
}: Props) {
  // Drag-to-resize handle. We pin the grab offset so the right edge stays put.
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!dragging.current) return;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Dragging LEFT grows the feed (right-docked panel), so invert dx.
      const dx = startX.current - e.clientX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + dx));
      onResize(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  });

  const startDrag = (e: React.MouseEvent) => {
    if (collapsed) return;
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const renderedWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <div
      className="relative flex flex-col rounded-lg border bg-ink-900/70 backdrop-blur-sm overflow-hidden min-h-0 flex-shrink-0"
      style={{
        width: renderedWidth,
        borderColor: '#00f5ff33',
        boxShadow: 'inset 0 0 40px rgba(0,245,255,0.05)',
        transition: dragging.current ? 'none' : 'width 220ms ease',
      }}
    >
      {/* Resize handle — docked on the left edge. Only active when expanded. */}
      {!collapsed && (
        <div
          onMouseDown={startDrag}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          title="Drag to resize"
          className="absolute top-0 bottom-0 left-0 z-20"
          style={{
            width: 6,
            cursor: 'ew-resize',
            background: hovering || dragging.current ? '#00f5ff55' : 'transparent',
            boxShadow: hovering || dragging.current ? '0 0 8px #00f5ff' : 'none',
            transition: 'background 160ms, box-shadow 160ms',
          }}
        />
      )}

      <div
        className="px-4 py-2 border-b flex items-center justify-between gap-2"
        style={{ borderColor: '#00f5ff33' }}
      >
        {!collapsed && (
          <>
            <span
              className="font-display text-xs tracking-[0.3em] font-bold"
              style={{ color: '#00f5ff', textShadow: '0 0 8px #00f5ff' }}
            >
              LIVE FEED
            </span>
            <div className="flex items-center gap-2">
              <span
                className="font-mono text-[0.65rem] tracking-widest"
                style={{ color: '#9ca3af' }}
              >
                {lines.length.toString().padStart(3, '0')}
              </span>
              <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />
            </div>
          </>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full">
            <CollapseButton collapsed={collapsed} onClick={onToggleCollapsed} />
          </div>
        )}
      </div>

      {/* Body — hidden while collapsed. */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 font-mono text-xs min-h-0">
          {lines.length === 0 && (
            <div className="italic px-1" style={{ color: '#6b7280' }}>
              Awaiting telemetry… start a Claude Code session in a watched project.
            </div>
          )}
          {lines.map((line, idx) => {
            const isLatest = idx === lines.length - 1;
            const distance = lines.length - 1 - idx;
            const opacity = isLatest ? 1 : Math.max(0.45, 1 - distance * 0.03);
            const color = projectColor(line.project);
            return (
              <div
                key={`${idx}-${line.ts}-${line.message}`}
                className="flex items-baseline gap-2 leading-tight"
                style={{ opacity }}
              >
                <span className="tabular-nums" style={{ color: `${color}DD` }}>
                  {line.ts}
                </span>
                {multiProject && (
                  <span className="flex-shrink-0">
                    <ProjectChip project={line.project} size="sm" compact />
                  </span>
                )}
                <span
                  className="break-words whitespace-pre-wrap"
                  style={{ color: isLatest ? '#f5f5ff' : '#d1d5db' }}
                >
                  {line.message}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsed rail — tiny vertical strip showing a heartbeat dot and a label. */}
      {collapsed && (
        <div className="flex-1 flex flex-col items-center justify-start gap-3 pt-3 pb-2 min-h-0">
          <span
            className="font-display text-[0.55rem] tracking-[0.4em]"
            style={{
              color: '#00f5ff',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              textShadow: '0 0 6px #00f5ff',
            }}
          >
            FEED
          </span>
          <span className="font-mono text-[0.6rem]" style={{ color: '#9ca3af' }}>
            {lines.length.toString().padStart(3, '0')}
          </span>
          <span
            className="inline-block rounded-full mt-1"
            style={{
              width: 6,
              height: 6,
              background: '#00f5ff',
              boxShadow: '0 0 6px #00f5ff',
              animation: 'pulse-glow 1.6s infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}

function CollapseButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? 'Expand live feed' : 'Collapse live feed'}
      className="inline-flex items-center justify-center rounded border transition-all"
      style={{
        width: 24,
        height: 20,
        fontSize: 11,
        lineHeight: 1,
        background: '#00f5ff10',
        borderColor: '#00f5ff55',
        color: '#a5f3fc',
      }}
    >
      {collapsed ? '‹' : '›'}
    </button>
  );
}
