/**
 * Theme Tokens
 * 
 * Semantic, theme-aware tokens that respond to CSS variable changes.
 * 
 * @example
 * ```tsx
 * import { status, getStatusTokens } from '@/themes/tokens'
 * 
 * // Use token object directly
 * <div className={status.success.bg}>Success</div>
 * 
 * // Use helper function
 * const tokens = getStatusTokens('success')
 * <div className={tokens.bg}>Success</div>
 * ```
 */

// Types
export type {
  StatusTokenSet,
  ServiceTokenSet,
  RoleTokenSet,
  TaskStatusTokenSet,
  StatusType,
  ServiceType,
  RoleType,
  TaskStatusType,
} from './semantic'

// Token values
export { status, taskStatus, services, roles } from './values'

// Utilities
export {
  getStatusTokens,
  getStatusClasses,
  getTaskStatusTokens,
  getServiceTokens,
  getRoleTokens,
  // Legacy compatibility
  getStatusColors,
  getRoleColors,
  getServiceColors,
} from './utils'