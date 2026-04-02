import { Request, Response, NextFunction } from 'express'
import '../types/express.d.ts'
import { UserService, TokenPayload, RefreshTokenPayload } from '../services/user-service.js'

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const queryToken = req.query.token as string | undefined

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken

  if (!token) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  const payload = UserService.verifyToken(token)
  if (!payload) {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' })
    return
  }

  if (isRefreshToken(payload)) {
    res.status(401).json({ success: false, error: '认证令牌类型错误' })
    return
  }

  req.user = payload
  next()
}

function isRefreshToken(payload: TokenPayload): boolean {
  return (payload as RefreshTokenPayload).type === 'refresh'
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' })
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' })
      return
    }

    next()
  }
}