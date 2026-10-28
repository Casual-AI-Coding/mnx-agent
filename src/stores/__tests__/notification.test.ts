import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useNotificationStore, MAX_NOTIFICATIONS } from '../notification'

describe('notification store', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-29T02:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('添加通知并累计未读数', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification({ level: 'error', source: 'api', title: '请求失败' })
    addNotification({ level: 'info', source: 'websocket', title: '任务创建' })

    const { notifications, unreadCount } = useNotificationStore.getState()
    expect(notifications).toHaveLength(2)
    expect(unreadCount).toBe(2)
    expect(notifications[0].title).toBe('任务创建')
    expect(notifications[0].read).toBe(false)
    expect(notifications[0].count).toBe(1)
  })

  it('去重窗口内同键通知合并计数', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t1' })
    vi.advanceTimersByTime(30_000)
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t1' })
    vi.advanceTimersByTime(30_000)
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t1' })

    const { notifications, unreadCount } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].count).toBe(3)
    expect(unreadCount).toBe(1)
  })

  it('去重窗口过期后不再合并', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t1' })
    vi.advanceTimersByTime(61_000)
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t1' })

    expect(useNotificationStore.getState().notifications).toHaveLength(2)
  })

  it('不同 dedupKey 不合并', () => {
    const { addNotification } = useNotificationStore.getState()
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t1' })
    addNotification({ level: 'error', source: 'websocket', title: '任务执行失败', dedupKey: 'task_failed:t2' })

    expect(useNotificationStore.getState().notifications).toHaveLength(2)
  })

  it('markRead 与 markAllRead 更新未读数', () => {
    const { addNotification, markRead, markAllRead } = useNotificationStore.getState()
    addNotification({ level: 'info', source: 'api', title: 'a' })
    addNotification({ level: 'info', source: 'api', title: 'b' })

    markRead(useNotificationStore.getState().notifications[0].id)
    expect(useNotificationStore.getState().unreadCount).toBe(1)

    markAllRead()
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('超过上限丢弃最旧通知', () => {
    const { addNotification } = useNotificationStore.getState()
    for (let i = 0; i < MAX_NOTIFICATIONS + 5; i++) {
      addNotification({ level: 'info', source: 'system', title: `n-${i}`, dedupKey: `n-${i}` })
    }

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(MAX_NOTIFICATIONS)
    expect(notifications[0].title).toBe(`n-${MAX_NOTIFICATIONS + 4}`)
  })

  it('clear 清空全部', () => {
    const { addNotification, clear } = useNotificationStore.getState()
    addNotification({ level: 'info', source: 'system', title: 'x' })
    clear()

    expect(useNotificationStore.getState().notifications).toHaveLength(0)
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })
})
