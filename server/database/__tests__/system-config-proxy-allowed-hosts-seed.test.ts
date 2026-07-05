import { describe, expect, it } from 'vitest'

import { MIGRATIONS } from '../migrations-async.js'
import { PG_SCHEMA_SQL } from '../schema-pg.js'

const REQUIRED_ALLOWED_HOSTS = [
  'mikuapi.org',
  'api.pptoken.org',
  'code.azsheen.top',
  'api.tokenfty.net',
  'gpt.hslife.fun',
  'lumin-ai.tiandi.run',
  'api.sisyphusx.com',
]

describe('proxy.allowed_hosts system config seed', () => {
  it('seeds proxy.allowed_hosts in the initial PostgreSQL schema', () => {
    expect(PG_SCHEMA_SQL).toContain('proxy.allowed_hosts')

    for (const host of REQUIRED_ALLOWED_HOSTS) {
      expect(PG_SCHEMA_SQL).toContain(host)
    }
  })

  it('adds proxy.allowed_hosts to existing databases with a dedicated migration', () => {
    const migration = MIGRATIONS.find(candidate => candidate.id === 37)

    expect(migration?.name).toBe('migration_037_seed_proxy_allowed_hosts_config')
    expect(migration?.sql).toContain('proxy.allowed_hosts')
    expect(migration?.sql).toContain('ON CONFLICT (key) DO NOTHING')

    for (const host of REQUIRED_ALLOWED_HOSTS) {
      expect(migration?.sql).toContain(host)
    }
  })
})
