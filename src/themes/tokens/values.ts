/**
 * Theme-Aware Token Values
 * 
 * These use Tailwind classes that reference CSS variables.
 * They automatically adapt to the current theme.
 */

import type {
  StatusTokenSet,
  ServiceTokenSet,
  RoleTokenSet,
  TaskStatusTokenSet,
  StatusType,
  ServiceType,
  RoleType,
  TaskStatusType,
} from './semantic'

// ============================================================================
// Status Tokens (Theme-Aware)
// ============================================================================

export const status: Record<StatusType, StatusTokenSet> = {
  success: {
    bg: 'bg-success',
    bgSubtle: 'bg-success/10',
    bgLight: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    icon: 'text-success',
    foreground: 'text-success-foreground',
    gradient: 'from-success to-success/60',
  },
  warning: {
    bg: 'bg-warning',
    bgSubtle: 'bg-warning/10',
    bgLight: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    icon: 'text-warning',
    foreground: 'text-warning-foreground',
    gradient: 'from-warning to-warning/60',
  },
  error: {
    bg: 'bg-error',
    bgSubtle: 'bg-error/10',
    bgLight: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/20',
    icon: 'text-error',
    foreground: 'text-error-foreground',
    gradient: 'from-error to-error/60',
  },
  info: {
    bg: 'bg-info',
    bgSubtle: 'bg-info/10',
    bgLight: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    icon: 'text-info',
    foreground: 'text-info-foreground',
    gradient: 'from-info to-info/60',
  },
  pending: {
    bg: 'bg-muted-foreground',
    bgSubtle: 'bg-muted-foreground/10',
    bgLight: 'bg-muted-foreground/10',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/20',
    icon: 'text-muted-foreground',
    foreground: 'text-foreground',
    gradient: 'from-muted-foreground to-muted-foreground/60',
  },
}

// ============================================================================
// Task Status Tokens (Theme-Aware)
// ============================================================================

export const taskStatus: Record<TaskStatusType, TaskStatusTokenSet> = {
  pending: {
    bg: 'bg-muted-foreground/10',
    text: 'text-muted-foreground',
    border: 'border-muted-foreground/20',
    dot: 'bg-muted-foreground',
  },
  running: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20',
    dot: 'bg-info',
  },
  completed: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    dot: 'bg-success',
  },
  failed: {
    bg: 'bg-error/10',
    text: 'text-error',
    border: 'border-error/20',
    dot: 'bg-error',
  },
  cancelled: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    dot: 'bg-warning',
  },
}

// ============================================================================
// Service Tokens (Theme-Aware via Primary Scale)
// ============================================================================

export const services: Record<ServiceType, ServiceTokenSet> = {
  text: {
    bg: 'bg-primary/10',
    bgSolid: 'bg-primary',
    text: 'text-primary',
    icon: 'text-primary',
  },
  voice: {
    bg: 'bg-secondary/10',
    bgSolid: 'bg-secondary',
    text: 'text-secondary-foreground',
    icon: 'text-secondary-foreground',
  },
  image: {
    bg: 'bg-accent/10',
    bgSolid: 'bg-accent',
    text: 'text-accent-foreground',
    icon: 'text-accent-foreground',
  },
  music: {
    bg: 'bg-primary-400/10',
    bgSolid: 'bg-primary-400',
    text: 'text-primary-400',
    icon: 'text-primary-400',
  },
  video: {
    bg: 'bg-destructive/10',
    bgSolid: 'bg-destructive',
    text: 'text-destructive',
    icon: 'text-destructive',
  },
  cron: {
    bg: 'bg-muted/10',
    bgSolid: 'bg-muted',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  workflow: {
    bg: 'bg-primary-600/10',
    bgSolid: 'bg-primary-600',
    text: 'text-primary-600',
    icon: 'text-primary-600',
  },
}

// ============================================================================
// Role Tokens (Theme-Aware via Primary/Destructive)
// ============================================================================

export const roles: Record<RoleType, RoleTokenSet> = {
  super: {
    gradient: 'from-warning to-error',
    bg: 'bg-warning',
    bgLight: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
  },
  admin: {
    gradient: 'from-primary to-info',
    bg: 'bg-primary',
    bgLight: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20',
  },
  pro: {
    gradient: 'from-secondary to-accent',
    bg: 'bg-secondary',
    bgLight: 'bg-secondary/10',
    text: 'text-secondary-foreground',
    border: 'border-secondary/20',
  },
  user: {
    gradient: 'from-success to-info',
    bg: 'bg-success',
    bgLight: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
  },
}
