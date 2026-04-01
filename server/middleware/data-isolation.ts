import { Request } from 'express'
import { UserRole } from '../database/types.js'

interface AuthUser {
  userId: string
  username: string
  role: UserRole
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function buildOwnerFilter(req: Request): { whereClause: string; params: string[] } {
  const user = req.user
  if (!user) return { whereClause: '', params: [] }

  if (user.role === 'admin' || user.role === 'super') {
    return { whereClause: '', params: [] }
  }

  return {
    whereClause: 'WHERE owner_id = $1',
    params: [user.userId],
  }
}

export function getOwnerIdForInsert(req: Request): string | null {
  const user = req.user
  if (!user) return null

  if (user.role === 'admin' || user.role === 'super') {
    return null
  }

  return user.userId
}