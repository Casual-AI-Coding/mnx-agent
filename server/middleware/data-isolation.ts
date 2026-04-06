import { Request } from 'express'
import '../types/express.d.ts'
import { UserRole } from '@mnx/shared-types'

const PRIVILEGED_ROLES = [UserRole.ADMIN, UserRole.SUPER]

export function isPrivilegedUser(role?: UserRole): boolean {
  return role ? PRIVILEGED_ROLES.includes(role) : false
}

export function buildOwnerFilter(req: Request): { whereClause: string; params: string[]; ownerId?: string } {
  const user = req.user
  if (!user) return { whereClause: '', params: [] }

  if (isPrivilegedUser(user.role)) {
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

  if (isPrivilegedUser(user.role)) {
    return null
  }

  return user.userId
}

export function getOwnerId(req: Request): string | undefined {
  const user = req.user
  if (!user) return undefined

  if (isPrivilegedUser(user.role)) {
    return undefined
  }

  return user.userId
}

export function requireOwnerId(req: Request): string {
  const ownerId = getOwnerId(req)
  if (!ownerId) {
    throw new Error('Owner ID is required but not available')
  }
  return ownerId
}