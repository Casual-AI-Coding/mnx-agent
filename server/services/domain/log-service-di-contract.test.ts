import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('LogService DI contract', () => {
  it('uses repositories instead of the DatabaseService god facade', async () => {
    const source = await readFile('server/services/domain/log.service.ts', 'utf8')

    expect(source).not.toContain('../../database/service-async')
    expect(source).not.toContain('DatabaseService')
    expect(source).toContain('LogRepository')
    expect(source).toContain('UserRepository')
    expect(source).toContain('ExternalApiLogRepository')
  })
})
