import rateLimit from 'express-rate-limit'
import { Request } from 'express'

const shouldSkipRateLimit = (req: Request): boolean => {
  const path = req.path
  return path.startsWith('/api/media') || 
         path.startsWith('/api/files') || 
         path.startsWith('/api/cron')
}

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: shouldSkipRateLimit,
  message: {
    success: false,
    error: '请求次数过多，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Stricter rate limiter for authentication endpoints to prevent brute force attacks
// Configurable via environment variables for production flexibility
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10) // 15 minutes default
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10) // 100 attempts default (increased for development)

export const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  message: {
    success: false,
    error: '登录尝试次数过多，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})