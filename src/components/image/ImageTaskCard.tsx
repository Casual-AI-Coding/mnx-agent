import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens, services } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export type ImageTaskStatus = 'idle' | 'generating' | 'completed' | 'failed'

export interface ImageTask {
  id: string
  status: ImageTaskStatus
  progress: number
  imageUrl?: string
  error?: string
  retryCount: number
}

interface ImageTaskCardProps {
  task: ImageTask
  index: number
  onRetry: (index: number) => void
  onDownload: (imageUrl: string, filename: string) => void
}

const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}

function getStatusIcon(status: ImageTaskStatus) {
  switch (status) {
    case 'idle':
      return (
        <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
        </div>
      )
    case 'generating':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.info.bgSubtle)}>
          <Loader2 className={cn('w-4 h-4 animate-spin', statusTokens.info.icon)} />
        </div>
      )
    case 'completed':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.success.bgSubtle)}>
          <CheckCircle className={cn('w-4 h-4', statusTokens.success.icon)} />
        </div>
      )
    case 'failed':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.error.bgSubtle)}>
          <XCircle className={cn('w-4 h-4', statusTokens.error.icon)} />
        </div>
      )
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-muted-foreground/70" />
        </div>
      )
  }
}

function getStatusBadge(status: ImageTaskStatus) {
  switch (status) {
    case 'idle':
      return (
        <Badge className="bg-muted/10 text-foreground border-muted/20">
          待生成
        </Badge>
      )
    case 'generating':
      return (
        <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border, 'hover:bg-info/20')}>
          生成中
        </Badge>
      )
    case 'completed':
      return (
        <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border, 'hover:bg-success/20')}>
          已完成
        </Badge>
      )
    case 'failed':
      return (
        <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border, 'hover:bg-error/20')}>
          失败
        </Badge>
      )
    default:
      return (
        <Badge className="bg-muted/10 text-foreground border-muted/20">
          未知
        </Badge>
      )
  }
}

function getProgressColor(status: ImageTaskStatus) {
  switch (status) {
    case 'generating':
      return statusTokens.info.gradient
    case 'completed':
      return statusTokens.success.gradient
    case 'failed':
      return statusTokens.error.gradient
    default:
      return 'from-muted/40 to-muted-foreground/70/40'
  }
}

export function ImageTaskCard({ task, index, onRetry, onDownload }: ImageTaskCardProps) {
  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      layout
      className="group relative"
    >
      {task.status === 'generating' && (
        <div className={cn('absolute inset-0 blur-xl rounded-2xl animate-pulse', statusTokens.info.bgSubtle)} />
      )}

      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
          task.status === 'completed'
            ? cn('bg-card/80', statusTokens.success.border)
            : task.status === 'generating'
              ? cn('bg-card/80', statusTokens.info.border)
              : task.status === 'failed'
                ? cn('bg-card/80', statusTokens.error.border)
                : 'bg-card/60 border-border/50'
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${getProgressColor(task.status)} transition-all duration-500`}
          style={{ width: `${task.progress}%` }}
        />

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(task.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground">
                    #{index + 1}
                  </span>
                  {getStatusBadge(task.status)}
                </div>
                {task.retryCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    已重试 {task.retryCount} 次
                  </p>
                )}
              </div>
            </div>
          </div>

          {task.status === 'generating' && (
            <div className={cn('flex items-center gap-2 text-xs', statusTokens.info.text)}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>正在生成图片，请稍候...</span>
            </div>
          )}

          {task.status === 'completed' && task.imageUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={cn('relative rounded-lg p-3', services.image.bg)}>
                <img
                  key={task.imageUrl}
                  src={task.imageUrl}
                  alt={`Generated image ${task.id}`}
                  className="w-full rounded-lg object-cover max-h-64"
                />
              </div>

              <Button
                onClick={() => onDownload(task.imageUrl!, `image-${task.id}.png`)}
                variant="outline"
                className={cn('w-full', services.image.bg, services.image.text, 'hover:opacity-80')}
              >
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
            </motion.div>
          )}

          {task.status === 'failed' && task.error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className={cn('flex items-center gap-2 p-3 rounded-lg', statusTokens.error.bgSubtle, statusTokens.error.border)}>
                <XCircle className={cn('w-4 h-4 shrink-0', statusTokens.error.icon)} />
                <p className={cn('text-sm', statusTokens.error.text)}>{task.error}</p>
              </div>

              <Button
                onClick={() => onRetry(index)}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重试生成
              </Button>

              {task.retryCount >= 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  已多次重试失败，建议检查参数或稍后重试
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}