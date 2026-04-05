/**
 * CronJob Entity Types
 */

import { MisfirePolicy } from './enums.js'

export interface CronJob {
  id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  workflow_id: string | null
  owner_id: string | null
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
  timeout_ms: number
  misfire_policy: MisfirePolicy
  created_at: string
  updated_at: string
}

export interface CreateCronJob {
  name: string
  description?: string | null
  cron_expression: string
  timezone?: string
  workflow_id?: string | null
  owner_id?: string | null
  is_active?: boolean
  timeout_ms?: number
  misfire_policy?: MisfirePolicy
}

export interface UpdateCronJob {
  name?: string
  description?: string | null
  cron_expression?: string
  timezone?: string
  workflow_id?: string | null
  owner_id?: string | null
  is_active?: boolean
  last_run_at?: string | null
  next_run_at?: string | null
  total_runs?: number
  total_failures?: number
  timeout_ms?: number
  misfire_policy?: MisfirePolicy
}

export interface CronJobRow {
  id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  workflow_id: string | null
  owner_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
  timeout_ms: number
  misfire_policy: string
}

export interface JobTag {
  id: string
  job_id: string
  tag: string
  created_at: string
}

export interface JobTagRow {
  id: string
  job_id: string
  tag: string
  created_at: string
}

export interface JobDependency {
  id: string
  job_id: string
  depends_on_job_id: string
  created_at: string
}

export interface JobDependencyRow {
  id: string
  job_id: string
  depends_on_job_id: string
  created_at: string
}