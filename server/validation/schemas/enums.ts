/**
 * Shared Validation Enums
 * 
 * Centralizes Zod enum schemas that are used across multiple validation files.
 * This eliminates duplication and ensures consistency.
 */

import { z } from 'zod'

/**
 * Task type enum for API operations
 */
export const taskTypeEnum = z.enum([
  'text',
  'voice_sync',
  'voice_async',
  'image',
  'music',
  'video',
])

/**
 * Media type enum for file types
 */
export const mediaTypeEnum = z.enum(['audio', 'image', 'video', 'music', 'lyrics'])

/**
 * Execution status enum for job/task execution states
 */
export const executionStatusEnum = z.enum([
  'running',
  'completed',
  'failed',
  'partial',
])

// Type exports
export type TaskType = z.infer<typeof taskTypeEnum>
export type MediaType = z.infer<typeof mediaTypeEnum>
export type ExecutionStatus = z.infer<typeof executionStatusEnum>