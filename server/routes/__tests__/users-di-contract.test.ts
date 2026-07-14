import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('users route dependency contract', () => {
  it('resolves user services through the service container', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/routes/users.ts'), 'utf8')

    expect(source).toContain('getAdminUserService')
    expect(source).toContain('await adminUserService.listUsers({ page, limit })')
    expect(source).toContain('await adminUserService.updateUser(id, updates)')
    expect(source).toContain('await adminUserService.deleteUser(id)')
    expect(source).toContain('await adminUserService.createUser(req.body)')
    expect(source).toContain("await adminUserService.resetPassword(id)")
    expect(source).not.toContain('new UserService')
    expect(source).not.toContain('../services/user-service')
    expect(source).not.toContain('SELECT COUNT(*) as total FROM users')
    expect(source).not.toContain('ORDER BY created_at DESC LIMIT $1 OFFSET $2')
    expect(source).not.toContain('type UserUpdateValue')
    expect(source).not.toContain("fields.join(', ')")
    expect(source).not.toContain('INSERT INTO users (id, username, email, password_hash')
    expect(source).not.toContain("import bcrypt from 'bcrypt'")
    expect(source).not.toContain("import crypto from 'node:crypto'")
    expect(source).not.toContain('function generateRandomPassword')
    expect(source).not.toContain("import { v4 as uuidv4 }")
    expect(source).not.toContain('getUserService')
    expect(source).not.toContain("from '../database/connection.js'")
    expect(source).not.toContain('getConnection')
    expect(source).not.toContain('toLocalISODateString')
    expect(source).toContain('await adminUserService.batchProcess')
  })
})
