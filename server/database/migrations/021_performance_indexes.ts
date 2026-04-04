interface Migration {
  id: number
  name: string
  sql: string
}

export const migration_021: Migration = {
  id: 21,
  name: 'migration_021_execution_log_details_index',
  sql: `
CREATE INDEX IF NOT EXISTS idx_execution_log_details_log_id ON execution_log_details(log_id);
  `,
}