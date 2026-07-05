/**
 * JWT_SECRET Validation Tests
 * 
 * Tests that JWT_SECRET fail-fast validation works correctly.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { loadConfig, validateJwtSecret, validateMediaTokenSecret } from '../index'

const originalEnv = process.env

describe('JWT_SECRET validation', () => {
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

describe('MEDIA_TOKEN_SECRET validation', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws error when MEDIA_TOKEN_SECRET is missing', () => {
    delete process.env.MEDIA_TOKEN_SECRET

    expect(() => {
      validateMediaTokenSecret()
    }).toThrow(/MEDIA_TOKEN_SECRET.*required/i)
  })

  it('throws error when MEDIA_TOKEN_SECRET is too short', () => {
    process.env.MEDIA_TOKEN_SECRET = 'short'

    expect(() => {
      validateMediaTokenSecret()
    }).toThrow(/MEDIA_TOKEN_SECRET.*at least 32 characters/i)
  })

  it('passes validation with exactly 32 characters', () => {
    process.env.MEDIA_TOKEN_SECRET = 'm'.repeat(32)

    expect(() => {
      validateMediaTokenSecret()
    }).not.toThrow()
  })
})

describe('loadConfig boundary parsing', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'j'.repeat(32),
      MEDIA_TOKEN_SECRET: 'm'.repeat(32),
      NODE_ENV: 'test',
    }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects unsupported NODE_ENV values', () => {
    process.env.NODE_ENV = 'staging'

    expect(() => {
      loadConfig()
    }).toThrow(/NODE_ENV.*development.*production.*test/)
  })

  it('rejects unsupported MINIMAX_REGION values', () => {
    process.env.MINIMAX_REGION = 'edge'

    expect(() => {
      loadConfig()
    }).toThrow(/MINIMAX_REGION.*domestic.*international/)
  })

  it('rejects unsupported LOG_LEVEL values', () => {
    process.env.LOG_LEVEL = 'trace'

    expect(() => {
      loadConfig()
    }).toThrow(/LOG_LEVEL.*debug.*info.*warn.*error/)
  })

  it('uses typed defaults for optional enum configuration', () => {
    delete process.env.MINIMAX_REGION
    delete process.env.LOG_LEVEL

    const config = loadConfig()

    expect(config.server.nodeEnv).toBe('test')
    expect(config.minimax.region).toBe('international')
    expect(config.logging.level).toBe('info')
  })
})
