import { describe, expect, it } from 'vitest'
import type { AdminUserListItem } from '../../repositories/admin-user-repository.js'
import { AdminUserService } from '../admin-user-service.js'
import type { AdminUserRepositoryPort } from '../admin-user-service.js'

import bcrypt from 'bcrypt'

type ListCall = {
  limit: number
  offset: number
}

type UpdateCall = {
  id: string
  updates: AdminUserUpdateInput
}

type DeleteCall = {
  id: string
}

type CreateCall = {
  username: string
  passwordHash: string
  id: string
  now: string
  email: string | null
  role: string
  apiKey: string | null
}

type ResetCall = {
  existsId: string | null
  updateId: string | null
  passwordHash: string | null
  now: string | null
}

type BatchCall = {
  action: string
  id: string
  now: string
}

type AdminUserUpdateInput = {
  readonly email?: string | null
  readonly role?: 'super' | 'admin' | 'pro' | 'user'
  readonly is_active?: boolean
  readonly minimax_api_key?: string | null
  readonly minimax_region?: 'cn' | 'intl'
}

type AdminUserListRepository = {
  countUsers(): Promise<number>
  listUsers(options: ListCall): Promise<AdminUserListItem[]>
}

function createUser(id: string): AdminUserListItem {
  return {
    id,
    username: 'tester',
    email: 'tester@example.com',
    minimax_api_key: 'minimax_****1234',
    minimax_region: 'cn',
    role: 'user',
    is_active: true,
    last_login_at: null,
    created_at: '2026-07-14T00:00:00.000',
    updated_at: '2026-07-14T00:00:00.000',
  }
}

function createRepository(
  total: number,
  users: AdminUserListItem[],
  updatedUser: AdminUserListItem | null,
  willDelete: boolean = false,
): {
  repository: AdminUserRepositoryPort
  listCalls: ListCall[]
  updateCalls: UpdateCall[]
  deleteCalls: DeleteCall[]
  createCalls: CreateCall[]
  resetCalls: ResetCall[]
  batchCalls: BatchCall[]
} {
  const listCalls: ListCall[] = []
  const updateCalls: UpdateCall[] = []
  const deleteCalls: DeleteCall[] = []
  const createCalls: CreateCall[] = []
  const resetCalls: ResetCall[] = []
  const batchCalls: BatchCall[] = []

  return {
    repository: {
      async countUsers(): Promise<number> {
        return total
      },
      async listUsers(options: ListCall): Promise<AdminUserListItem[]> {
        listCalls.push(options)
        return users
      },
      async updateUser(id: string, updates: AdminUserUpdateInput): Promise<AdminUserListItem | null> {
        updateCalls.push({ id, updates })
        return updatedUser
      },
      async deleteUser(id: string): Promise<boolean> {
        deleteCalls.push({ id })
        return willDelete
      },
      async createUser(data: {
        id: string
        username: string
        email: string | null
        passwordHash: string
        role: string
        apiKey: string | null
        now: string
      }): Promise<AdminUserListItem> {
        createCalls.push({
          username: data.username,
          passwordHash: data.passwordHash,
          id: data.id,
          now: data.now,
          email: data.email,
          role: data.role,
          apiKey: data.apiKey,
        })
    return createUser(data.id)
    },
    async exists(id: string): Promise<boolean> {
      resetCalls.push({ existsId: id, updateId: null, passwordHash: null, now: null })
      return id !== 'ghost'
    },
    async updatePassword(id: string, passwordHash: string, now: string): Promise<boolean> {
      resetCalls.push({ existsId: null, updateId: id, passwordHash, now })
      return true
    },
    async activateUser(id: string, now: string): Promise<boolean> {
      batchCalls.push({ action: 'activate', id, now })
      return true
    },
    async deactivateUser(id: string, now: string): Promise<boolean> {
      batchCalls.push({ action: 'deactivate', id, now })
      return true
    },
  },
  listCalls,
  updateCalls,
  deleteCalls,
  createCalls,
  resetCalls,
  batchCalls,
}
}

describe('AdminUserService', () => {
  it('calculates the second-page offset and total pages', async () => {
    const users = [createUser('user-2')]
    const { repository, listCalls } = createRepository(7, users, null)
    const service = new AdminUserService(repository)

    await expect(service.listUsers({ page: 2, limit: 5 })).resolves.toEqual({
      data: users,
      pagination: { page: 2, limit: 5, total: 7, totalPages: 2 },
    })
    expect(listCalls).toEqual([{ limit: 5, offset: 5 }])
  })

  it('reports zero total pages when no users exist', async () => {
    const { repository, listCalls } = createRepository(0, [], null)
    const service = new AdminUserService(repository)

    await expect(service.listUsers({ page: 1, limit: 20 })).resolves.toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
    expect(listCalls).toEqual([{ limit: 20, offset: 0 }])
  })

  it('delegates user attribute updates to the repository', async () => {
    const updatedUser = createUser('user-123')
    const { repository, updateCalls } = createRepository(0, [], updatedUser)
    const service = new AdminUserService(repository)

    const result = await service.updateUser('user-123', {
      email: 'updated@example.com',
      is_active: false,
    })

    expect(result).toEqual(updatedUser)
    expect(updateCalls).toEqual([{
      id: 'user-123',
      updates: { email: 'updated@example.com', is_active: false },
    }])
  })

  it('passes through null when the update target is not found', async () => {
    const { repository, updateCalls } = createRepository(0, [], null)
    const service = new AdminUserService(repository)

    await expect(service.updateUser('missing-user', { role: 'admin' })).resolves.toBeNull()
    expect(updateCalls).toEqual([{
      id: 'missing-user',
      updates: { role: 'admin' },
    }])
  })

  it('delegates successful deletion to the repository', async () => {
    const { repository, deleteCalls } = createRepository(0, [], null, true)
    const service = new AdminUserService(repository)

    await expect(service.deleteUser('user-to-delete')).resolves.toBe(true)
    expect(deleteCalls).toEqual([{ id: 'user-to-delete' }])
  })

  it('passes through false when the repository found no matching row', async () => {
    const { repository, deleteCalls } = createRepository(0, [], null, false)
    const service = new AdminUserService(repository)

    await expect(service.deleteUser('nonexistent')).resolves.toBe(false)
    expect(deleteCalls).toEqual([{ id: 'nonexistent' }])
  })

  it('hashes the password, generates a UUID, stamps timestamps, and delegates to the repository', async () => {
    const { repository, createCalls } = createRepository(0, [], null, false)
    const service = new AdminUserService(repository)

    const result = await service.createUser({
      username: 'newuser',
      password: 'plain-password',
      email: 'new@example.com',
      role: 'user',
    })

    expect(result.username).toBe('tester')
    expect(createCalls).toEqual([{
      username: 'newuser',
      passwordHash: expect.stringMatching(/^\$2b\$12\$.{53}$/),
      id: expect.any(String),
      now: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/),
      email: 'new@example.com',
      role: 'user',
      apiKey: null,
    }])
  })

  it('passes nullable fields through to the repository unchanged', async () => {
    const { repository, createCalls } = createRepository(0, [], null, false)
    const service = new AdminUserService(repository)

    await service.createUser({
      username: 'newuser',
      password: 'plain-password',
      email: null,
      role: 'admin',
      minimax_api_key: 'sk-key-1234',
    })

    expect(createCalls[0].email).toBeNull()
    expect(createCalls[0].apiKey).toBe('sk-key-1234')
    expect(createCalls[0].role).toBe('admin')
  })

  describe('resetPassword', () => {
    it('rejects unknown users without calling updatePassword', async () => {
      const { repository, resetCalls } = createRepository(0, [], null, false)
      const service = new AdminUserService(repository)

      await expect(service.resetPassword('ghost')).resolves.toBe(false)
      expect(resetCalls).toEqual([
        { existsId: 'ghost', updateId: null, passwordHash: null, now: null },
      ])
    })

    it('generates a random password, hashes it, and updates the row', async () => {
      const { repository, resetCalls } = createRepository(0, [], null, false)
      const service = new AdminUserService(repository)

      await expect(service.resetPassword('user-1')).resolves.toBe(true)
      expect(resetCalls).toHaveLength(2)
      expect(resetCalls[0]).toEqual({ existsId: 'user-1', updateId: null, passwordHash: null, now: null })
      expect(resetCalls[1]).toEqual({
        existsId: null,
        updateId: 'user-1',
        passwordHash: expect.stringMatching(/^\$2b\$12\$.{53}$/),
        now: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/),
      })
    })
  })

  describe('batchProcess', () => {
    it('delegates delete actions to the repository and counts results', async () => {
      const { repository, batchCalls } = createRepository(0, [], null, true)
      const service = new AdminUserService(repository)

      const result = await service.batchProcess({
        action: 'delete',
        userIds: ['user-1', 'user-2'],
        currentUserId: 'super-user',
      })

      expect(result).toEqual({ action: 'delete', successCount: 2, failCount: 0, total: 2 })
    })

    it('prevents deactivating own account by counting it as a failure', async () => {
      const { repository } = createRepository(0, [], null, false)
      const service = new AdminUserService(repository)

      const result = await service.batchProcess({
        action: 'deactivate',
        userIds: ['user-1', 'self-id'],
        currentUserId: 'self-id',
      })

      expect(result.failCount).toBe(1)
      expect(result.successCount).toBe(1)
    })

    it('delegates activate actions', async () => {
      const { repository, batchCalls } = createRepository(0, [], null, false)
      const service = new AdminUserService(repository)

      await service.batchProcess({
        action: 'activate',
        userIds: ['user-1'],
        currentUserId: 'super-user',
      })

      expect(batchCalls[0]?.action).toBe('activate')
    })
  })
})
