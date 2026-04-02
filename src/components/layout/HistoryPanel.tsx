import { useHistoryStore, HistoryItem } from '@/stores/history'
import { History, X, Image, MessageSquare, Video, Music, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
}

const typeConfig: Record<
  HistoryItem['type'],
  { label: string; icon: typeof Image; color: string }
> = {
  text: { label: '文本', icon: MessageSquare, color: 'text-blue-400' },
  voice: { label: '语音', icon: Mic, color: 'text-green-400' },
  image: { label: '图片', icon: Image, color: 'text-purple-400' },
  music: { label: '音乐', icon: Music, color: 'text-pink-400' },
  video: { label: '视频', icon: Video, color: 'text-orange-400' },
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const items = useHistoryStore((state) => state.items)

  return (
    <div
      className={cn(
        'fixed top-[60px] right-0 h-[calc(100vh-60px)] w-[360px]',
        'bg-card border-l border-border z-30',
        'transition-transform duration-300 ease-in-out',
        'flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">生成历史</h2>
          {items.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground text-sm">暂无生成记录</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {items.map((item) => {
              const config = typeConfig[item.type]
              const Icon = config.icon

              return (
                <button
                  key={item.id}
                  className="w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-transparent hover:border-border transition-all text-left group"
                  onClick={() => console.log('View history item:', item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        'bg-card group-hover:bg-secondary transition-colors'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground/60">
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {item.input}
                      </p>
                      {item.output && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {item.output}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
