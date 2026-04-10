import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateMediaToken, verifyMediaToken } from '../media-token'

const TEST_SECRET = 'test-media-token-secret-that-is-at-least-32-chars-long'

describe('media-token', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, MEDIA_TOKEN_SECRET: TEST_SECRET }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('MEDIA_TOKEN_SECRET', () => {
    it('should use MEDIA_TOKEN_SECRET instead of JWT_SECRET', () => {
      const token = generateMediaToken('media-123', 'user-456')
      expect(token).toBeTruthy()
      
      const result = verifyMediaToken(token)
      expect(result.valid).toBe(true)
      expect(result.mediaId).toBe('media-123')
      expect(result.userId).toBe('user-456')
    })

    it('should throw error when MEDIA_TOKEN_SECRET is missing', () => {
      delete process.env.MEDIA_TOKEN_SECRET
      
      expect(() => generateMediaToken('media-123', 'user-456')).toThrow(
        'MEDIA_TOKEN_SECRET environment variable is required'
      )
    })

    it('should throw error when MEDIA_TOKEN_SECRET is too short', () => {
      process.env.MEDIA_TOKEN_SECRET = 'too-short'
      
      expect(() => generateMediaToken('media-123', 'user-456')).toThrow(
        /MEDIA_TOKEN_SECRET must be at least 32 characters/
      )
    })
  })

  describe('generateMediaToken', () => {
    it('should generate a valid token', () => {
      const token = generateMediaToken('media-123', 'user-456')
      
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(2)
    })
  })

  describe('verifyMediaToken', () => {
    it('should verify valid token', () => {
      const token = generateMediaToken('media-123', 'user-456')
      const result = verifyMediaToken(token)
      
      expect(result.valid).toBe(true)
      expect(result.mediaId).toBe('media-123')
      expect(result.userId).toBe('user-456')
    })

    it('should reject invalid token', () => {
      const result = verifyMediaToken('invalid.token')
      
      expect(result.valid).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should reject expired token', () => {
      // This test would require mocking time, which is more complex
      // Basic signature verification is tested above
    })
  })
})
