import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('users route dependency contract', () => {
  it('resolves user services through the service container', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/users.ts'), 'utf8')

    expect(source).toContain('getAdminUserService')
    expect(source).toContain('getUserService')
    expect(source).toContain('await adminUserService.listUsers({ page, limit })')
    expect(source).toContain('await adminUserService.updateUser(id, updates)')
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../services/user-service')
    expect(source).not.toContain('SELECT COUNT(*) as total FROM users')
    expect(source).not.toContain('ORDER BY created_at DESC LIMIT $1 OFFSET $2')
    expect(source).not.toContain('type UserUpdateValue')
    expect(source).not.toContain("fields.join(', ')")
  })
})
