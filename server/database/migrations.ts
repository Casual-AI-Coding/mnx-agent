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