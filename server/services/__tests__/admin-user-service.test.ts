import { describe, expect, it } from 'vitest'
import type { AdminUserListItem } from '../../repositories/admin-user-repository.js'
import { AdminUserService } from '../admin-user-service.js'

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
  repository: AdminUserListRepository & {
    updateUser(id: string, updates: AdminUserUpdateInput): Promise<AdminUserListItem | null>
    deleteUser(id: string): Promise<boolean>
  }
  listCalls: ListCall[]
  updateCalls: UpdateCall[]
  deleteCalls: DeleteCall[]
} {
  const listCalls: ListCall[] = []
  const updateCalls: UpdateCall[] = []
  const deleteCalls: DeleteCall[] = []

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
    },
    listCalls,
    updateCalls,
    deleteCalls,
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
})
