export const SCHEMA_SQL = `
-- ============================================
-- Core Tables
-- ============================================

CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cron_expression TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  workflow_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_run_at TEXT,
  next_run_at TEXT,
  total_runs INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  timeout_ms INTEGER DEFAULT 300000  -- 5 minutes default timeout
);

CREATE TABLE IF NOT EXISTS task_queue (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  tasks_executed INTEGER DEFAULT 0,
  tasks_succeeded INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  error_summary TEXT,
  log_detail TEXT
);

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

CREATE TABLE IF NOT EXISTS capacity_tracking (
  id TEXT PRIMARY KEY,
  service_type TEXT NOT NULL UNIQUE,
  remaining_quota INTEGER NOT NULL,
  total_quota INTEGER NOT NULL,
  reset_at TEXT,
  last_checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workflow_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_template INTEGER DEFAULT 0
);

-- ============================================
-- Job Organization & Dependencies
-- ============================================

CREATE TABLE IF NOT EXISTS job_tags (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, tag)
);

CREATE TABLE IF NOT EXISTS job_dependencies (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  depends_on_job_id TEXT NOT NULL REFERENCES cron_jobs(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(job_id, depends_on_job_id)
);

-- ============================================
-- Notifications & Webhooks
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_configs (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES cron_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL, -- JSON array: ["on_success", "on_failure", "on_start"]
  headers TEXT, -- JSON object with additional headers
  secret TEXT, -- For HMAC signature
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

-- ============================================
-- Dead Letter Queue
-- ============================================

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
  resolution TEXT -- 'retried', 'discarded', 'manual'
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_job_id ON task_queue(job_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_priority ON task_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_job_id ON execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_started_at ON execution_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_tags_tag ON job_tags(tag);
CREATE INDEX IF NOT EXISTS idx_job_dependencies_job_id ON job_dependencies(job_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_failed_at ON dead_letter_queue(failed_at DESC);

-- ============================================
-- Migrations Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================
-- Media Records
-- ============================================

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
`
