import type { Migration } from '../migrations-async.js'

export const migration_035: Migration = {
  id: 35,
  name: 'migration_035_add_misfire_policy',
  sql: `
ALTER TABLE cron_jobs ADD COLUMN IF NOT EXISTS misfire_policy VARCHAR(20) NOT NULL DEFAULT 'fire_once';
  `,
}
