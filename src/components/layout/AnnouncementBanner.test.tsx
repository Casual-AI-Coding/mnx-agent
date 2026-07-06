import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AnnouncementBanner from './AnnouncementBanner'
import { apiClient } from '../../lib/api/client'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('AnnouncementBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders active published announcements for authenticated users', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'announcement-1',
          title: '系统维护通知',
          content: '今晚 23:00-23:30 将进行系统维护。',
          severity: 'warning',
          status: 'published',
        },
      ],
    })

    render(<AnnouncementBanner />)

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/announcements/active')
    })
    expect(screen.getByText('系统维护通知')).toBeTruthy()
    expect(screen.getByText('今晚 23:00-23:30 将进行系统维护。')).toBeTruthy()
  })

  it('does not render when there are no active announcements', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] })

    const { container } = render(<AnnouncementBanner />)

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/admin/announcements/active')
    })
    expect(container.firstChild).toBeNull()
  })
})
