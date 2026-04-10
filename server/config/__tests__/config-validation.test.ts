/**
 * JWT_SECRET Validation Tests
 * 
 * Tests that JWT_SECRET fail-fast validation works correctly.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { validateJwtSecret } from '../index'

describe('JWT_SECRET validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('when JWT_SECRET is missing', () => {
    it('throws error with helpful message', () => {
      delete process.env.JWT_SECRET
      
      expect(() => {
        validateJwtSecret()
      }).toThrow(/JWT_SECRET.*required/i)
    })

    it('provides generation command in error message', () => {
      delete process.env.JWT_SECRET
      
      expect(() => {
        validateJwtSecret()
      }).toThrow(/node -e.*randomBytes/)
    })
  })

  describe('when JWT_SECRET is too short', () => {
    it('throws error when JWT_SECRET < 32 characters', () => {
      process.env.JWT_SECRET = 'too-short-secret'
      
      expect(() => {
        validateJwtSecret()
      }).toThrow(/JWT_SECRET.*at least 32 characters/i)
    })

    it('includes actual length in error message', () => {
      process.env.JWT_SECRET = 'short'
      
      expect(() => {
        validateJwtSecret()
      }).toThrow(/got \d+/)
    })

    it('throws error for exactly 31 characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(31)
      
      expect(() => {
        validateJwtSecret()
      }).toThrow(/at least 32 characters/)
    })
  })

  describe('when JWT_SECRET is valid', () => {
    it('passes validation with exactly 32 characters', () => {
      process.env.JWT_SECRET = 'a'.repeat(32)
      
      expect(() => {
        validateJwtSecret()
      }).not.toThrow()
    })

    it('passes validation with long secret', () => {
      process.env.JWT_SECRET = 'very-long-and-secure-secret-that-is-definitely-more-than-32-chars'
      
      expect(() => {
        validateJwtSecret()
      }).not.toThrow()
    })
  })
})
