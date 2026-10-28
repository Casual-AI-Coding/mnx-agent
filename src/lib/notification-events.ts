import type { WebSocketEvent } from '@/lib/websocket-client'
import { useNotificationStore, type NotificationInput } from '@/stores/notification'
import { toast as sonnerToast } from 'sonner'

/**
 * WebSocket 事件 → 通知中心统一入口（R-016）
 *
 * 分级策略：所有事件进通知中心归档；仅 error 级别同时弹 Toast
 * （即时提醒只承载高优先级事件，其余在中心内查看）。
 * 事件本身自带去重键（类型 + 实体 ID），store 内再做时间窗合并。
 */

interface EventNotification {
  level: NotificationInput['level']
  title: string
  message?: string
  link?: string
  /** 是否同时弹 Toast（仅 error 级别为 true） */
  toast?: boolean
}

export function mapEventToNotification(event: WebSocketEvent): EventNotification | null {
  const payload = event.payload as Record<string, unknown> | undefined
  const entityId = typeof payload?.id === 'string' ? payload.id : undefined

  switch (event.type) {
    case 'task_failed':
      return {
        level: 'error',
        title: '任务执行失败',
        message: entityId ? `任务 ${entityId.slice(0, 8)} 执行失败，可前往执行日志查看详情` : '任务执行失败',
        link: '/cron',
        toast: true,
      }
    case 'task_moved_to_dlq':
      return {
        level: 'error',
        title: '任务移至死信队列',
        message: entityId ? `任务 ${entityId.slice(0, 8)} 重试耗尽，已进入死信队列等待处理` : '任务重试耗尽，已进入死信队列',
        link: '/dead-letter-queue',
        toast: true,
      }
    case 'workflow_test_completed': {
      const testPayload = payload as { status?: string; error?: string } | undefined
      if (testPayload?.status === 'failed' || testPayload?.error) {
        return {
          level: 'error',
          title: '工作流测试失败',
          message: testPayload.error || '未知错误',
          link: '/cron',
          toast: true,
        }
      }
      return null
    }
    case 'queue_capacity_warning':
      return {
        level: 'warning',
        title: '队列容量警告',
        message: `剩余容量: ${typeof payload?.remaining === 'number' ? payload.remaining : 0}`,
        link: '/token',
      }
    case 'retry_scheduled':
      return {
        level: 'info',
        title: '任务重试已调度',
        message: payload?.retryAt ? `将在 ${String(payload.retryAt)} 重试` : undefined,
        link: '/cron',
      }
    case 'job_created':
      return {
        level: 'info',
        title: '定时任务已创建',
        message: typeof payload?.name === 'string' ? payload.name : undefined,
        link: '/cron',
      }
    case 'media_upload_completed':
      return { level: 'success', title: '媒体上传完成', message: entityId, link: '/gallery' }
    case 'media_download_completed':
      return { level: 'success', title: '媒体下载完成', message: entityId, link: '/gallery' }
    default:
      return null
  }
}

function dedupKeyFor(event: WebSocketEvent): string {
  const payload = event.payload as Record<string, unknown> | undefined
  const entityId = payload?.id ?? payload?.jobId ?? payload?.workflowId ?? payload?.executionId
  return entityId != null ? `${event.type}:${String(entityId)}` : event.type
}

/** 将 WS 事件写入通知中心；error 级别同时弹 Toast */
export function ingestWebSocketEvent(event: WebSocketEvent): void {
  const mapped = mapEventToNotification(event)
  if (!mapped) return

  useNotificationStore.getState().addNotification({
    level: mapped.level,
    source: 'websocket',
    title: mapped.title,
    message: mapped.message,
    link: mapped.link,
    dedupKey: dedupKeyFor(event),
  })

  // 直用 sonner 原始 API 弹错误提醒（绕开 toast.ts 包装层，
  // 该层会把 API 错误镜像进通知中心，这里已在上面入库，避免重复）
  if (mapped.toast && mapped.level === 'error') {
    sonnerToast.error(mapped.title, { description: mapped.message })
  }
}
