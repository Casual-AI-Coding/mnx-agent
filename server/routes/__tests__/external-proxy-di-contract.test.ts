import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('external proxy route DI contract', () => {
  it('uses container getters instead of constructing repositories directly', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/external-proxy.ts'), 'utf8')

    expect(source).toContain('getExternalApiLogRepository')
    expect(source).toContain('getMediaRepository')
    expect(source).not.toContain('new ExternalApiLogRepository')
    expect(source).not.toContain('new MediaRepository')
    expect(source).not.toContain('../repositories/external-api-log.repository')
    expect(source).not.toContain('../repositories/media-repository')
    expect(source).not.toContain('../database/connection')
  })
})
