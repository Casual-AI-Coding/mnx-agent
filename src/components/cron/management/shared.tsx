import { memo } from 'react'
import {
  CheckCircle2,
  Pause,
  Clock,
  Loader2,
  XCircle,
  X,
  RotateCcw,
  Zap,
  FileText,
  Mic,
  Image as ImageIcon,
  Music,
  Video,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { TaskStatus, ServiceType } from '@/types/cron'

// Status badge component
export const StatusBadge = memo(function StatusBadge({ status }: { status: TaskStatus | string }) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    active: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
    inactive: { variant: 'secondary', icon: <Pause className="w-3 h-3" /> },
    pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    running: { variant: 'default', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    completed: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
    cancelled: { variant: 'outline', icon: <X className="w-3 h-3" /> },
    cron: { variant: 'secondary', icon: <Clock className="w-3 h-3" /> },
    manual: { variant: 'default', icon: <Zap className="w-3 h-3" /> },
    retry: { variant: 'outline', icon: <RotateCcw className="w-3 h-3" /> },
  }

  const config = variants[status] || variants.inactive

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      <span className="capitalize">{status}</span>
    </Badge>
  )
})

// Service icon component
export const ServiceIcon = memo(function ServiceIcon({ type }: { type: ServiceType }) {
  const icons: Record<ServiceType, React.ReactNode> = {
    text: <FileText className="w-5 h-5" />,
    voice_sync: <Mic className="w-5 h-5" />,
    voice_async: <Mic className="w-5 h-5" />,
    image: <ImageIcon className="w-5 h-5" />,
    music: <Music className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
  }

  const colors: Record<ServiceType, string> = {
    text: 'text-primary-400 bg-primary-500/10',
    voice_sync: 'text-green-400 bg-green-500/10',
    voice_async: 'text-teal-400 bg-teal-500/10',
    image: 'text-purple-400 bg-purple-500/10',
    music: 'text-pink-400 bg-pink-500/10',
    video: 'text-orange-400 bg-orange-500/10',
  }

  return (
    <div className={`p-2 rounded-lg ${colors[type]}`}>
      {icons[type]}
    </div>
  )
})

// Format date helper
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format duration helper
export function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}
