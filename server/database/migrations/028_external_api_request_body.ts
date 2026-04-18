import type { Migration } from '../migrations-async.js'

export const migration_028: Migration = {
  id: 28,
  name: 'migration_028_external_api_request_body',
  sql: `
ALTER TABLE external_api_logs ADD COLUMN IF NOT EXISTS request_body TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_external_api_logs_operation_endpoint 
  ON external_api_logs(operation, api_endpoint);
  `,
}