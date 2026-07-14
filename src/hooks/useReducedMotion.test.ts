import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useReducedMotion } from './useReducedMotion'

describe('useReducedMotion', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void>

  beforeEach(() => {
    listeners = []
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: (e: MediaQueryListEvent) => void) => {
          listeners.push(listener)
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('returns true when prefers-reduced-motion is reduce', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('returns false when prefers-reduced-motion is no-preference', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('responds to media query changes', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)

    act(() => {
      listeners.forEach(fn => fn({ matches: false, media: '' } as unknown as MediaQueryListEvent))
    })

    expect(result.current).toBe(false)

    act(() => {
      listeners.forEach(fn => fn({ matches: true, media: '' } as unknown as MediaQueryListEvent))
    })

    expect(result.current).toBe(true)
  })
})