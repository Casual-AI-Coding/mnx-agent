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

export const mediaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    error: '上传请求过多，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const cronRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: 'cron 请求过多，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Stricter rate limiter for authentication endpoints to prevent brute force attacks
// Configurable via environment variables for production flexibility
const AUTH_RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10) // 15 minutes default
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10)

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