import type { Migration } from '../migrations-async.js'

export const migration_039: Migration = {
  id: 39,
  name: 'migration_039_create_announcements',
  sql: `
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  owner_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_by VARCHAR(36) NOT NULL REFERENCES users(id),
  updated_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_announcements_owner_active ON announcements(owner_id, is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_status_active ON announcements(status, is_deleted, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
  `,
}
