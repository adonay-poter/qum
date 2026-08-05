import type { Transition, Variants } from 'framer-motion';

export const easeOut = [0.22, 1, 0.36, 1] as const;

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
};

export const tweenFast: Transition = {
  duration: 0.32,
  ease: easeOut,
};

export const tweenMedium: Transition = {
  duration: 0.4,
  ease: easeOut,
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: tweenMedium,
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.24, ease: easeOut },
  },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tweenFast },
  exit: { opacity: 0, transition: { duration: 0.2, ease: easeOut } },
};

export function slideX(direction: 1 | -1): Variants {
  return {
    initial: { opacity: 0, x: direction * 32 },
    animate: {
      opacity: 1,
      x: 0,
      transition: tweenMedium,
    },
    exit: {
      opacity: 0,
      x: direction * -24,
      transition: { duration: 0.26, ease: easeOut },
    },
  };
}

export const waveScreen: Variants = {
  initial: { opacity: 0, scale: 0.97, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOut },
  },
  exit: {
    opacity: 0,
    scale: 1.01,
    y: -6,
    transition: { duration: 0.28, ease: easeOut },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: tweenFast,
  },
};

export const scalePop: Variants = {
  initial: { opacity: 0, scale: 0.88 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springSnappy,
  },
};
