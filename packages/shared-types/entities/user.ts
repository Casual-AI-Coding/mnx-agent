/**
 * User and Auth Entity Types
 */

import { UserRole } from './enums.js'

export interface User {
  id: string
  username: string
  email: string | null
  minimax_api_key: string | null
  minimax_region: string
  role: UserRole
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserRow {
  id: string
  username: string
  email: string | null
  password_hash: string
  minimax_api_key: string | null
  minimax_region: string
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateUser {
  username: string
  email?: string | null
  password: string
  minimax_api_key?: string | null
  minimax_region?: string
  role?: UserRole
}

export interface UpdateUser {
  email?: string | null
  minimax_api_key?: string | null
  minimax_region?: string
  role?: UserRole
  is_active?: boolean
}

export interface InvitationCode {
  id: string
  code: string
  created_by: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface InvitationCodeRow {
  id: string
  code: string
  created_by: string | null
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface CreateInvitationCode {
  code: string
  created_by?: string | null
  max_uses?: number
  expires_at?: string | null
}