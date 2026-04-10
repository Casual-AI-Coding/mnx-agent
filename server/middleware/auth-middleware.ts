import { Request, Response, NextFunction } from 'express'
import '../types/express.d.ts'
import { UserService, TokenPayload, RefreshTokenPayload } from '../services/user-service.js'

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  // Query parameter tokens rejected per RFC 6750 security recommendations:
  // - Leaks via server logs, browser history, Referer headers, CDN logs
  // - Authorization header provides better security isolation

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Access token required in Authorization header (Bearer scheme)',
    })
    return
  }

  const token = authHeader.slice(7)

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