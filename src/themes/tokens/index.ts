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

// Legacy color tokens for backward compatibility
export const primary = {
  50: 'bg-blue-50',
  100: 'bg-blue-100',
  200: 'bg-blue-200',
  300: 'bg-blue-300',
  400: 'bg-blue-400',
  500: 'bg-blue-500',
  600: 'bg-blue-600',
  700: 'bg-blue-700',
  800: 'bg-blue-800',
  900: 'bg-blue-900',
} as const

export const primaryText = {
  50: 'text-blue-50',
  100: 'text-blue-100',
  200: 'text-blue-200',
  300: 'text-blue-300',
  400: 'text-blue-400',
  500: 'text-blue-500',
  600: 'text-blue-600',
  700: 'text-blue-700',
  800: 'text-blue-800',
  900: 'text-blue-900',
} as const

export const secondary = {
  50: 'bg-purple-50',
  100: 'bg-purple-100',
  200: 'bg-purple-200',
  300: 'bg-purple-300',
  400: 'bg-purple-400',
  500: 'bg-purple-500',
  600: 'bg-purple-600',
  700: 'bg-purple-700',
  800: 'bg-purple-800',
  900: 'bg-purple-900',
} as const

export const secondaryText = {
  400: 'text-purple-400',
  500: 'text-purple-500',
  600: 'text-purple-600',
  700: 'text-purple-700',
} as const

export const neutralText = {
  400: 'text-gray-400',
  500: 'text-gray-500',
  600: 'text-gray-600',
  700: 'text-gray-700',
  800: 'text-gray-800',
  900: 'text-gray-900',
} as const