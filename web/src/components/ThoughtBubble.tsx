import { motion } from 'framer-motion';

interface Props {
  text: string;
  color: string;
  maxWidth?: number;
}

export function ThoughtBubble({ text, color, maxWidth = 220 }: Props) {
  if (!text) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ maxWidth }}
      className="relative px-3 py-2 rounded-md font-mono text-[11px] leading-tight"
    >
      <div
        className="relative"
        style={{
          background: `linear-gradient(180deg, ${color}26, ${color}10)`,
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '6px 10px',
          color: '#f5f5ff',
          boxShadow: `0 0 12px ${color}55, inset 0 0 8px ${color}22`,
          textShadow: `0 0 6px ${color}`,
        }}
      >
        <div className="line-clamp-3 break-words">{text}</div>
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -6,
            width: 10,
            height: 10,
            background: `linear-gradient(135deg, transparent 50%, ${color}10 50%)`,
            border: `1px solid ${color}`,
            borderTop: 'none',
            borderLeft: 'none',
            transform: 'translateX(-50%) rotate(45deg)',
          }}
        />
      </div>
    </motion.div>
  );
}
