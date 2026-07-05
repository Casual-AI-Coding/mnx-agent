import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('external api logs route DI contract', () => {
  it('uses the container registered external api log repository', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const routePath = resolve(currentDir, '../external-api-logs.ts')
    const source = readFileSync(routePath, 'utf8')

    expect(source).toContain('getExternalApiLogRepository')
    expect(source).not.toContain('new ExternalApiLogRepository')
    expect(source).not.toContain('../repositories/external-api-log.repository')
  })
})
