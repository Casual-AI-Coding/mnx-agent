import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('admin user list dependency registration', () => {
  it('registers the repository, token, service, getter, and typed container mapping', () => {
    const factorySource = readSource('server/service-registration/repository-factories.ts')
    const tokensSource = readSource('server/service-registration/tokens.ts')
    const registrationsSource = readSource('server/service-registration/service-registrations.ts')
    const gettersSource = readSource('server/service-registration/service-getters.ts')
    const containerTypesSource = readSource('server/container.types.ts')

    expect(factorySource).toContain('createAdminUserRepository')
    expect(tokensSource).toContain("ADMIN_USER_SERVICE: 'adminUserService'")
    expect(registrationsSource).toContain('TOKENS.ADMIN_USER_SERVICE')
    expect(registrationsSource).toContain('new AdminUserService')
    expect(gettersSource).toContain('getAdminUserService')
    expect(containerTypesSource).toContain('[TOKENS.ADMIN_USER_SERVICE]: AdminUserService')
  })
})
