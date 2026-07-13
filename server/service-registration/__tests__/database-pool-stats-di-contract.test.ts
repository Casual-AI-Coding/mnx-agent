import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('database pool stats DI contract', () => {
  it('registers the database pool stats service and exposes its getter', async () => {
    const registrations = await readFile('server/service-registration/service-registrations.ts', 'utf8')
    const getters = await readFile('server/service-registration/service-getters.ts', 'utf8')

    expect(registrations).toContain('TOKENS.DATABASE_POOL_STATS_SERVICE')
    expect(registrations).toContain('new DatabasePoolStatsService')
    expect(getters).toContain('export function getDatabasePoolStatsService')
    expect(getters).toContain('TOKENS.DATABASE_POOL_STATS_SERVICE')
  })
})
