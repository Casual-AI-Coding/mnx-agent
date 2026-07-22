interface Migration {
  id: number
  name: string
  sql: string
}

export const migration_041: Migration = {
  id: 41,
  name: 'migration_041_media_perf_indexes',
  sql: `
CREATE INDEX IF NOT EXISTS idx_media_records_owner_deleted_created
  ON media_records(owner_id, is_deleted, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_records_owner_type_deleted
  ON media_records(owner_id, type, is_deleted);
  `,
}
