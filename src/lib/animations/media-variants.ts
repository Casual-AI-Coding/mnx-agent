import type { Variants } from 'framer-motion'

/**
 * Generates random fly-in direction for elastic animation
 * Cards start from below viewport and fly in with random horizontal offset
 */
export function getRandomFlyInDirection() {
  const directions = [
    { startX: -80, startY: 100 },
    { startX: -60, startY: 120 },
    { startX: -40, startY: 80 },
    { startX: 0, startY: 100 },
    { startX: 40, startY: 80 },
    { startX: 60, startY: 120 },
    { startX: 80, startY: 100 },
  ]

  return directions[Math.floor(Math.random() * directions.length)]
}

/**
 * Container variants for staggered grid animation
 */
export const gridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
}

/**
 * Card variants for elastic fly-in animation
 */
export const cardVariants: Variants = {
  hidden: ({ startX, startY }: { startX: number; startY: number }) => ({
    opacity: 0,
    scale: 0.8,
    x: startX,
    y: startY,
  }),
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 12,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    transition: {
      duration: 0.2,
    },
  },
}