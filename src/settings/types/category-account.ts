import type { UserRole } from '@/stores/auth'

export interface AccountSettings {
  username: string
  email: string | null
  role: UserRole
  locale: string
  timezone: string
  sessionTimeout: number
  lastPasswordChange?: Date
}
