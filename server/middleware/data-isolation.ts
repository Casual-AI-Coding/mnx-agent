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

/**
 * Get owner ID from request (returns undefined if no user or admin/super role)
 */
export function getOwnerId(req: Request): string | undefined {
  const user = req.user
  if (!user) return undefined

  if (user.role === 'admin' || user.role === 'super') {
    return undefined
  }

  return user.userId
}

/**
 * Get owner ID from request, throws if not available
 * Use this when the owner ID is required for the operation
 */
export function requireOwnerId(req: Request): string {
  const ownerId = getOwnerId(req)
  if (!ownerId) {
    throw new Error('Owner ID is required but not available')
  }
  return ownerId
}