/**
 * PostgreSQL Schema Definition
 * 
 * Redesigned for workflow system with:
 * - Workflow templates (separate from cron jobs)
 * - Service node permissions
 * - Workflow permissions
 */

export const PG_SCHEMA_SQL = `
-- ============================================
-- Core Tables (Preserved)
-- ============================================

CREATE TABLE IF NOT EXISTS task_queue (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) REFERENCES cron_jobs(id) ON DELETE SET NULL,
  task_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capacity_tracking (
  id VARCHAR(36) PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL UNIQUE,
  remaining_quota INTEGER NOT NULL,
  total_quota INTEGER NOT NULL,
  reset_at TIMESTAMP,
  last_checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Workflow Templates (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes_json JSONB NOT NULL,
  edges_json JSONB NOT NULL,
  owner_id VARCHAR(36) REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Workflow Permissions (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS workflow_permissions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, user_id)
);

-- ============================================
-- Service Node Permissions (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS service_node_permissions (
  id VARCHAR(36) PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  method_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  min_role VARCHAR(20) NOT NULL DEFAULT 'pro',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_name, method_name)
);

-- ============================================
-- Cron Jobs (NEW Structure)
-- ============================================

CREATE TABLE IF NOT EXISTS cron_jobs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  workflow_id VARCHAR(36) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  owner_id VARCHAR(36) REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  timeout_ms INTEGER DEFAULT 300000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Execution Logs (NEW Structure)
-- ============================================

CREATE TABLE IF NOT EXISTS execution_logs (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) REFERENCES cron_jobs(id) ON DELETE CASCADE,
  trigger_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  tasks_executed INTEGER DEFAULT 0,
  tasks_succeeded INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  error_summary TEXT
);

-- ============================================
-- Execution Log Details (NEW Structure)
-- ============================================

CREATE TABLE IF NOT EXISTS execution_log_details (
  id VARCHAR(36) PRIMARY KEY,
  log_id VARCHAR(36) NOT NULL REFERENCES execution_logs(id) ON DELETE CASCADE,
  node_id VARCHAR(50),
  node_type VARCHAR(50),
  service_name VARCHAR(100),
  method_name VARCHAR(100),
  input_payload JSONB,
  output_result JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
);

-- ============================================
-- Migrations Tracking (Preserved)
-- ============================================

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Media Records (Preserved)
-- ============================================

CREATE TABLE IF NOT EXISTS media_records (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  filepath VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('audio', 'image', 'video', 'music')),
  mime_type VARCHAR(100),
  size_bytes BIGINT NOT NULL,
  source VARCHAR(50) CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation')),
  task_id VARCHAR(36),
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- ============================================
-- Prompt Templates (Preserved)
-- ============================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(20) CHECK(category IN ('text', 'image', 'music', 'video', 'general')),
  variables JSONB,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Audit Logs (Preserved)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  action VARCHAR(20) NOT NULL CHECK(action IN ('create', 'update', 'delete', 'execute')),
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),
  user_id VARCHAR(36),
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  request_body JSONB,
  response_status INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Authentication (Preserved)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  minimax_api_key VARCHAR(255),
  minimax_region VARCHAR(20) DEFAULT 'cn',
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitation_codes (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  created_by VARCHAR(36) REFERENCES users(id),
  max_uses INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for Performance
-- ============================================

-- Workflow templates indexes
CREATE INDEX IF NOT EXISTS idx_workflow_templates_owner ON workflow_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_is_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_name ON workflow_templates(name);

-- Workflow permissions indexes
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_workflow ON workflow_permissions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_user ON workflow_permissions(user_id);

-- Service node permissions indexes
CREATE INDEX IF NOT EXISTS idx_service_node_permissions_service ON service_node_permissions(service_name);
CREATE INDEX IF NOT EXISTS idx_service_node_permissions_category ON service_node_permissions(category);

-- Cron jobs indexes
CREATE INDEX IF NOT EXISTS idx_cron_jobs_owner ON cron_jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_workflow ON cron_jobs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_active ON cron_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at);

-- Execution logs indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_job ON execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started_at ON execution_logs(started_at DESC);

-- Execution log details indexes
CREATE INDEX IF NOT EXISTS idx_execution_log_details_log ON execution_log_details(log_id);
CREATE INDEX IF NOT EXISTS idx_execution_log_details_node ON execution_log_details(node_id);

-- Task queue indexes
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_job_id ON task_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_priority ON task_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_task_queue_type ON task_queue(task_type);

-- Capacity tracking indexes
CREATE INDEX IF NOT EXISTS idx_capacity_tracking_service_type ON capacity_tracking(service_type);

-- Media records indexes
CREATE INDEX IF NOT EXISTS idx_media_records_type ON media_records(type);
CREATE INDEX IF NOT EXISTS idx_media_records_source ON media_records(source);
CREATE INDEX IF NOT EXISTS idx_media_records_created_at ON media_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_records_is_deleted ON media_records(is_deleted);
CREATE INDEX IF NOT EXISTS idx_media_records_task_id ON media_records(task_id);

-- Prompt templates indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_builtin ON prompt_templates(is_builtin);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_at ON prompt_templates(created_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_response_status ON audit_logs(response_status);

-- ============================================
-- Initialization Data
-- ============================================

-- Initialize service node permissions
INSERT INTO service_node_permissions (id, service_name, method_name, display_name, category, min_role, is_enabled) VALUES
  -- MiniMax API
  ('snp-001', 'minimaxClient', 'chatCompletion', 'Text Generation', 'MiniMax API', 'pro', true),
  ('snp-002', 'minimaxClient', 'imageGeneration', 'Image Generation', 'MiniMax API', 'pro', true),
  ('snp-003', 'minimaxClient', 'videoGeneration', 'Video Generation', 'MiniMax API', 'pro', true),
  ('snp-004', 'minimaxClient', 'textToAudioSync', 'Voice Sync', 'MiniMax API', 'pro', true),
  ('snp-005', 'minimaxClient', 'textToAudioAsync', 'Voice Async', 'MiniMax API', 'pro', true),
  ('snp-006', 'minimaxClient', 'musicGeneration', 'Music Generation', 'MiniMax API', 'pro', true),
  
  -- Database
  ('snp-010', 'db', 'getPendingTasks', 'Get Pending Tasks', 'Database', 'admin', true),
  ('snp-011', 'db', 'createMediaRecord', 'Create Media Record', 'Database', 'admin', true),
  ('snp-012', 'db', 'updateTask', 'Update Task', 'Database', 'admin', true),
  ('snp-013', 'db', 'getTaskById', 'Get Task By ID', 'Database', 'admin', true),
  
  -- Capacity
  ('snp-020', 'capacityChecker', 'getRemainingCapacity', 'Get Remaining Capacity', 'Capacity', 'pro', true),
  ('snp-021', 'capacityChecker', 'hasCapacity', 'Check Has Capacity', 'Capacity', 'pro', true),
  ('snp-022', 'capacityChecker', 'getSafeExecutionLimit', 'Get Safe Execution Limit', 'Capacity', 'pro', true),
  
  -- Media Storage
  ('snp-030', 'mediaStorage', 'saveMediaFile', 'Save Media File', 'Media Storage', 'pro', true),
  ('snp-031', 'mediaStorage', 'saveFromUrl', 'Save From URL', 'Media Storage', 'pro', true)
ON CONFLICT (service_name, method_name) DO NOTHING;
`

export const PG_MIGRATIONS = [
  {
    id: 1,
    name: 'migration_001_initial_schema',
    sql: PG_SCHEMA_SQL,
  },
]