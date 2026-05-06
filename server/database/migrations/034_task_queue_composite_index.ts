interface Migration {
  id: number
  name: string
  sql: string
}

export const migration_034: Migration = {
  id: 34,
  name: 'migration_034_task_queue_composite_index',
  sql: `
CREATE INDEX IF NOT EXISTS idx_task_queue_status_owner_priority_created 
ON task_queue(status, owner_id, priority DESC, created_at);
  `,
}
