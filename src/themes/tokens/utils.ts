/**
 * Token Utility Functions
 * 
 * Type-safe accessors for semantic tokens.
 */

import { cn } from '@/lib/utils'
import { status, taskStatus, services, roles } from './values'
import type {
  StatusType,
  TaskStatusType,
  ServiceType,
  RoleType,
  StatusTokenSet,
  TaskStatusTokenSet,
  ServiceTokenSet,
  RoleTokenSet,
} from './semantic'

// ============================================================================
// Status Token Helpers
// ============================================================================

export function getStatusTokens(statusKey: StatusType): StatusTokenSet {
  return status[statusKey]
}

export function getStatusClasses(
  statusKey: StatusType,
  options: {
    bg?: boolean
    text?: boolean
    border?: boolean
    icon?: boolean
  } = {}
): string {
  const tokens = status[statusKey]
  return cn(
    options.bg && tokens.bg,
    options.text && tokens.text,
    options.border && tokens.border,
    options.icon && tokens.icon
  )
}

// ============================================================================
// Task Status Token Helpers
// ============================================================================

export function getTaskStatusTokens(statusKey: TaskStatusType): TaskStatusTokenSet {
  return taskStatus[statusKey]
}

// ============================================================================
// Service Token Helpers
// ============================================================================

export function getServiceTokens(serviceKey: ServiceType): ServiceTokenSet {
  return services[serviceKey]
}

// ============================================================================
// Role Token Helpers
// ============================================================================

export function getRoleTokens(roleKey: RoleType): RoleTokenSet {
  return roles[roleKey]
}

// ============================================================================
// Legacy Compatibility Helpers
// ============================================================================

/**
 * @deprecated Use getStatusTokens() instead. Kept for backward compatibility during migration.
 */
export function getStatusColors(statusKey: StatusType): StatusTokenSet {
  return getStatusTokens(statusKey)
}

/**
 * @deprecated Use getRoleTokens() instead. Kept for backward compatibility during migration.
 */
export function getRoleColors(roleKey: RoleType): RoleTokenSet {
  return getRoleTokens(roleKey)
}

/**
 * @deprecated Use getServiceTokens() instead. Kept for backward compatibility during migration.
 */
export function getServiceColors(serviceKey: ServiceType): ServiceTokenSet {
  return getServiceTokens(serviceKey)
}