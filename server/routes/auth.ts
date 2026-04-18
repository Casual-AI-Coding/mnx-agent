import { Router, Request } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { validate } from '../middleware/validate.js'
import { authRateLimiter } from '../middleware/rateLimit.js'
import { z } from 'zod'
import { UserService } from '../services/user-service.js'
import { getConnection } from '../database/connection.js'
import { authenticateJWT } from '../middleware/auth-middleware.js'
import { successResponse, errorResponse } from '../middleware/api-response'

const router = Router()

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

const registerSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名不能超过50字符'),
  password: z.string().min(6, '密码至少6位'),
  invitationCode: z.string().min(1, '邀请码不能为空'),
  email: z.string().email('邮箱格式不正确').optional().nullable(),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '原密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位'),
})

const updateProfileSchema = z.object({
  minimax_api_key: z.string().optional().nullable(),
  minimax_region: z.enum(['cn', 'intl']).optional(),
})

router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.login(username, password)

  if (!result.success) {
    errorResponse(res, result.error ?? 'Login failed', 401)
    return
  }

  req.user = { userId: result.user!.id, username: result.user!.username, role: result.user!.role }

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  successResponse(res, {
    user: result.user,
    accessToken: result.accessToken,
  })
}))

router.post('/register', authRateLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { username, password, invitationCode, email } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.register({ username, password, invitationCode, email })

  if (!result.success) {
    errorResponse(res, result.error ?? 'Registration failed', 400)
    return
  }

  const loginResult = await userService.login(username, password)

  req.user = { userId: result.user!.id, username: result.user!.username, role: result.user!.role }

  res.cookie('refreshToken', loginResult.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  successResponse(res, {
    user: result.user,
    accessToken: loginResult.accessToken,
  }, 201)
}))

router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken

  if (!refreshToken) {
    errorResponse(res, '未提供刷新令牌', 401)
    return
  }

  const payload = UserService.verifyRefreshToken(refreshToken)
  if (!payload) {
    errorResponse(res, '刷新令牌无效或已过期', 401)
    return
  }

  const conn = getConnection()
  const userService = new UserService(conn)
  const user = await userService.getUserById(payload.userId)

  if (!user || !user.is_active) {
    errorResponse(res, '用户不存在或已被禁用', 401)
    return
  }

  const newAccessToken = userService.generateAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })
  const newRefreshToken = userService.generateRefreshToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

  successResponse(res, { accessToken: newAccessToken })
}))

router.post('/logout', authenticateJWT, asyncHandler(async (req: Request, res) => {
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  })

  successResponse(res, { message: '已登出' })
}))

router.get('/me', authenticateJWT, asyncHandler(async (req: Request, res) => {
  const conn = getConnection()
  const userService = new UserService(conn)

  const user = await userService.getUserById(req.user!.userId)

  if (!user) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, user)
}))

router.post('/change-password', authRateLimiter, authenticateJWT, validate(changePasswordSchema), asyncHandler(async (req: Request, res) => {
  const { oldPassword, newPassword } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const result = await userService.changePassword(req.user!.userId, oldPassword, newPassword)

  if (!result.success) {
    errorResponse(res, result.error ?? 'Password change failed', 400)
    return
  }

  successResponse(res, { message: '密码已修改' })
}))

router.patch('/me', authenticateJWT, validate(updateProfileSchema), asyncHandler(async (req: Request, res) => {
  const { minimax_api_key, minimax_region } = req.body
  const conn = getConnection()
  const userService = new UserService(conn)

  const user = await userService.updateUser(req.user!.userId, {
    minimax_api_key,
    minimax_region,
  })

  if (!user) {
    errorResponse(res, '用户不存在', 404)
    return
  }

  successResponse(res, user)
}))

export default router