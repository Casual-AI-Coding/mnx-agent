import { z } from 'zod'
import { TaskStatus, TriggerType, ExecutionStatus, MisfirePolicy } from '../database/types'
import { taskTypeEnum, executionStatusEnum } from './schemas/enums.js'
import { idSchema } from './common.js'

// ============================================================================
// Cron Job Schemas
// ============================================================================

export const createCronJobSchema = z.object({
  name: z.string().min(1, 'name must be at least 1 character').max(100, 'name must be at most 100 characters'),
  description: z.string().optional(),
  cron_expression: z.string().min(1, 'cron_expression is required'),
  workflow_id: z.string().optional(),
  timezone: z.string().default('Asia/Shanghai'),
  is_active: z.boolean().default(true),
  timeout_ms: z.number().int().min(1000).max(3600000).optional(),
  misfire_policy: z.enum(['ignore', 'fire_once', 'fire_all']).default('fire_once'),
})

export const updateCronJobSchema = createCronJobSchema.partial()

export const cronJobIdParamsSchema = z.object({
  id: idSchema('job id'),
})

// ============================================================================
// Task Queue Schemas
// ============================================================================

export const createTaskSchema = z.object({
  job_id: z.string().optional(),
  task_type: taskTypeEnum,
  payload: z.union([z.string(), z.record(z.string(), z.unknown())]),
  priority: z.number().int().min(0).max(100).default(0),
  max_retries: z.number().int().min(0).max(10).default(3),
})

export const updateTaskSchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  error_message: z.string().optional(),
  result: z.string().optional(),
})

export const taskIdParamsSchema = z.object({
  id: idSchema('task id'),
})

export const taskQueueQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  job_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ============================================================================
// Execution Log Schemas
// ============================================================================

export const executionLogQuerySchema = z.object({
  job_id: z.string().optional(),
  status: executionStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const executionLogIdParamsSchema = z.object({
  id: idSchema('execution log id'),
})

// ============================================================================
// Capacity Schemas
// ============================================================================

const serviceTypeEnum = z.enum([
  'chat_completion',
  'text_to_audio_sync',
  'text_to_audio_async',
  'image_generation',
  'music_generation',
  'video_generation',
])

export const capacityCheckSchema = z.object({
  service_type: serviceTypeEnum,
})

// ============================================================================
// Workflow Schemas
// ============================================================================

const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
})

const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
})

export const workflowValidateSchema = z.object({
  workflow_json: z.string().optional(),
  nodes: z.array(workflowNodeSchema).optional(),
  edges: z.array(workflowEdgeSchema).optional(),
})

export const workflowTemplateIdParamsSchema = z.object({
  id: idSchema('workflow template id'),
})

export const createWorkflowTemplateSchema = z.object({
  name: z.string().min(1, 'name is required').max(100, 'name must be at most 100 characters'),
  description: z.string().optional(),
  nodes_json: z.string().min(1, 'nodes_json is required'),
  edges_json: z.string().min(1, 'edges_json is required'),
  is_template: z.boolean().default(true),
})

export const updateWorkflowTemplateSchema = createWorkflowTemplateSchema.partial()

// ============================================================================
// Job Tags Schemas
// ============================================================================

export const addJobTagSchema = z.object({
  tag: z.string()
    .min(1, 'tag must be at least 1 character')
    .max(50, 'tag must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'tag must contain only letters, numbers, and underscores'),
})

export const jobTagParamsSchema = z.object({
  id: idSchema('job id'),
  tag: z.string()
    .min(1, 'tag must be at least 1 character')
    .max(50, 'tag must be at most 50 characters'),
})

export const jobsByTagParamsSchema = z.object({
  tag: z.string()
    .min(1, 'tag must be at least 1 character')
    .max(50, 'tag must be at most 50 characters'),
})

// ============================================================================
// Job Dependencies Schemas
// ============================================================================

export const addJobDependencySchema = z.object({
  depends_on_job_id: idSchema('depends_on_job_id'),
})

export const jobDependencyParamsSchema = z.object({
  id: idSchema('job id'),
  depId: idSchema('depId'),
})

// ============================================================================
// Webhook Schemas
// ============================================================================

const webhookEventEnum = z.enum(['on_start', 'on_success', 'on_failure'])

export const createWebhookSchema = z.object({
  job_id: z.string().uuid(),
  name: z.string().min(1, 'name must be at least 1 character').max(255, 'name must be at most 255 characters'),
  url: z.string().url().max(500, 'url must be at most 500 characters'),
  events: z.array(webhookEventEnum).min(1, 'at least one event is required'),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().max(255, 'secret must be at most 255 characters').optional(),
  is_active: z.boolean().default(true),
})

export const updateWebhookSchema = z.object({
  job_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(500).optional(),
  events: z.array(webhookEventEnum).min(1).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  secret: z.string().max(255).optional().nullable(),
  is_active: z.boolean().optional(),
})

export const webhookIdParamsSchema = z.object({
  id: idSchema('webhook id'),
})

export const webhookDeliveriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// ============================================================================
// Type exports
// ============================================================================

export type CreateCronJobRequest = z.infer<typeof createCronJobSchema>
export type UpdateCronJobRequest = z.infer<typeof updateCronJobSchema>
export type CreateTaskRequest = z.infer<typeof createTaskSchema>
export type UpdateTaskRequest = z.infer<typeof updateTaskSchema>
export type WorkflowValidateRequest = z.infer<typeof workflowValidateSchema>
export type CapacityCheckRequest = z.infer<typeof capacityCheckSchema>
export type CreateWorkflowTemplateRequest = z.infer<typeof createWorkflowTemplateSchema>
export type UpdateWorkflowTemplateRequest = z.infer<typeof updateWorkflowTemplateSchema>
export type AddJobTagRequest = z.infer<typeof addJobTagSchema>
export type AddJobDependencyRequest = z.infer<typeof addJobDependencySchema>
export type CreateWebhookRequest = z.infer<typeof createWebhookSchema>
export type UpdateWebhookRequest = z.infer<typeof updateWebhookSchema>