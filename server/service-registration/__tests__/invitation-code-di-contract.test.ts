import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('invitation code service dependency contract', () => {
  it('registers the management service through the shared composition root', () => {
    const tokens = readSource('server/service-registration/tokens.ts')
    const containerTypes = readSource('server/container.types.ts')
    const factories = readSource('server/service-registration/repository-factories.ts')
    const registrations = readSource('server/service-registration/service-registrations.ts')
    const getters = readSource('server/service-registration/service-getters.ts')

    expect(tokens).toContain("INVITATION_CODE_SERVICE: 'invitationCodeService'")
    expect(containerTypes).toContain('readonly [TOKENS.INVITATION_CODE_SERVICE]: InvitationCodeService')
    expect(factories).toContain('export function createInvitationCodeRepository')
    expect(registrations).toContain('new InvitationCodeService(createInvitationCodeRepository')
    expect(getters).toContain('export function getInvitationCodeService')
    expect(getters).toContain('TOKENS.INVITATION_CODE_SERVICE')
  })
})
