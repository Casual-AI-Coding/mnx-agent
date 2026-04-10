import { createHash, randomBytes } from 'crypto'

export function getMediaTokenSecret(): string {
  const secret = process.env.MEDIA_TOKEN_SECRET
  
  if (!secret) {
    throw new Error(
      'MEDIA_TOKEN_SECRET environment variable is required. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }
  
  if (secret.length < 32) {
    throw new Error(
      `MEDIA_TOKEN_SECRET must be at least 32 characters (got ${secret.length})`
    )
  }
  
  return secret
}

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
  const secret = getMediaTokenSecret()
  const data = JSON.stringify(payload)
  const signature = createHash('sha256')
    .update(data + secret)
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

    const secret = getMediaTokenSecret()
    const data = Buffer.from(dataB64, 'base64url').toString()
    const expectedSignature = createHash('sha256')
      .update(data + secret)
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
