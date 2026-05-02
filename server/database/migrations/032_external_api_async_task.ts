import type { Migration } from '../migrations-async.js'

export const migration_032: Migration = {
  id: 32,
  name: 'migration_032_external_api_async_task',
  sql: `
-- 扩展 external_api_logs 表支持异步任务模式
ALTER TABLE external_api_logs
  ADD COLUMN IF NOT EXISTS task_status VARCHAR(20) DEFAULT 'sync',
  ADD COLUMN IF NOT EXISTS result_media_id VARCHAR(36),
  ADD COLUMN IF NOT EXISTS result_data JSONB;

-- 添加 task_status 索引
CREATE INDEX IF NOT EXISTS idx_external_api_logs_task_status ON external_api_logs(task_status);
  `,
}
