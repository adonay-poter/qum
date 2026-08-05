import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

interface AiValidationLoaderProps {
  mode: 'text' | 'image';
}

export function AiValidationLoader({ mode }: AiValidationLoaderProps) {
  const [breathPhase, setBreathPhase] = useState<'INHALE' | 'EXHALE'>('INHALE');
  const [breathTime, setBreathTime] = useState(4.0);
  const [statusIndex, setStatusIndex] = useState(0);

  // Streamlined, human-friendly validation stages
  const statuses = useMemo(() => {
    if (mode === 'text') {
      return [
        'Preparing your reflection buffer...',
        'Running quick local readability preflights...',
        'Connecting securely to our AI validation node...',
        'Spawning semantic analyzer (Gemma-2)...',
        'Reflecting on the honest effort in your answer...',
        'Verifying cognitive depth and sincerity...',
        'Applying final signature to your validation...',
      ];
    } else {
      return [
        'Loading visual proof canvas...',
        'Evaluating local image clarity and detail...',
        'Connecting securely to our AI validation node...',
        'Spawning vision reasoning engine (Gemma-3)...',
        'Reviewing proof compliance in your capture...',
        'Verifying authentic cognitive work...',
        'Applying final signature to your validation...',
      ];
    }
  }, [mode]);

  // Sync Breathing Surf Guide (4s Inhale, 6s Exhale)
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000) % 10.0;
      if (elapsed < 4.0) {
        setBreathPhase('INHALE');
        setBreathTime(4.0 - elapsed);
      } else {
        setBreathPhase('EXHALE');
        setBreathTime(10.0 - elapsed);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Gently progress the single-line status message
  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((prev) => {
        if (prev < statuses.length - 1) {
          haptic.light();
          return prev + 1;
        }
        return prev;
      });
    }, 1400);

    return () => clearInterval(timer);
  }, [statuses.length]);

  return (
    <div className="mt-qum-lg flex flex-col items-center justify-center text-center font-mono gap-8">
      {/* 1. Calm Hero Breathing Surf Guide */}
      <div className="flex flex-col items-center gap-4">
        {/* Expanding Breathing Box */}
        <div className="relative flex h-24 w-24 items-center justify-center border border-secondary/20 bg-surface">
          <motion.div
            animate={{
              scale: breathPhase === 'INHALE' ? 1.7 : 0.85,
            }}
            transition={{
              duration: breathPhase === 'INHALE' ? 4.0 : 6.0,
              ease: 'easeInOut',
            }}
            className="h-10 w-10 bg-tertiary"
          />
          {/* Central Amharic Qum Glyph Overlay */}
          <span className="absolute text-xs uppercase tracking-widest text-on-primary font-bold">
            ቁም
          </span>
        </div>

        {/* Breathing cue text */}
        <div className="space-y-1">
          <span className="text-[0.7rem] uppercase tracking-widest text-tertiary font-bold">
            BREATH SURF ANCHOR
          </span>
          <h3 className="text-h1 text-primary font-bold">
            {breathPhase} · {breathTime.toFixed(1)}s
          </h3>
        </div>
      </div>

      {/* 2. Simplified Status Box */}
      <div className="w-full max-w-xs border border-secondary/20 bg-surface p-qum-md flex flex-col items-center gap-3">
        {/* Dynamic status line */}
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-tertiary animate-pulse" />
          <span className="text-label text-secondary uppercase tracking-widest">
            AI VALIDATION PROGRESS
          </span>
        </div>

        {/* Gentle sliding fade status animation */}
        <div className="h-12 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="text-[0.8rem] text-primary leading-relaxed px-2"
            >
              {statuses[statusIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Clean progress bar */}
        <div className="w-full h-[2px] bg-secondary/10 mt-1 relative overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{
              width: `${((statusIndex + 1) / statuses.length) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute h-full bg-tertiary"
          />
        </div>
      </div>

      {/* Centering context footnote */}
      <p className="max-w-xs text-[0.72rem] leading-relaxed text-secondary/60">
        Ride the urge wave. Urges peak and fade like ocean waves. Breathe slow to relax your nervous system.
      </p>
    </div>
  );
}
