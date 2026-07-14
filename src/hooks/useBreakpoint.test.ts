import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useBreakpoint } from './useBreakpoint'

describe('useBreakpoint', () => {
  let currentWidth = 1440

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => {
        const minMatch = query.match(/min-width:\s*(\d+)px/)
        const maxMatch = query.match(/max-width:\s*(\d+)px/)
        let matches = true
        if (minMatch) matches = currentWidth >= parseInt(minMatch[1], 10)
        if (maxMatch) matches = matches && currentWidth <= parseInt(maxMatch[1], 10)
        return {
          matches,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }
      }),
    })
  })

  /**
   * Breakpoint 标签语义（与 BREAKPOINTS 常量对齐）：
   * - 'sm' : < 768px   （手机竖屏 / 小屏移动端）
   * - 'md' : 768-1023px（平板竖屏 / 小笔记本）
   * - 'lg' : 1024-1279px（平板横屏 / 标准桌面）
   * - 'xl' : >= 1280px （宽屏桌面）
   */
  it('returns "sm" at 375px (mobile)', () => {
    currentWidth = 375
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('sm')
  })

  it('returns "sm" at 767px (just below md threshold)', () => {
    currentWidth = 767
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('sm')
  })

  it('returns "md" at 768px (md threshold / tablet portrait)', () => {
    currentWidth = 768
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('md')
  })

  it('returns "md" at 1023px (just below lg threshold)', () => {
    currentWidth = 1023
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('md')
  })

  it('returns "lg" at 1024px (lg threshold / tablet landscape)', () => {
    currentWidth = 1024
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('lg')
  })

  it('returns "lg" at 1279px (just below xl threshold)', () => {
    currentWidth = 1279
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('lg')
  })

  it('returns "xl" at 1280px (xl threshold)', () => {
    currentWidth = 1280
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('xl')
  })

  it('returns "xl" at 1440px (desktop)', () => {
    currentWidth = 1440
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('xl')
  })
})