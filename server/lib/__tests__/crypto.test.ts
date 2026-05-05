import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt, isEncrypted, isEncryptionAvailable } from '../crypto.js'

describe('crypto', () => {
  const plaintext = 'sk-minimax-api-key-12345'

  beforeAll(() => {
    if (!process.env.SETTINGS_ENCRYPTION_KEY) {
      // 64 字符 hex 密钥（32 字节）
      process.env.SETTINGS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
  })

  describe('encrypt', () => {
    it('应该返回带 enc: 前缀的密文', () => {
      const result = encrypt(plaintext)
      expect(result).toMatch(/^enc:/)
    })

    it('每次加密应产生不同的密文（不同 nonce）', () => {
      const r1 = encrypt(plaintext)
      const r2 = encrypt(plaintext)
      expect(r1).not.toEqual(r2)
    })

    it('空字符串应返回空字符串', () => {
      expect(encrypt('')).toBe('')
    })

    it('已有 enc: 前缀的值不应重复加密', () => {
      const encrypted = encrypt(plaintext)
      const reEncrypted = encrypt(encrypted)
      expect(reEncrypted).toEqual(encrypted)
    })
  })

  describe('decrypt', () => {
    it('应能解密加密的字符串', () => {
      const encrypted = encrypt(plaintext)
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe(plaintext)
    })

    it('不包含 enc: 前缀的值应原样返回', () => {
      expect(decrypt(plaintext)).toBe(plaintext)
      expect(decrypt('')).toBe('')
    })

    it('篡改密文应抛出错误', () => {
      const encrypted = encrypt(plaintext)
      const tampered = encrypted.slice(0, -4) + 'abcd'
      expect(() => decrypt(tampered)).toThrow()
    })

    it('密文格式错误应抛出错误', () => {
      expect(() => decrypt('enc:invalid_format')).toThrow()
    })
  })

  describe('isEncrypted', () => {
    it('enc: 前缀的值返回 true', () => {
      expect(isEncrypted('enc:abc')).toBe(true)
    })

    it('无 enc: 前缀的值返回 false', () => {
      expect(isEncrypted('plaintext')).toBe(false)
      expect(isEncrypted('')).toBe(false)
    })
  })

  describe('isEncryptionAvailable', () => {
    it('密钥存在时应返回 true', () => {
      expect(isEncryptionAvailable()).toBe(true)
    })
  })
})
