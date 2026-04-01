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

-- Bootstrap: initial super user (ogslp / ll123123)
-- bcrypt hash generated with: bcrypt.hash('ll123123', 12)
INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ogslp',
  null,
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G.4m.XLP7VFSte',
  'super',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (username) DO NOTHING;

-- Bootstrap: initial invitation code (never expires, 100 uses)
INSERT INTO invitation_codes (id, code, created_by, max_uses, used_count, is_active, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'MINIMAX-INIT-2026',
  '00000000-0000-0000-0000-000000000001',
  100,
  0,
  true,
  CURRENT_TIMESTAMP
) ON CONFLICT (code) DO NOTHING;
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