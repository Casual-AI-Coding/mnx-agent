import Database from 'better-sqlite3'
import type { Database as DatabaseType } from 'better-sqlite3'
import { SCHEMA_SQL } from './schema.js'

interface Migration {
  id: number
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'migration_001_initial_schema',
    sql: SCHEMA_SQL,
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
-- Create execution_log_details table
CREATE TABLE IF NOT EXISTS execution_log_details (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL REFERENCES execution_logs(id) ON DELETE CASCADE,
  node_id TEXT,
  node_type TEXT,
  input_payload TEXT,
  output_result TEXT,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  duration_ms INTEGER
);

-- Create job_tags table
CREATE TABLE IF NOT EXISTS job_tags (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, tag)
);

-- Create job_dependencies table
CREATE TABLE IF NOT EXISTS job_dependencies (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  depends_on_job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, depends_on_job_id)
);

-- Create webhook_configs table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL,
  headers TEXT,
  secret TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  execution_log_id TEXT REFERENCES execution_logs(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  payload TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  delivered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create dead_letter_queue table
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id TEXT PRIMARY KEY,
  original_task_id TEXT,
  job_id TEXT REFERENCES cron_jobs(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  error_message TEXT,
  failed_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0,
  resolved_at TEXT,
  resolution TEXT
);

-- Create additional indexes
CREATE INDEX IF NOT EXISTS idx_job_tags_tag ON job_tags(tag);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_job_id ON job_dependencies(job_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_failed_at ON dead_letter_queue(failed_at DESC);
`,
  },
  {
    id: 4,
    name: 'migration_004_add_missing_indexes',
    sql: `
-- Add missing indexes for webhook tables
CREATE INDEX IF NOT EXISTS idx_webhook_configs_job_id ON webhook_configs(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_execution_log_id ON webhook_deliveries(execution_log_id);

-- Add missing indexes for cron_jobs
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at);

-- Add missing index for media_records
CREATE INDEX IF NOT EXISTS idx_media_records_task_id ON media_records(task_id);
`,
  },
  {
    id: 5,
    name: 'migration_005_media_records',
    sql: `
CREATE TABLE IF NOT EXISTS media_records (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT,
  filepath TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('audio', 'image', 'video', 'music')),
  mime_type TEXT,
  size_bytes INTEGER NOT NULL,
  source TEXT CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 'video_generation', 'music_generation')),
  task_id TEXT,
  metadata TEXT,
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_records_type ON media_records(type);
CREATE INDEX IF NOT EXISTS idx_media_records_source ON media_records(source);
CREATE INDEX IF NOT EXISTS idx_media_records_created_at ON media_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_records_is_deleted ON media_records(is_deleted);
`,
  },
]

function getExecutedMigrations(db: DatabaseType): Set<string> {
  const tableExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    )
    .get()

  if (!tableExists) {
    return new Set()
  }

  const rows = db.prepare('SELECT name FROM _migrations').all() as {
    name: string
  }[]
  return new Set(rows.map((r) => r.name))
}

function executeMigration(db: DatabaseType, migration: Migration): void {
  db.exec(migration.sql)

  if (migration.id !== 1) {
    db.prepare(
      'INSERT INTO _migrations (name) VALUES (?)'
    ).run(migration.name)
  }
}

export function runMigrations(db: DatabaseType): void {
  const executed = getExecutedMigrations(db)

  for (const migration of MIGRATIONS) {
    if (!executed.has(migration.name)) {
      executeMigration(db, migration)
    }
  }
}

export { MIGRATIONS }