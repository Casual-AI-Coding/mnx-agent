import { describe, expect, it } from 'vitest'
import { AnnouncementService } from '../announcement-service.js'

type Announcement = {
  id: string
  title: string
  content: string
  severity: 'info' | 'success' | 'warning' | 'error'
  status: 'draft' | 'published' | 'archived'
  starts_at: string | null
  ends_at: string | null
  owner_id: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_deleted: boolean
}

type CreateInput = {
  title: string
  content: string
  severity: Announcement['severity']
  status: Announcement['status']
  starts_at?: string | null
  ends_at?: string | null
}

type UpdateInput = Partial<CreateInput>

type AnnouncementRepository = {
  findActive(): Promise<Announcement[]>
  list(): Promise<Announcement[]>
  findById(id: string): Promise<Announcement | null>
  create(input: CreateInput, actorId: string): Promise<Announcement | null>
  update(id: string, input: UpdateInput, actorId: string): Promise<void>
  softDelete(id: string, actorId: string): Promise<boolean>
}

function createAnnouncement(id: string): Announcement {
  return {
    id,
    title: '系统公告',
    content: '公告内容',
    severity: 'info',
    status: 'draft',
    starts_at: null,
    ends_at: null,
    owner_id: 'owner-1',
    created_by: 'owner-1',
    updated_by: 'owner-1',
    created_at: '2026-07-14 00:00:00',
    updated_at: '2026-07-14 00:00:00',
    deleted_at: null,
    is_deleted: false,
  }
}

function createRepository(options: {
  active?: Announcement[]
  items?: Announcement[]
  found?: Array<Announcement | null>
  created?: Announcement | null
  deleted?: boolean
} = {}): { repository: AnnouncementRepository; calls: string[] } {
  const calls: string[] = []
  const found = [...(options.found ?? [])]
  const created = options.created ?? createAnnouncement('created-1')

  return {
    repository: {
      findActive: async () => options.active ?? [],
      list: async () => options.items ?? [],
      findById: async () => {
        calls.push('find')
        return found.shift() ?? null
      },
      create: async (input, actorId) => {
        calls.push(`create:${input.title}:${actorId}`)
        return created
      },
      update: async (id, input, actorId) => {
        calls.push(`update:${id}:${input.status ?? ''}:${actorId}`)
      },
      softDelete: async (id, actorId) => {
        calls.push(`delete:${id}:${actorId}`)
        return options.deleted ?? true
      },
    },
    calls,
  }
}

describe('AnnouncementService', () => {
  it('returns active announcements from the repository', async () => {
    const active = [createAnnouncement('active-1')]
    const { repository } = createRepository({ active })
    const service = new AnnouncementService(repository)

    await expect(service.getActive()).resolves.toEqual(active)
  })

  it('returns the management list from the repository', async () => {
    const items = [createAnnouncement('list-1')]
    const { repository } = createRepository({ items })
    const service = new AnnouncementService(repository)

    await expect(service.getAll()).resolves.toEqual(items)
  })

  it('passes creation input and actor to the repository', async () => {
    const { repository, calls } = createRepository()
    const service = new AnnouncementService(repository)

    await expect(service.create({
      title: '新公告',
      content: '新内容',
      severity: 'warning',
      status: 'published',
    }, 'owner-1')).resolves.toMatchObject({ id: 'created-1' })
    expect(calls).toEqual(['create:新公告:owner-1'])
  })

  it('does not update an announcement that is absent', async () => {
    const { repository, calls } = createRepository({ found: [null] })
    const service = new AnnouncementService(repository)

    await expect(service.update('missing-1', { status: 'published' }, 'owner-1')).resolves.toBeNull()
    expect(calls).toEqual(['find'])
  })

  it('checks an announcement before updating and returns the refreshed entity', async () => {
    const existing = createAnnouncement('announcement-1')
    const refreshed = { ...existing, status: 'published' as const }
    const { repository, calls } = createRepository({ found: [existing, refreshed] })
    const service = new AnnouncementService(repository)

    await expect(service.update('announcement-1', { status: 'published' }, 'owner-1')).resolves.toEqual(refreshed)
    expect(calls).toEqual(['find', 'update:announcement-1:published:owner-1', 'find'])
  })

  it('returns the repository soft-delete result', async () => {
    const { repository, calls } = createRepository({ deleted: false })
    const service = new AnnouncementService(repository)

    await expect(service.delete('announcement-1', 'owner-1')).resolves.toBe(false)
    expect(calls).toEqual(['delete:announcement-1:owner-1'])
  })
})
