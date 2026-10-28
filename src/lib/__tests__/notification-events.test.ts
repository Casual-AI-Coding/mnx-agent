import { describe, it, expect, beforeEach } from 'vitest'
import { mapEventToNotification, ingestWebSocketEvent } from '../notification-events'
import { useNotificationStore } from '@/stores/notification'
import type { WebSocketEvent } from '@/lib/websocket-client'

function makeEvent(type: string, payload?: Record<string, unknown>): WebSocketEvent {
  return { type, channel: 'tasks', payload, timestamp: Date.now() } as WebSocketEvent
}

describe('mapEventToNotification', () => {
  it('task_failed 映射为 error + 跳转执行日志 + 弹 Toast', () => {
    const mapped = mapEventToNotification(makeEvent('task_failed', { id: 'task-12345678' }))
    expect(mapped).toMatchObject({ level: 'error', title: '任务执行失败', link: '/cron', toast: true })
    expect(mapped?.message).toContain('task-123')
  })

  it('task_moved_to_dlq 映射为 error + 跳转死信队列', () => {
    const mapped = mapEventToNotification(makeEvent('task_moved_to_dlq', { id: 'task-1' }))
    expect(mapped).toMatchObject({ level: 'error', link: '/dead-letter-queue', toast: true })
  })

  it('workflow_test_completed 失败映射为 error，成功返回 null', () => {
    expect(mapEventToNotification(makeEvent('workflow_test_completed', { status: 'failed', error: 'boom' })))
      .toMatchObject({ level: 'error', title: '工作流测试失败' })
    expect(mapEventToNotification(makeEvent('workflow_test_completed', { status: 'completed' }))).toBeNull()
  })

  it('queue_capacity_warning 映射为 warning 不弹 Toast', () => {
    const mapped = mapEventToNotification(makeEvent('queue_capacity_warning', { remaining: 5 }))
    expect(mapped).toMatchObject({ level: 'warning', title: '队列容量警告' })
    expect(mapped?.toast).toBeUndefined()
  })

  it('未知事件返回 null', () => {
    expect(mapEventToNotification(makeEvent('unknown_event'))).toBeNull()
  })
})

describe('ingestWebSocketEvent', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear()
  })

  it('事件入库通知中心，同事件 ID 去重合并', () => {
    ingestWebSocketEvent(makeEvent('task_failed', { id: 'task-1' }))
    ingestWebSocketEvent(makeEvent('task_failed', { id: 'task-1' }))
    ingestWebSocketEvent(makeEvent('task_moved_to_dlq', { id: 'task-9' }))

    const { notifications, unreadCount } = useNotificationStore.getState()
    expect(notifications).toHaveLength(2)
    expect(notifications.find(n => n.dedupKey === 'task_failed:task-1')?.count).toBe(2)
    expect(unreadCount).toBe(2)
  })

  it('成功级事件入库但不弹错误提醒', () => {
    ingestWebSocketEvent(makeEvent('media_upload_completed', { id: 'm1' }))

    const { notifications } = useNotificationStore.getState()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].level).toBe('success')
  })
})
