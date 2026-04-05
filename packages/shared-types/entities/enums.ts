/**
 * Shared Enums for MiniMax AI Toolset
 * These enums are shared between frontend and backend
 */

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TriggerType {
  CRON = 'cron',
  MANUAL = 'manual',
  RETRY = 'retry',
  WEBHOOK = 'webhook',
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export enum MisfirePolicy {
  IGNORE = 'ignore',
  FIRE_ONCE = 'fire_once',
  FIRE_ALL = 'fire_all',
}

export enum UserRole {
  USER = 'user',
  PRO = 'pro',
  ADMIN = 'admin',
  SUPER = 'super',
}

export type MediaType = 'audio' | 'image' | 'video' | 'music'

export type MediaSource = 
  | 'voice_sync' 
  | 'voice_async' 
  | 'image_generation' 
  | 'video_generation' 
  | 'music_generation'

export type WebhookEvent = 'on_start' | 'on_success' | 'on_failure'