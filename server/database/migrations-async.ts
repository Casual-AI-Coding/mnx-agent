import { DatabaseConnection } from './connection.js'
import { PG_SCHEMA_SQL } from './schema-pg.js'

interface Migration {
  id: number
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'migration_001_initial_schema',
    sql: PG_SCHEMA_SQL,
  },
  {
    id: 2,
    name: 'migration_002_add_indexes',
    sql: `
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_job_id ON task_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_active ON cron_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_execution_logs_job_id ON execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started_at ON execution_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_capacity_tracking_service_type ON capacity_tracking(service_type);
    `,
  },
  {
    id: 3,
    name: 'migration_003_enhanced_cron_features',
    sql: `
CREATE TABLE IF NOT EXISTS execution_log_details (
  id VARCHAR(36) PRIMARY KEY,
  log_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(50),
  node_type VARCHAR(50),
  input_payload JSONB,
  output_result JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
);

CREATE TABLE IF NOT EXISTS job_tags (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, tag)
);

CREATE TABLE IF NOT EXISTS job_dependencies (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) NOT NULL,
  depends_on_job_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(job_id, depends_on_job_id)
);

CREATE TABLE IF NOT EXISTS webhook_configs (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  events JSONB NOT NULL,
  headers JSONB,
  secret VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(36) PRIMARY KEY,
  webhook_id VARCHAR(36) NOT NULL,
  execution_log_id VARCHAR(36),
  event VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id VARCHAR(36) PRIMARY KEY,
  original_task_id VARCHAR(36),
  job_id VARCHAR(36),
  task_type VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMP,
  resolution VARCHAR(20)
);
    `,
  },
  {
    id: 4,
    name: 'migration_004_add_missing_indexes',
    sql: `
CREATE INDEX IF NOT EXISTS idx_webhook_configs_job_id ON webhook_configs(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_execution_log_id ON webhook_deliveries(execution_log_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at);
CREATE INDEX IF NOT EXISTS idx_media_records_task_id ON media_records(task_id);
    `,
  },
  {
    id: 5,
    name: 'migration_005_media_records',
    sql: `
CREATE TABLE IF NOT EXISTS media_records (
  id VARCHAR(36) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  filepath VARCHAR(500) NOT NULL,
  type VARCHAR(20) NOT NULL,
  mime_type VARCHAR(100),
  size_bytes BIGINT NOT NULL,
  source VARCHAR(50),
  task_id VARCHAR(36),
  metadata JSONB,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_records_type ON media_records(type);
CREATE INDEX IF NOT EXISTS idx_media_records_source ON media_records(source);
CREATE INDEX IF NOT EXISTS idx_media_records_created_at ON media_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_records_is_deleted ON media_records(is_deleted);
    `,
  },
  {
    id: 6,
    name: 'migration_006_prompt_templates',
    sql: `
CREATE TABLE IF NOT EXISTS prompt_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(20),
  variables JSONB,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_builtin ON prompt_templates(is_builtin);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_at ON prompt_templates(created_at DESC);
    `,
  },
  {
    id: 7,
    name: 'migration_007_audit_logs',
    sql: `
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  action VARCHAR(20) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),
  user_id VARCHAR(36),
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_method VARCHAR(10),
  request_path VARCHAR(500),
  request_body JSONB,
  response_status INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_response_status ON audit_logs(response_status);
    `,
  },
  {
    id: 8,
    name: 'migration_008_auth_system',
    sql: `
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

-- Bootstrap: initial invitation code (never expires, 100 uses)
-- First user registers with this code, then manually update role to 'super' in database
INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, is_active, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'MINIMAX-BOOTSTRAP-2026',
  null,
  100,
  0,
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT (code) DO NOTHING;
    `,
  },
  {
    id: 9,
    name: 'migration_009_add_owner_id',
    sql: `
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE media_records ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE task_queue ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE prompt_templates ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE webhook_configs ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE dead_letter_queue ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36) REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cron_jobs_owner ON cron_jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_media_records_owner ON media_records(owner_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_owner ON execution_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_owner ON task_queue(owner_id);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_owner ON workflow_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_owner ON prompt_templates(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_owner ON webhook_configs(owner_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_owner ON dead_letter_queue(owner_id);
    `,
  },
  {
    id: 10,
    name: 'migration_010_add_performance_indexes',
    sql: `
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_type ON task_queue(task_type);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_name ON workflow_templates(name);
    `,
  },
  {
    id: 11,
    name: 'migration_011_audit_logs_error_message',
    sql: `
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
    `,
  },
  {
    id: 12,
    name: 'migration_012_workflow_system_tables',
    sql: `
-- workflow_templates table already exists from migration_001, just add missing columns
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create new tables that don't exist yet
CREATE TABLE IF NOT EXISTS workflow_permissions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, user_id)
);

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

CREATE INDEX IF NOT EXISTS idx_workflow_permissions_workflow ON workflow_permissions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_user ON workflow_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_node_permissions_category ON service_node_permissions(category);
CREATE INDEX IF NOT EXISTS idx_service_node_permissions_service ON service_node_permissions(service_name);

INSERT INTO service_node_permissions (id, service_name, method_name, display_name, category, min_role, is_enabled) VALUES
  ('snp-001', 'minimaxClient', 'chatCompletion', 'Text Generation', 'MiniMax API', 'pro', true),
  ('snp-002', 'minimaxClient', 'imageGeneration', 'Image Generation', 'MiniMax API', 'pro', true),
  ('snp-003', 'minimaxClient', 'videoGeneration', 'Video Generation', 'MiniMax API', 'pro', true),
  ('snp-004', 'minimaxClient', 'textToAudioSync', 'Voice Sync', 'MiniMax API', 'pro', true),
  ('snp-005', 'minimaxClient', 'textToAudioAsync', 'Voice Async', 'MiniMax API', 'pro', true),
  ('snp-006', 'minimaxClient', 'musicGeneration', 'Music Generation', 'MiniMax API', 'pro', true),
  
  ('snp-010', 'db', 'getPendingTasks', 'Get Pending Tasks', 'Database', 'admin', true),
  ('snp-011', 'db', 'createMediaRecord', 'Create Media Record', 'Database', 'admin', true),
  ('snp-012', 'db', 'updateTask', 'Update Task', 'Database', 'admin', true),
  ('snp-013', 'db', 'getTaskById', 'Get Task By ID', 'Database', 'admin', true),
  
  ('snp-020', 'capacityChecker', 'getRemainingCapacity', 'Get Remaining Capacity', 'Capacity', 'pro', true),
  ('snp-021', 'capacityChecker', 'hasCapacity', 'Check Has Capacity', 'Capacity', 'pro', true),
  ('snp-022', 'capacityChecker', 'getSafeExecutionLimit', 'Get Safe Execution Limit', 'Capacity', 'pro', true),
  
  ('snp-030', 'mediaStorage', 'saveMediaFile', 'Save Media File', 'Media Storage', 'pro', true),
  ('snp-031', 'mediaStorage', 'saveFromUrl', 'Save From URL', 'Media Storage', 'pro', true),
  
  ('snp-040', 'queueProcessor', 'processImageQueueWithCapacity', 'Process Image Queue', 'Queue Processing', 'admin', true)
ON CONFLICT (service_name, method_name) DO NOTHING;

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
    `,
  },
  {
    id: 13,
    name: 'migration_013_cron_jobs_workflow_id',
    sql: `
-- Change cron_jobs to use workflow_id instead of workflow_json
-- First make workflow_json nullable (will be deprecated)
ALTER TABLE cron_jobs ALTER COLUMN workflow_json DROP NOT NULL;

-- Add workflow_id column
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(36) REFERENCES workflow_templates(id) ON DELETE CASCADE;
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Shanghai';

-- Create index on workflow_id
CREATE INDEX IF NOT EXISTS idx_cron_jobs_workflow ON cron_jobs(workflow_id);

-- Create the daily Image Quota Consumer cron job
INSERT INTO cron_jobs (id, name, description, cron_expression, timezone, workflow_id, is_active, created_at, updated_at) VALUES
  ('job-001', 'Daily Image Quota Consumer', 'Process pending image generation tasks at 23:30 daily based on remaining API capacity.',
    '30 23 * * *',
    'Asia/Shanghai',
    'wf-001',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (id) DO NOTHING;
    `,
  },
  {
    id: 14,
    name: 'migration_014_example_workflows',
    sql: `
      INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, owner_id, is_public, created_at, updated_at) VALUES
        (
          'wf-example-001',
          'Simple Text Generation',
          'Single action node that generates text using MiniMax API',
          '[{"id":"text-node","type":"action","position":{"x":100,"y":100},"data":{"label":"Generate Text","config":{"service":"minimaxClient","method":"chatCompletion","args":[{"model":"abab6.5s-chat","messages":[{"role":"user","content":"Hello, how are you?"}]}]}}}]',
          '[]',
          null,
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        ),
        (
          'wf-example-002',
          'Text Generation with Transform',
          'Generates text and extracts the content using transform node',
          '[{"id":"text-node","type":"action","position":{"x":100,"y":100},"data":{"label":"Generate Text","config":{"service":"minimaxClient","method":"chatCompletion","args":[{"model":"abab6.5s-chat","messages":[{"role":"user","content":"Tell me a joke"}]}]}}},{"id":"extract-node","type":"transform","position":{"x":350,"y":100},"data":{"label":"Extract Content","config":{"transformType":"extract","inputNode":"text-node","inputPath":"choices[0].message.content"}}}]',
          '[{"id":"e1","source":"text-node","target":"extract-node"}]',
          null,
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        ),
        (
          'wf-example-003',
          'Image Generation and Save',
          'Generates an image and saves the result to database',
          '[{"id":"image-node","type":"action","position":{"x":100,"y":100},"data":{"label":"Generate Image","config":{"service":"minimaxClient","method":"imageGeneration","args":[{"prompt":"A beautiful sunset over mountains"}]}}},{"id":"save-node","type":"action","position":{"x":350,"y":100},"data":{"label":"Save to Database","config":{"service":"db","method":"createMediaRecord","args":[{"filename":"sunset-image.png","type":"image","source":"image_generation","filepath":"{{image-node.output.data.image_url}}"}]}}}]',
          '[{"id":"e1","source":"image-node","target":"save-node"}]',
          null,
          true,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      ON CONFLICT (id) DO NOTHING;
    `,
  },
  {
    id: 15,
    name: 'migration_015_add_execution_details_columns',
    sql: `
      ALTER TABLE execution_log_details 
      ADD COLUMN IF NOT EXISTS service_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS method_name VARCHAR(100);
    `,
  },
  {
    id: 16,
    name: 'migration_016_fix_wf_example_003_template',
    sql: `
      UPDATE workflow_templates 
      SET nodes_json = '[{"id":"image-node","type":"action","position":{"x":100,"y":100},"data":{"label":"Generate Image","config":{"service":"minimaxClient","method":"imageGeneration","args":[{"prompt":"A beautiful sunset over mountains"}]}}},{"id":"save-node","type":"action","position":{"x":350,"y":100},"data":{"label":"Save to Database","config":{"service":"db","method":"createMediaRecord","args":[{"filename":"sunset-image.png","type":"image","source":"image_generation","filepath":"{{image-node.output.data.image_url}}","size_bytes":0}]}}}]'
      WHERE id = 'wf-example-003';
    `,
  },
]

async function getExecutedMigrations(conn: DatabaseConnection): Promise<Set<string>> {
  try {
    const rows = await conn.query<{ name: string }>(
      "SELECT name FROM _migrations"
    )
    return new Set(rows.map(r => r.name))
  } catch {
    return new Set()
  }
}

async function executeMigration(conn: DatabaseConnection, migration: Migration): Promise<void> {
  if (migration.sql.trim()) {
    await conn.execute(migration.sql)
  }
  
  if (conn.isPostgres()) {
    await conn.execute(
      'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
      [migration.name]
    )
  } else {
    await conn.execute(
      'INSERT OR IGNORE INTO _migrations (name) VALUES (?)',
      [migration.name]
    )
  }
}

export async function runMigrations(conn: DatabaseConnection): Promise<void> {
  const executed = await getExecutedMigrations(conn)
  
  for (const migration of MIGRATIONS) {
    if (!executed.has(migration.name)) {
      await executeMigration(conn, migration)
    }
  }
}

export { MIGRATIONS }