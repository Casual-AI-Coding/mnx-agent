import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Bell, CheckCheck, Info, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useNotificationStore, type AppNotification, type NotificationLevel } from '@/stores/notification'
import { getCurrentAnnouncements } from '@/lib/api/announcements'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'

const LEVEL_ICONS: Record<NotificationLevel, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const LEVEL_COLORS: Record<NotificationLevel, string> = {
  info: 'text-info',
  success: statusTokens.success.icon,
  warning: statusTokens.warning.icon,
  error: statusTokens.error.icon,
}

const SOURCE_LABELS: Record<AppNotification['source'], string> = {
  websocket: '实时',
  api: '接口',
  system: '系统',
  announcement: '公告',
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

/**
 * 全局通知中心（R-016）：Header 铃铛入口 + 下拉面板。
 * 聚合 WebSocket 推送 / API 错误 / 系统公告；支持已读、全部已读、清空、点击跳转。
 */
export function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markRead, markAllRead, clear, addNotification } = useNotificationStore()

  const loadAnnouncements = useCallback(async () => {
    const result = await getCurrentAnnouncements()
    if (!result.success || !result.data) return
    for (const item of result.data) {
      addNotification({
        level: item.severity,
        source: 'announcement',
        title: item.title,
        message: item.content,
        // 公告以自身 id 去重，重复拉取不产生重复条目
        dedupKey: `announcement:${item.id}`,
      })
    }
  }, [addNotification])

  useEffect(() => {
    void loadAnnouncements()
  }, [loadAnnouncements])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleItemClick = (item: AppNotification) => {
    markRead(item.id)
    if (item.link) {
      setOpen(false)
      navigate(item.link)
    }
  }

  return (
    <div className="relative" ref={containerRef} data-testid="notification-center">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-all"
        aria-label={`通知中心${unreadCount > 0 ? `（${unreadCount} 条未读）` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold leading-4 text-center',
              statusTokens.error.bg,
              'text-error-foreground'
            )}
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-[340px] max-w-[calc(100vw-2rem)] bg-card border border-border/60 rounded-xl shadow-lg z-50 overflow-hidden"
            data-testid="notification-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">通知中心</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => markAllRead()}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
                  aria-label="全部已读"
                  title="全部已读"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={() => clear()}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
                  aria-label="清空通知"
                  title="清空通知"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
                  aria-label="关闭通知面板"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground/70">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  暂无通知
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-secondary/50',
                        !item.read && 'bg-primary-400/5'
                      )}
                      data-testid="notification-item"
                    >
                      <LevelIcon icon={LEVEL_ICONS[item.level]} className={cn('w-4 h-4 mt-0.5 shrink-0', LEVEL_COLORS[item.level])} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm truncate', item.read ? 'text-muted-foreground' : 'text-foreground font-medium')}>
                            {item.title}
                          </span>
                          {item.count > 1 && (
                            <span className="shrink-0 px-1.5 h-4 rounded-full bg-secondary text-[10px] leading-4 text-muted-foreground tabular-nums">
                              ×{item.count}
                            </span>
                          )}
                        </div>
                        {item.message && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">{item.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/50">
                          <span>{SOURCE_LABELS[item.source]}</span>
                          <span>{timeAgo(item.timestamp)}</span>
                          {!item.read && <span className={cn('w-1.5 h-1.5 rounded-full', statusTokens.error.bg)} aria-label="未读" />}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 小包装：动态渲染 level 图标 */
function LevelIcon({ icon: Icon, className }: { icon: typeof Info; className: string }) {
  return <Icon className={className} />
}
