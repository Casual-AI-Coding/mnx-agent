import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
export const ENCRYPTION_PREFIX = 'enc:'

function getEncryptionKey(): Buffer {
  const keyHex = process.env.SETTINGS_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'SETTINGS_ENCRYPTION_KEY 必须为 64 字符的 hex 字符串（32 字节）'
    )
  }
  return Buffer.from(keyHex, 'hex')
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext
  if (plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return ciphertext
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) return ciphertext

  const payload = ciphertext.slice(ENCRYPTION_PREFIX.length)
  const parts = payload.split(':')
  if (parts.length !== 3) {
    throw new Error('无效的加密数据格式：缺少 nonce/ciphertext/authTag')
  }

  const [ivB64, encrypted, authTagB64] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTION_PREFIX)
}

export function isEncryptionAvailable(): boolean {
  const keyHex = process.env.SETTINGS_ENCRYPTION_KEY
  return !!keyHex && keyHex.length === 64
}
