import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useMediaQuery } from './useMediaQuery'

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia')

afterEach(() => {
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalMatchMedia)
  } else {
    Reflect.deleteProperty(window, 'matchMedia')
  }
})

describe('useMediaQuery', () => {
  it('returns false without throwing when matchMedia is unavailable', () => {
    Reflect.deleteProperty(window, 'matchMedia')

    expect(() => renderHook(() => useMediaQuery('(min-width: 1024px)'))).not.toThrow()
  })
})
