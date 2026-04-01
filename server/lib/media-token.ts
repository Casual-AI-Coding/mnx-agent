import { createHash, randomBytes } from 'crypto'

const MEDIA_TOKEN_SECRET = process.env.JWT_SECRET || 'fallback-secret'
const TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

interface MediaToken {
  mediaId: string
  userId: string
  expiresAt: number
}

export function generateMediaToken(mediaId: string, userId: string): string {
  const payload: MediaToken = {
    mediaId,
    userId,
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  }
  const data = JSON.stringify(payload)
  const signature = createHash('sha256')
    .update(data + MEDIA_TOKEN_SECRET)
    .digest('hex')
    .slice(0, 32)
  
  const token = Buffer.from(data).toString('base64url')
  return `${token}.${signature}`
}

export function verifyMediaToken(token: string): { valid: boolean; mediaId?: string; userId?: string; error?: string } {
  try {
    const [dataB64, signature] = token.split('.')
    if (!dataB64 || !signature) {
      return { valid: false, error: 'Invalid token format' }
    }

    const data = Buffer.from(dataB64, 'base64url').toString()
    const expectedSignature = createHash('sha256')
      .update(data + MEDIA_TOKEN_SECRET)
      .digest('hex')
      .slice(0, 32)

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' }
    }

    const payload: MediaToken = JSON.parse(data)

    if (payload.expiresAt < Date.now()) {
      return { valid: false, error: 'Token expired' }
    }

    return { valid: true, mediaId: payload.mediaId, userId: payload.userId }
  } catch {
    return { valid: false, error: 'Invalid token' }
  }
}