import { Request } from 'express'
import '../types/express.d.ts'

export function buildOwnerFilter(req: Request): { whereClause: string; params: string[]; ownerId?: string } {
  const user = req.user
  if (!user) return { whereClause: '', params: [] }

  if (user.role === 'admin' || user.role === 'super') {
    return { whereClause: '', params: [] }
  }

  return {
    whereClause: 'WHERE owner_id = $1',
    params: [user.userId],
    ownerId: user.userId,
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