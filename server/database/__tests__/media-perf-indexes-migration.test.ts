import { describe, expect, it } from 'vitest'

import { MIGRATIONS } from '../migrations-async.js'

describe('media perf indexes migration (R-007)', () => {
  it('registers migration_041 in the MIGRATIONS registry', () => {
    const migration = MIGRATIONS.find((candidate) => candidate.id === 41)

    expect(migration?.name).toBe('migration_041_media_perf_indexes')
  })

  it('declares the owner_id/is_deleted/created_at composite index on media_records', () => {
    const migration = MIGRATIONS.find((candidate) => candidate.id === 41)

    expect(migration?.sql).toContain('idx_media_records_owner_deleted_created')
    expect(migration?.sql).toContain('media_records(owner_id, is_deleted, created_at DESC)')
    expect(migration?.sql).toMatch(/CREATE INDEX IF NOT EXISTS idx_media_records_owner_deleted_created/)
  })

  it('declares the user_id/created_at composite index on audit_logs', () => {
    const migration = MIGRATIONS.find((candidate) => candidate.id === 41)

    expect(migration?.sql).toContain('idx_audit_logs_user_created')
    expect(migration?.sql).toContain('audit_logs(user_id, created_at DESC)')
  })

  it('declares the owner_id/type/is_deleted composite index on media_records', () => {
    const migration = MIGRATIONS.find((candidate) => candidate.id === 41)

    expect(migration?.sql).toContain('idx_media_records_owner_type_deleted')
    expect(migration?.sql).toContain('media_records(owner_id, type, is_deleted)')
  })

  it('uses IF NOT EXISTS for all three indexes (idempotent)', () => {
    const migration = MIGRATIONS.find((candidate) => candidate.id === 41)
    const sql = migration?.sql ?? ''
    const matches = sql.match(/CREATE INDEX IF NOT EXISTS/g) ?? []
    expect(matches.length).toBe(3)
  })
})
