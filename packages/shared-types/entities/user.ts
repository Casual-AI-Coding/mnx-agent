/**
 * User and Auth Entity Types
 */

import { UserRole } from './enums.js'

export interface User {
  id: string
  username: string
  email: string
  password_hash: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InvitationCode {
  id: string
  code: string
  created_by: string
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface CreateUser {
  username: string
  email: string
  password: string
  role?: UserRole
}

export interface UpdateUser {
  username?: string
  email?: string
  role?: UserRole
  is_active?: boolean
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_value: string | null
  new_value: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface CreateAuditLog {
  user_id?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  old_value?: string | null
  new_value?: string | null
  ip_address?: string | null
  user_agent?: string | null
}

export interface AuditStats {
  total_actions: number
  unique_users: number
  actions_by_type: Record<string, number>
}