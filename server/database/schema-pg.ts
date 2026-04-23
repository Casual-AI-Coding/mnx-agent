/**
 * PostgreSQL Schema Definition
 * 
 * Redesigned for workflow system with:
 * - Workflow templates (separate from cron jobs)
 * - Service node permissions
 * - Workflow permissions
 * 
 * IMPORTANT: Table creation order must respect foreign key dependencies.
 * Tables must be created BEFORE other tables reference them.
 */

export const PG_SCHEMA_SQL = `
-- ============================================
-- Phase 1: Tables with no foreign key dependencies
-- ============================================

-- Users (referenced by many tables, must be first)
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

-- Migrations tracking
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Capacity tracking (no dependencies)
CREATE TABLE IF NOT EXISTS capacity_tracking (
  id VARCHAR(36) PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL UNIQUE,
  remaining_quota INTEGER NOT NULL,
  total_quota INTEGER NOT NULL,
  reset_at TIMESTAMP,
  last_checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Media records (no dependencies)
CREATE TABLE IF NOT EXISTS media_records (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  filepath VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('audio', 'image', 'video', 'music', 'lyrics')),
  mime_type VARCHAR(100),
  size_bytes BIGINT NOT NULL,
  source VARCHAR(50) CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation', 'lyrics_generation')),
  task_id VARCHAR(36),
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Prompt templates (no dependencies)
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

-- Materials (depends on users)
CREATE TABLE IF NOT EXISTS materials (
  id VARCHAR(36) PRIMARY KEY,
  material_type VARCHAR(20) NOT NULL CHECK(material_type IN ('artist')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSONB,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Material items (depends on materials and users)
CREATE TABLE IF NOT EXISTS material_items (
  id VARCHAR(36) PRIMARY KEY,
  material_id VARCHAR(36) NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK(item_type IN ('song')),
  name VARCHAR(255) NOT NULL,
  lyrics TEXT,
  remark TEXT,
  metadata JSONB,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Generic prompts (depends on users)
CREATE TABLE IF NOT EXISTS prompts (
  id VARCHAR(36) PRIMARY KEY,
  target_type VARCHAR(30) NOT NULL CHECK(target_type IN ('material-main', 'material-item')),
  target_id VARCHAR(36) NOT NULL,
  slot_type VARCHAR(30) NOT NULL CHECK(slot_type IN ('artist-style', 'song-style')),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Audit logs (no dependencies - user_id is just a reference, not enforced FK)
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

-- Service node permissions (no dependencies)
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

-- Invitation codes (depends on users)
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
-- Phase 2: Tables that depend on Phase 1 tables
-- ============================================

-- Workflow templates (depends on users)
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

-- Workflow permissions (depends on workflow_templates and users)
CREATE TABLE IF NOT EXISTS workflow_permissions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, user_id)
);

-- Workflow versions (depends on workflow_templates and users)
CREATE TABLE IF NOT EXISTS workflow_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  change_summary TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1,
  UNIQUE(template_id, version_number)
);

-- Cron jobs (depends on workflow_templates and users)
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
-- Phase 3: Tables that depend on Phase 2 tables
-- ============================================

-- Task queue (depends on cron_jobs)
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

-- Execution logs (depends on cron_jobs)
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

-- Execution log details (depends on execution_logs)
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

-- Job tags (depends on cron_jobs)
CREATE TABLE IF NOT EXISTS job_tags (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, tag)
);

-- Job dependencies (depends on cron_jobs)
CREATE TABLE IF NOT EXISTS job_dependencies (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  depends_on_job_id VARCHAR(36) NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, depends_on_job_id)
);

-- Webhook configs (depends on cron_jobs and users)
CREATE TABLE IF NOT EXISTS webhook_configs (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) REFERENCES cron_jobs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events JSONB NOT NULL,
  headers JSONB,
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  owner_id VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Webhook deliveries (depends on webhook_configs, execution_logs, users)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(36) PRIMARY KEY,
  webhook_id VARCHAR(36) NOT NULL,
  execution_log_id VARCHAR(36),
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  owner_id VARCHAR(36) REFERENCES users(id)
);

-- Dead letter queue (depends on users)
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id VARCHAR(36) PRIMARY KEY,
  original_task_id VARCHAR(36),
  job_id VARCHAR(36),
  owner_id VARCHAR(36) REFERENCES users(id),
  task_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- System config (depends on users)
CREATE TABLE IF NOT EXISTS system_config (
  id VARCHAR(36) PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  value_type VARCHAR(20) DEFAULT 'string',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(36) REFERENCES users(id)
);

-- Execution states (no enforced FK, uses TEXT types for compatibility)
CREATE TABLE IF NOT EXISTS execution_states (
  id TEXT PRIMARY KEY,
  execution_log_id TEXT NOT NULL,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  current_layer INTEGER DEFAULT 0,
  completed_nodes TEXT NOT NULL DEFAULT '[]',
  failed_nodes TEXT NOT NULL DEFAULT '[]',
  node_outputs TEXT NOT NULL DEFAULT '{}',
  context TEXT NOT NULL DEFAULT '{}',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paused_at TIMESTAMP,
  resumed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by TEXT
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
CREATE INDEX IF NOT EXISTS idx_media_records_is_public ON media_records(is_public);
CREATE INDEX IF NOT EXISTS idx_media_records_owner_public ON media_records(owner_id, is_public);

-- Prompt templates indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_builtin ON prompt_templates(is_builtin);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_at ON prompt_templates(created_at DESC);

-- Materials indexes
CREATE INDEX IF NOT EXISTS idx_materials_owner_type_deleted ON materials(owner_id, material_type, is_deleted);
CREATE INDEX IF NOT EXISTS idx_materials_updated_at ON materials(updated_at DESC);

-- Material items indexes
CREATE INDEX IF NOT EXISTS idx_material_items_material_deleted ON material_items(material_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_material_items_owner_deleted ON material_items(owner_id, is_deleted);
CREATE UNIQUE INDEX IF NOT EXISTS uq_material_items_active_name
  ON material_items(material_id, item_type, name)
  WHERE is_deleted = false;

-- Prompts indexes
CREATE INDEX IF NOT EXISTS idx_prompts_target_slot_deleted ON prompts(target_type, target_id, slot_type, is_deleted);
CREATE INDEX IF NOT EXISTS idx_prompts_owner_deleted ON prompts(owner_id, is_deleted);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_response_status ON audit_logs(response_status);

-- Webhook configs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_configs_job_id ON webhook_configs(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_owner ON webhook_configs(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(is_active);

-- Webhook deliveries indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_execution_log_id ON webhook_deliveries(execution_log_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_owner ON webhook_deliveries(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at DESC);

-- System config indexes
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);

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
  ('snp-031', 'mediaStorage', 'saveFromUrl', 'Save From URL', 'Media Storage', 'pro', true),
  
  -- Queue Processing
  ('snp-040', 'queueProcessor', 'processImageQueueWithCapacity', 'Process Image Queue', 'Queue Processing', 'admin', true)
ON CONFLICT (service_name, method_name) DO NOTHING;

-- Initialize system config
INSERT INTO system_config (id, key, value, description, value_type) VALUES
  ('cfg-001', 'api.rate_limit_per_minute', '60', 'API rate limit per minute', 'number'),
  ('cfg-002', 'features.workflow_enabled', 'true', 'Enable workflow feature', 'boolean'),
  ('cfg-003', 'system.maintenance_mode', 'false', 'Enable system maintenance mode', 'boolean'),
  ('cfg-004', 'system.announcement', '', 'System announcement message', 'string')
ON CONFLICT (key) DO NOTHING;

-- Initialize workflow template for image quota consumption
INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, owner_id, is_public, created_at, updated_at) VALUES
  ('wf-001', 'Image Quota Consumer', 'Process pending image generation tasks based on remaining API capacity. Runs at 23:30 daily.',
    '[{"id":"action-1","type":"action","data":{"label":"Process Image Queue","config":{"service":"queueProcessor","method":"processImageQueueWithCapacity","args":[]}},"position":{"x":100,"y":100}}]',
    '[]',
    null,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;

-- Initialize cron job for 23:30 daily execution
INSERT INTO cron_jobs (id, name, description, cron_expression, timezone, workflow_id, owner_id, is_active, created_at, updated_at) VALUES
  ('cron-001', 'Daily Image Quota Consumer', 'Process pending image tasks at 23:30 daily, consuming available API quota.',
    '30 23 * * *',
    'Asia/Shanghai',
    'wf-001',
    null,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;
`

export const PG_MIGRATIONS = [
  {
    id: 1,
    name: 'migration_001_initial_schema',
    sql: PG_SCHEMA_SQL,
  },
]
