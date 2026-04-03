import { z } from 'zod'
import { TaskStatus, TriggerType, ExecutionStatus } from '../database/types'

// ============================================================================
// Cron Job Schemas
// ============================================================================

export const createCronJobSchema = z.object({
  name: z.string().min(1, 'name must be at least 1 character').max(100, 'name must be at most 100 characters'),
  description: z.string().optional(),
  cron_expression: z.string().min(1, 'cron_expression is required'),
  workflow_id: z.string().min(1, 'workflow_id is required'),
  timezone: z.string().default('Asia/Shanghai'),
  is_active: z.boolean().default(true),
  timeout_ms: z.number().int().min(1000).max(3600000).optional(),
})

export const updateCronJobSchema = createCronJobSchema.partial()

export const cronJobIdParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
})

// ============================================================================
// Task Queue Schemas
// ============================================================================

const taskTypeEnum = z.enum([
  'text',
  'voice_sync',
  'voice_async',
  'image',
  'music',
  'video',
])

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
  id: z.string().min(1, 'id is required'),
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
  status: z.enum(['running', 'completed', 'failed', 'partial']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const executionLogIdParamsSchema = z.object({
  id: z.string().min(1, 'id is required'),
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
  id: z.string().min(1, 'id is required'),
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