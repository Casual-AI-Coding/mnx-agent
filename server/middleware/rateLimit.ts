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