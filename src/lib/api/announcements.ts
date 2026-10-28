import { internalAxios } from './client'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/** 当前生效公告（通知中心聚合来源之一） */
export interface CurrentAnnouncement {
  id: string
  title: string
  content: string
  severity: 'info' | 'success' | 'warning' | 'error'
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

export async function getCurrentAnnouncements(): Promise<ApiResponse<CurrentAnnouncement[]>> {
  try {
    const response = await internalAxios.get('/announcements/current')
    return { success: true, data: response.data.data }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}
