import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: '请求次数过多，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
})