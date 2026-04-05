/**
 * Semantic Design Tokens
 *
 * These tokens reference CSS variables and respond to theme changes.
 * Use these instead of hardcoded Tailwind classes for theme-aware styling.
 */

// ============================================================================
// Status Token Types
// ============================================================================

export interface StatusTokenSet {
  /** Background color - bg-* utility */
  bg: string
  /** Light background with opacity - bg-[color]/10 */
  bgSubtle: string
  /** Text color - text-* */
  text: string
  /** Border color - border-* */
  border: string
  /** Icon color */
  icon: string
  /** Foreground for colored backgrounds */
  foreground: string
}

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'pending'

// ============================================================================
// Service Token Types
// ============================================================================

export interface ServiceTokenSet {
  /** Background with opacity */
  bg: string
  /** Text color */
  text: string
  /** Icon color */
  icon: string
}

export type ServiceType = 'text' | 'voice' | 'image' | 'music' | 'video' | 'cron' | 'workflow'

// ============================================================================
// Role Token Types
// ============================================================================

export interface RoleTokenSet {
  /** Gradient classes */
  gradient: string
  /** Solid background */
  bg: string
  /** Light background with opacity */
  bgLight: string
  /** Text color */
  text: string
  /** Border color */
  border: string
}

export type RoleType = 'super' | 'admin' | 'pro' | 'user'

// ============================================================================
// Task Status Token Types
// ============================================================================

export interface TaskStatusTokenSet {
  bg: string
  text: string
  border: string
  dot: string
}

export type TaskStatusType = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'