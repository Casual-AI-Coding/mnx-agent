const { Client } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const sqlitePath = process.argv[2] || './data/minimax.db';

async function migrate() {
  const pg = new Client({
    host: 'localhost',
    port: 5432,
    user: 'mnx_agent_server',
    password: 'passwd_mnx_agent_9qr89e321v',
    database: 'mnx_agent',
  });
  
  await pg.connect();
  console.log('Connected to PostgreSQL');
  
  const sqlite = new Database(sqlitePath, { readonly: true });
  console.log('Opened SQLite:', sqlitePath);
  
  const cronJobs = sqlite.prepare('SELECT * FROM cron_jobs').all();
  console.log(`Migrating ${cronJobs.length} cron_jobs...`);
  
  for (const job of cronJobs) {
    await pg.query(`
      INSERT INTO cron_jobs (id, name, description, cron_expression, is_active, workflow_json, created_at, updated_at, last_run_at, next_run_at, total_runs, total_failures, timeout_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT DO NOTHING
    `, [
      job.id, job.name, job.description, job.cron_expression,
      job.is_active === 1, job.workflow_json, job.created_at, job.updated_at,
      job.last_run_at, job.next_run_at, job.total_runs, job.total_failures, job.timeout_ms
    ]);
  }
  console.log('cron_jobs done');
  
  const logs = sqlite.prepare('SELECT * FROM execution_logs').all();
  console.log(`Migrating ${logs.length} execution_logs...`);
  
  for (const log of logs) {
    await pg.query(`
      INSERT INTO execution_logs (id, job_id, trigger_type, status, started_at, completed_at, duration_ms, tasks_executed, tasks_succeeded, tasks_failed, error_summary, log_detail)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT DO NOTHING
    `, [
      log.id, log.job_id, log.trigger_type, log.status, log.started_at,
      log.completed_at, log.duration_ms, log.tasks_executed, log.tasks_succeeded,
      log.tasks_failed, log.error_summary, log.log_detail
    ]);
  }
  console.log('execution_logs done');
  
  const media = sqlite.prepare('SELECT * FROM media_records').all();
  console.log(`Migrating ${media.length} media_records...`);
  
  for (const m of media) {
    await pg.query(`
      INSERT INTO media_records (id, filename, original_name, filepath, type, mime_type, size_bytes, source, task_id, metadata, is_deleted, created_at, updated_at, deleted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT DO NOTHING
    `, [
      m.id, m.filename, m.original_name, m.filepath, m.type, m.mime_type,
      m.size_bytes, m.source, m.task_id, m.metadata ? JSON.parse(m.metadata) : null,
      m.is_deleted === 1, m.created_at, m.updated_at, m.deleted_at
    ]);
  }
  console.log('media_records done');
  
  const counts = await pg.query(`
    SELECT 'cron_jobs' as tbl, COUNT(*) FROM cron_jobs
    UNION ALL SELECT 'execution_logs', COUNT(*) FROM execution_logs
    UNION ALL SELECT 'media_records', COUNT(*) FROM media_records
  `);
  console.log('\nFinal counts:');
  counts.rows.forEach(r => console.log(`  ${r.tbl}: ${r.count}`));
  
  await pg.end();
  sqlite.close();
  console.log('\nMigration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});