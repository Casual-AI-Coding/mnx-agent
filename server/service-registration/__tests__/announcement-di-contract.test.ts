import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('announcement service dependency contract', () => {
  it('registers the announcement service through the shared composition root', () => {
    const tokens = readSource('server/service-registration/tokens.ts')
    const containerTypes = readSource('server/container.types.ts')
    const factories = readSource('server/service-registration/repository-factories.ts')
    const registrations = readSource('server/service-registration/service-registrations.ts')
    const getters = readSource('server/service-registration/service-getters.ts')

    expect(tokens).toContain("ANNOUNCEMENT_SERVICE: 'announcementService'")
    expect(containerTypes).toContain('readonly [TOKENS.ANNOUNCEMENT_SERVICE]: AnnouncementService')
    expect(factories).toContain('export function createAnnouncementRepository')
    expect(registrations).toContain('new AnnouncementService(createAnnouncementRepository')
    expect(getters).toContain('export function getAnnouncementService')
    expect(getters).toContain('TOKENS.ANNOUNCEMENT_SERVICE')
  })
})
