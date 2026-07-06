import { describe, expect, it } from 'vitest'

import { MIGRATIONS } from '../migrations-async.js'

describe('announcements migration', () => {
  it('registers the R-001 announcements table migration', () => {
    const migration = MIGRATIONS.find(candidate => candidate.id === 39)

    expect(migration?.name).toBe('migration_039_create_announcements')
    expect(migration?.sql).toContain('CREATE TABLE IF NOT EXISTS announcements')
    expect(migration?.sql).toContain('owner_id VARCHAR(36) NOT NULL REFERENCES users(id)')
    expect(migration?.sql).toContain('is_deleted BOOLEAN NOT NULL DEFAULT false')
    expect(migration?.sql).toContain('idx_announcements_status_active')
  })
})
