import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotificationCenter } from '../NotificationCenter'
import { useNotificationStore } from '@/stores/notification'
import { getCurrentAnnouncements } from '@/lib/api/announcements'

vi.mock('@/lib/api/announcements', () => ({
  getCurrentAnnouncements: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

function renderCenter() {
  return render(<MemoryRouter><NotificationCenter /></MemoryRouter>)
}

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useNotificationStore.getState().clear()
  })

  it('无通知时徽标不显示，面板展示空态', async () => {
    renderCenter()

    expect(screen.queryByTestId('notification-badge')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /通知中心/ }))
    expect(await screen.findByTestId('notification-panel')).toBeInTheDocument()
    expect(screen.getByText('暂无通知')).toBeInTheDocument()
  })

  it('未读数展示在徽标上，点击条目标记已读并跳转', async () => {
    useNotificationStore.getState().addNotification({
      level: 'error', source: 'websocket', title: '任务执行失败', link: '/cron',
    })
    renderCenter()

    expect(screen.getByTestId('notification-badge')).toHaveTextContent('1')

    fireEvent.click(screen.getByRole('button', { name: /通知中心/ }))
    const item = await screen.findByTestId('notification-item')
    fireEvent.click(item)

    await waitFor(() => {
      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })
  })

  it('全部已读按钮清零未读', async () => {
    useNotificationStore.getState().addNotification({ level: 'info', source: 'api', title: 'a' })
    useNotificationStore.getState().addNotification({ level: 'info', source: 'api', title: 'b' })
    renderCenter()

    fireEvent.click(screen.getByRole('button', { name: /通知中心/ }))
    fireEvent.click(await screen.findByRole('button', { name: '全部已读' }))

    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('清空按钮移除全部通知', async () => {
    useNotificationStore.getState().addNotification({ level: 'info', source: 'api', title: 'a' })
    renderCenter()

    fireEvent.click(screen.getByRole('button', { name: /通知中心/ }))
    fireEvent.click(await screen.findByRole('button', { name: '清空通知' }))

    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('挂载时拉取系统公告并入库存档', async () => {
    vi.mocked(getCurrentAnnouncements).mockResolvedValue({
      success: true,
      data: [{ id: 'a1', title: '系统维护通知', content: '今晚维护', severity: 'warning', starts_at: null, ends_at: null, created_at: '2026-10-29T00:00:00Z' }],
    })
    renderCenter()

    await waitFor(() => {
      const { notifications } = useNotificationStore.getState()
      expect(notifications.some(n => n.title === '系统维护通知' && n.source === 'announcement')).toBe(true)
    })
  })
})
