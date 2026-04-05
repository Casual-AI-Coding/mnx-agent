/**
 * Design Tokens System
 * Centralized design values for consistent styling across the application.
 * This eliminates hardcoded color values (previously 281 occurrences).
 */

// ============================================================================
// Color Tokens
// ============================================================================

/**
 * Primary brand colors (Blue spectrum)
 */
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

/**
 * Secondary colors (Purple spectrum)
 */
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

/**
 * Neutral colors (Gray spectrum)
 */
export const neutral = {
  50: 'bg-gray-50',
  100: 'bg-gray-100',
  200: 'bg-gray-200',
  300: 'bg-gray-300',
  400: 'bg-gray-400',
  500: 'bg-gray-500',
  600: 'bg-gray-600',
  700: 'bg-gray-700',
  800: 'bg-gray-800',
  900: 'bg-gray-900',
} as const

export const neutralText = {
  400: 'text-gray-400',
  500: 'text-gray-500',
  600: 'text-gray-600',
  700: 'text-gray-700',
  800: 'text-gray-800',
  900: 'text-gray-900',
} as const

export const neutralBorder = {
  100: 'border-gray-100',
  200: 'border-gray-200',
  300: 'border-gray-300',
  400: 'border-gray-400',
  500: 'border-gray-500',
} as const

// ============================================================================
// Status Colors
// ============================================================================

export interface StatusColorSet {
  bg: string
  bgLight: string
  text: string
  border: string
  icon: string
}

/**
 * Status colors for feedback states
 */
export const status = {
  success: {
    bg: 'bg-green-500',
    bgLight: 'bg-green-500/10',
    text: 'text-green-600',
    border: 'border-green-500/20',
    icon: 'text-green-500',
  } satisfies StatusColorSet,

  error: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/20',
    icon: 'text-red-500',
  } satisfies StatusColorSet,

  warning: {
    bg: 'bg-yellow-500',
    bgLight: 'bg-yellow-500/10',
    text: 'text-yellow-600',
    border: 'border-yellow-500/20',
    icon: 'text-yellow-500',
  } satisfies StatusColorSet,

  info: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/20',
    icon: 'text-blue-500',
  } satisfies StatusColorSet,

  pending: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/20',
    icon: 'text-amber-500',
  } satisfies StatusColorSet,
} as const

// ============================================================================
// Role Colors (User Roles)
// ============================================================================

export interface RoleColorSet {
  gradient: string
  bg: string
  bgLight: string
  text: string
  border: string
}

/**
 * Role-specific colors for user management
 */
export const roles = {
  super: {
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/20',
  } satisfies RoleColorSet,

  admin: {
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/20',
  } satisfies RoleColorSet,

  pro: {
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-500/20',
  } satisfies RoleColorSet,

  user: {
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/20',
  } satisfies RoleColorSet,
} as const

// ============================================================================
// Task Status Colors
// ============================================================================

export const taskStatus = {
  pending: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/20',
    dot: 'bg-gray-500',
  },
  running: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/20',
    dot: 'bg-blue-500',
  },
  completed: {
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    border: 'border-green-500/20',
    dot: 'bg-green-500',
  },
  failed: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
  },
  cancelled: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
} as const

// ============================================================================
// Service Colors (for icons and badges)
// ============================================================================

export const services = {
  text: {
    bg: 'bg-blue-500/10',
    bgSolid: 'bg-blue-500',
    text: 'text-blue-600',
    icon: 'text-blue-500',
  },
  voice: {
    bg: 'bg-purple-500/10',
    bgSolid: 'bg-purple-500',
    text: 'text-purple-600',
    icon: 'text-purple-500',
  },
  image: {
    bg: 'bg-pink-500/10',
    bgSolid: 'bg-pink-500',
    text: 'text-pink-600',
    icon: 'text-pink-500',
  },
  music: {
    bg: 'bg-emerald-500/10',
    bgSolid: 'bg-emerald-500',
    text: 'text-emerald-600',
    icon: 'text-emerald-500',
  },
  video: {
    bg: 'bg-red-500/10',
    bgSolid: 'bg-red-500',
    text: 'text-red-600',
    icon: 'text-red-500',
  },
  cron: {
    bg: 'bg-amber-500/10',
    bgSolid: 'bg-amber-500',
    text: 'text-amber-600',
    icon: 'text-amber-500',
  },
  workflow: {
    bg: 'bg-cyan-500/10',
    bgSolid: 'bg-cyan-500',
    text: 'text-cyan-600',
    icon: 'text-cyan-500',
  },
} as const

// ============================================================================
// Spacing Tokens
// ============================================================================

export const spacing = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-10',
} as const

export const padding = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
} as const

export const margin = {
  xs: 'm-1',
  sm: 'm-2',
  md: 'm-4',
  lg: 'm-6',
  xl: 'm-8',
} as const

// ============================================================================
// Typography Tokens
// ============================================================================

export const fontSize = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
} as const

export const fontWeight = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const

// ============================================================================
// Border Radius Tokens
// ============================================================================

export const radius = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const

// ============================================================================
// Shadow Tokens
// ============================================================================

export const shadow = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  none: 'shadow-none',
} as const

// ============================================================================
// Animation Tokens
// ============================================================================

export const transition = {
  fast: 'transition-colors duration-150',
  normal: 'transition-colors duration-200',
  slow: 'transition-colors duration-300',
} as const

// ============================================================================
// Composite Classes (Common patterns)
// ============================================================================

/**
 * Pre-built class combinations for common UI patterns
 */
export const composite = {
  card: 'bg-white rounded-lg shadow-md border border-gray-200',
  cardDark: 'bg-gray-800 rounded-lg shadow-md border border-gray-700',
  input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
  button: 'px-4 py-2 rounded-md font-medium transition-colors duration-200',
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  badgeWithIcon: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
} as const

// ============================================================================
// Utility Functions
// ============================================================================

import { cn } from '@/lib/utils'

/**
 * Combine multiple token classes
 */
export function combineTokens(...classes: (string | undefined | null | false)[]): string {
  return cn(...classes)
}

/**
 * Get role-specific color set
 */
export function getRoleColors(role: keyof typeof roles): RoleColorSet {
  return roles[role]
}

/**
 * Get status-specific color set
 */
export function getStatusColors(statusKey: keyof typeof status): StatusColorSet {
  return status[statusKey]
}

/**
 * Get service-specific color set
 */
export function getServiceColors(serviceKey: keyof typeof services) {
  return services[serviceKey]
}