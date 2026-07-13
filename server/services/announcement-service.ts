import type {
  Announcement,
  AnnouncementRepositoryPort,
  AnnouncementUpdateInput,
  CreateAnnouncementInput,
} from './announcement-types.js'

export class AnnouncementService {
  constructor(private readonly repository: AnnouncementRepositoryPort) {}

  async getActive(): Promise<Announcement[]> {
    return this.repository.findActive()
  }

  async getAll(): Promise<Announcement[]> {
    return this.repository.list()
  }

  async create(input: CreateAnnouncementInput, actorId: string): Promise<Announcement | null> {
    return this.repository.create(input, actorId)
  }

  async update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<Announcement | null> {
    const existing = await this.repository.findById(id)
    if (!existing) {
      return null
    }

    await this.repository.update(id, input, actorId)
    return this.repository.findById(id)
  }

  async delete(id: string, actorId: string): Promise<boolean> {
    return this.repository.softDelete(id, actorId)
  }
}
