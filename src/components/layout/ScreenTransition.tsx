import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

interface ScreenTransitionProps {
  children: ReactNode;
  variants: Variants;
  className?: string;
}

export function ScreenTransition({
  children,
  variants,
  className = 'h-full w-full',
}: ScreenTransitionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={
        reduceMotion
          ? {
              initial: { opacity: 0 },
              animate: { opacity: 1, transition: { duration: 0.15 } },
              exit: { opacity: 0, transition: { duration: 0.1 } },
            }
          : variants
      }
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
