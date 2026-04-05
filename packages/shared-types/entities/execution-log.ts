/**
 * Execution Log Entity Types
 */

import { TriggerType, ExecutionStatus } from './enums.js'

export interface ExecutionLog {
  id: string
  job_id: string | null
  trigger_type: TriggerType
  status: ExecutionStatus
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  tasks_executed: number
  tasks_succeeded: number
  tasks_failed: number
  error_summary: string | null
}

export interface ExecutionLogDetail {
  id: string
  log_id: string
  node_id: string | null
  node_type: string | null
  service_name: string | null
  method_name: string | null
  input_payload: string | null
  output_result: string | null
  error_message?: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}

export interface CreateExecutionLog {
  job_id?: string | null
  trigger_type: TriggerType
  status: ExecutionStatus
  tasks_executed?: number
  tasks_succeeded?: number
  tasks_failed?: number
  error_summary?: string | null
}

export interface CreateExecutionLogDetail {
  log_id: string
  node_id?: string | null
  node_type?: string | null
  service_name?: string | null
  method_name?: string | null
  input_payload?: string | null
  output_result?: string | null
  error_message?: string | null
  started_at?: string | null
  completed_at?: string | null
  duration_ms?: number | null
}

export interface UpdateExecutionLog {
  status?: ExecutionStatus
  completed_at?: string | null
  duration_ms?: number | null
  tasks_executed?: number
  tasks_succeeded?: number
  tasks_failed?: number
  error_summary?: string | null
}

export interface ExecutionLogRow {
  id: string
  job_id: string | null
  trigger_type: string
  status: string
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  tasks_executed: number
  tasks_succeeded: number
  tasks_failed: number
  error_summary: string | null
}

export interface ExecutionLogDetailRow {
  id: string
  log_id: string
  node_id: string | null
  node_type: string | null
  service_name: string | null
  method_name: string | null
  input_payload: string | null
  output_result: string | null
  error_message?: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}