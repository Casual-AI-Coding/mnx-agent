import type {
  AdminUserListItem,
  AdminUserListOptions,
  AdminUserUpdate,
  AdminUserCreateData,
} from '../repositories/admin-user-repository.js'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import { toLocalISODateString } from '../lib/date-utils.js'

export interface AdminUserRepositoryPort {
  countUsers(): Promise<number>
  listUsers(options: AdminUserListOptions): Promise<AdminUserListItem[]>
  updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null>
  deleteUser(id: string): Promise<boolean>
  createUser(data: AdminUserCreateData): Promise<AdminUserListItem>
}

export type AdminUserListRequest = {
  readonly page: number
  readonly limit: number
}

export type AdminUserListResult = {
  readonly data: AdminUserListItem[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
  }
}

export interface AdminUserCreateInput {
  readonly username: string
  readonly password: string
  readonly email?: string | null
  readonly role?: string
  readonly minimax_api_key?: string | null
}

export class AdminUserService {
  constructor(private readonly repository: AdminUserRepositoryPort) {}

  async listUsers({ page, limit }: AdminUserListRequest): Promise<AdminUserListResult> {
    const [total, data] = await Promise.all([
      this.repository.countUsers(),
      this.repository.listUsers({ limit, offset: (page - 1) * limit }),
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async updateUser(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem | null> {
    return this.repository.updateUser(id, updates)
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.repository.deleteUser(id)
  }

  async createUser(input: AdminUserCreateInput): Promise<AdminUserListItem> {
    const passwordHash = await bcrypt.hash(input.password, 12)
    const id = uuidv4()
    const now = toLocalISODateString()

    const data: AdminUserCreateData = {
      id,
      username: input.username,
      email: input.email ?? null,
      passwordHash,
      role: input.role ?? 'user',
      apiKey: input.minimax_api_key ?? null,
      now,
    }

    return this.repository.createUser(data)
  }
}
