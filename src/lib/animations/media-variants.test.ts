import { describe, it, expect } from 'vitest'
import {
  getRandomFlyInDirection,
  gridContainerVariants,
  cardVariants,
} from './media-variants'

describe('getRandomFlyInDirection', () => {
  it('should return object with startX and startY', () => {
    const result = getRandomFlyInDirection()
    expect(result).toHaveProperty('startX')
    expect(result).toHaveProperty('startY')
    expect(typeof result.startX).toBe('number')
    expect(typeof result.startY).toBe('number')
  })

  it('should generate positive startY values (below viewport)', () => {
    const result = getRandomFlyInDirection()
    expect(result.startY).toBeGreaterThan(0)
  })

  it('should generate startX within expected range', () => {
    const result = getRandomFlyInDirection()
    expect(Math.abs(result.startX)).toBeGreaterThanOrEqual(0)
    expect(Math.abs(result.startX)).toBeLessThanOrEqual(80)
  })
})

describe('gridContainerVariants', () => {
  it('should have correct structure', () => {
    expect(gridContainerVariants).toHaveProperty('hidden')
    expect(gridContainerVariants).toHaveProperty('visible')
  })

  it('should have staggerChildren in visible transition', () => {
    const visible = gridContainerVariants.visible as { transition: { staggerChildren: number } }
    expect(visible.transition.staggerChildren).toBe(0.06)
  })
})

describe('cardVariants', () => {
  it('should have hidden, visible, and exit states', () => {
    expect(cardVariants).toHaveProperty('hidden')
    expect(cardVariants).toHaveProperty('visible')
    expect(cardVariants).toHaveProperty('exit')
  })

  it('visible state should use spring transition', () => {
    const visible = cardVariants.visible as { transition: { type: string; stiffness: number } }
    expect(visible.transition.type).toBe('spring')
    expect(visible.transition.stiffness).toBe(120)
  })
})
