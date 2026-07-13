export type AnnouncementSeverity = 'info' | 'success' | 'warning' | 'error'

export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export interface Announcement {
  id: string
  title: string
  content: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  starts_at: string | null
  ends_at: string | null
  owner_id: string
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  is_deleted: boolean
  created_by_username?: string | null
  updated_by_username?: string | null
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  starts_at?: string | null
  ends_at?: string | null
}

export interface AnnouncementUpdateInput {
  title?: string
  content?: string
  severity?: AnnouncementSeverity
  status?: AnnouncementStatus
  starts_at?: string | null
  ends_at?: string | null
}

export interface AnnouncementRepositoryPort {
  findActive(): Promise<Announcement[]>
  list(): Promise<Announcement[]>
  findById(id: string): Promise<Announcement | null>
  create(input: CreateAnnouncementInput, actorId: string): Promise<Announcement | null>
  update(id: string, input: AnnouncementUpdateInput, actorId: string): Promise<void>
  softDelete(id: string, actorId: string): Promise<boolean>
}
