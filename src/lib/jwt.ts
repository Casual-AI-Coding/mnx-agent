export interface JWTPayload {
  userId: string
  username: string
  role: string
  exp?: number
  iat?: number
}

export function parseJWT(token: string): JWTPayload | null {
  try {
    const [, payloadB64] = token.split('.')
    if (!payloadB64) return null

    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=')

    const json = atob(padded)
    return JSON.parse(json) as JWTPayload
  } catch {
    return null
  }
}

export function parseTokenExpiry(token: string): Date | null {
  const payload = parseJWT(token)
  if (!payload?.exp) return null
  return new Date(payload.exp * 1000)
}

export function getTimeUntilExpiry(token: string): number {
  const expiry = parseTokenExpiry(token)
  if (!expiry) return 0
  return Math.max(0, expiry.getTime() - Date.now())
}

export function calculateRefreshTime(token: string, bufferMs: number = 3 * 60 * 1000): number {
  const timeUntilExpiry = getTimeUntilExpiry(token)
  if (timeUntilExpiry <= 0) return 0
  return Math.max(0, timeUntilExpiry - bufferMs)
}

export function isTokenExpired(token: string): boolean {
  return getTimeUntilExpiry(token) <= 0
}

export function shouldRefreshToken(token: string, bufferMs: number = 3 * 60 * 1000): boolean {
  const timeUntilExpiry = getTimeUntilExpiry(token)
  return timeUntilExpiry > 0 && timeUntilExpiry <= bufferMs
}