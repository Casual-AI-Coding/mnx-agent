/**
 * Audit Configuration Constants
 * 
 * Centralizes all audit-related configuration for HTTP and external API auditing.
 */

/**
 * Sensitive fields to redact in audit logs
 */
export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'access_token',
  'refresh_token',
] as const

/**
 * Maximum response body length for audit logs (in bytes)
 */
export const MAX_RESPONSE_BODY_LENGTH = 4096 // 4KB

/**
 * Exact paths to skip for audit logging
 */
export const EXACT_SKIP_PATHS = [
  '/health',
  '/text/chat/stream',
  '/capacity/refresh',
  '/auth/refresh',
  '/settings/preferences',
  '/settings/display',
  '/settings/theme',
] as const

/**
 * Regex patterns for paths to skip for audit logging
 */
export const REGEX_SKIP_PATHS = [
  /^\/api\/media\/[^/]+\/favorite$/,
  /^\/api\/cron\/jobs\/[^/]+\/tags$/,
  /^\/api\/cron\/jobs\/[^/]+\/tags\/[^/]+$/,
] as const

/**
 * Resource type mapping by API path prefix
 */
export const RESOURCE_TYPE_MAP: Record<string, string> = {
  '/api/cron/jobs': 'job',
  '/api/cron/queue': 'task',
  '/api/cron/webhooks': 'webhook',
  '/api/cron/templates': 'job_template',
  '/api/cron/logs': 'execution_log',
  '/api/media': 'media',
  '/api/users': 'user',
  '/api/workflows': 'workflow',
  '/api/templates': 'workflow_template',
  '/api/settings': 'settings',
  '/api/system-config': 'system_config',
  '/api/invitation-codes': 'invitation_code',
  '/api/audit': 'audit_log',
  '/api/external-api-logs': 'external_api_log',
  '/api/auth': 'auth',
  '/api/text': 'text_generation',
  '/api/voice': 'voice',
  '/api/image': 'image_generation',
  '/api/music': 'music_generation',
  '/api/video': 'video_generation',
  '/api/video-agent': 'video_agent',
  '/api/files': 'file',
  '/api/stats': 'stats',
  '/api/capacity': 'capacity',
  '/api/usage': 'usage',
  '/api/export': 'export',
  '/api/admin/service-nodes': 'service_node',
  '/api/admin/workflows': 'admin_workflow',
  '/api/admin/service-permissions': 'service_permission',
}

/**
 * Action verbs that should not be treated as resource types
 */
export const ACTION_VERBS = [
  'toggle',
  'run',
  'test',
  'retry',
  'upload',
  'download',
  'delete',
  'clone',
  'favorite',
  'refresh',
  'validate',
  'generate',
  'preprocess',
  'stream',
  'token',
  'stats',
  'dry-run',
  'batch',
  'sync',
  'async',
  'status',
  'health',
  'reset-password',
  'change-password',
  'login',
  'logout',
  'register',
] as const

/**
 * UUID pattern for identifying resource IDs
 */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Numeric pattern for identifying numeric IDs
 */
export const NUMERIC_PATTERN = /^\d+$/