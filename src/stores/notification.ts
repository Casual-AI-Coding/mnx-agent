import { create } from 'zustand'

/**
 * 全局通知中心 store（R-016）
 *
 * 聚合 WebSocket 推送、API 错误、系统公告等来源的通知：
 * - 同键（source + dedupKey）通知在去重窗口内合并为一条，count 递增
 * - Toast 只承载高优先级即时提醒；本 store 是完整归档
 * - 会话级存储（不持久化），上限 MAX_NOTIFICATIONS 条，超出丢弃最旧
 */

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export type NotificationSource = 'websocket' | 'api' | 'system' | 'announcement'

export interface AppNotification {
  id: string
  level: NotificationLevel
  source: NotificationSource
  title: string
  message?: string
  /** 点击通知跳转的路由 */
  link?: string
  timestamp: number
  read: boolean
  /** 去重合并后的事件次数（>= 1） */
  count: number
  /** 去重键：默认 `source:title` */
  dedupKey: string
}

export interface NotificationInput {
  level: NotificationLevel
  source: NotificationSource
  title: string
  message?: string
  link?: string
  /** 去重键，默认 source:title */
  dedupKey?: string
}

interface NotificationState {
  notifications: AppNotification[]
  /** 未读数（衍生值缓存，避免组件重复计算） */
  unreadCount: number
  addNotification: (input: NotificationInput) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

export const MAX_NOTIFICATIONS = 50
/** 同键通知的去重合并窗口 */
export const DEDUP_WINDOW_MS = 60_000

let nextId = 1
function makeId(): string {
  const id = `ntf-${nextId}`
  nextId += 1
  return id
}

function recomputeUnread(notifications: AppNotification[]): number {
  return notifications.reduce((sum, n) => (n.read ? sum : sum + 1), 0)
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (input) => {
    set((state) => {
      const key = input.dedupKey ?? `${input.source}:${input.title}`
      const now = Date.now()

      // 去重窗口内的同键通知：合并计数并刷新时间，保持未读
      const existingIndex = state.notifications.findIndex(
        (n) => n.dedupKey === key && now - n.timestamp < DEDUP_WINDOW_MS
      )
      if (existingIndex >= 0) {
        const notifications = state.notifications.map((n, i) => (
          i === existingIndex
            ? { ...n, count: n.count + 1, timestamp: now, read: false, message: input.message ?? n.message }
            : n
        ))
        return { notifications, unreadCount: recomputeUnread(notifications) }
      }

      const notification: AppNotification = {
        id: makeId(),
        level: input.level,
        source: input.source,
        title: input.title,
        message: input.message,
        link: input.link,
        timestamp: now,
        read: false,
        count: 1,
        dedupKey: key,
      }
      const notifications = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS)
      return { notifications, unreadCount: recomputeUnread(notifications) }
    })
  },

  markRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { notifications, unreadCount: recomputeUnread(notifications) }
    })
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  clear: () => {
    set({ notifications: [], unreadCount: 0 })
  },
}))
