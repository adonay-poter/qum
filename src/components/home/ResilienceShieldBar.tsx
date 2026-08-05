import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const GAP_PX = 3;
const MIN_SEGMENTS = 12;
const MAX_SEGMENTS = 24;
const MIN_CELL_PX = 9;

type SegmentState = 'completed' | 'active' | 'remaining';

function getSegmentState(value: number, index: number, segmentCount: number): SegmentState {
  const segmentSize = 100 / segmentCount;
  const start = index * segmentSize;
  const end = (index + 1) * segmentSize;

  if (value >= end) return 'completed';
  if (value >= start && value < end) return 'active';
  return 'remaining';
}

const SEGMENT_STYLES: Record<SegmentState, string> = {
  completed: 'bg-primary',
  active: 'bg-tertiary',
  remaining: 'bg-secondary/30',
};

function segmentCountForWidth(widthPx: number): number {
  const count = Math.floor((widthPx + GAP_PX) / (MIN_CELL_PX + GAP_PX));
  return Math.max(MIN_SEGMENTS, Math.min(MAX_SEGMENTS, count));
}

interface ResilienceShieldBarProps {
  value: number | null;
}

export function ResilienceShieldBar({ value }: ResilienceShieldBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [segmentCount, setSegmentCount] = useState(20);
  const [cellSize, setCellSize] = useState(12);

  const resilience = value === null ? 0 : Math.round(Math.min(100, Math.max(0, value)));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const width = el.clientWidth;
      const count = segmentCountForWidth(width);
      const totalGap = GAP_PX * (count - 1);
      const size = Math.max(MIN_CELL_PX, Math.floor((width - totalGap) / count));
      setSegmentCount(count);
      setCellSize(size);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="mt-2 w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      role="progressbar"
      aria-valuenow={resilience}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Resilience shield"
    >
      <div
        className="flex w-full"
        style={{ gap: GAP_PX }}
      >
        {Array.from({ length: segmentCount }, (_, index) => {
          const state = value === null ? 'remaining' : getSegmentState(resilience, index, segmentCount);
          return (
            <motion.div
              key={`${segmentCount}-${index}`}
              className={`shrink-0 ${SEGMENT_STYLES[state]}`}
              style={{ width: cellSize, height: cellSize }}
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: index * 0.012 }}
              title={state === 'active' ? `Current: ${resilience}` : undefined}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
