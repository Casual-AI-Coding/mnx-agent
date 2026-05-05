import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Loader2, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import type { MusicTaskStatus } from '../MusicTaskCard.js'

export function getProgressColor(status: MusicTaskStatus) {
  if (status === 'generating') return statusTokens.info.gradient
  if (status === 'completed') return statusTokens.success.gradient
  if (status === 'failed') return statusTokens.error.gradient
  return 'from-muted/40 to-muted-foreground/70/40'
}

export function TaskStatusMeta({ index, retryCount, status }: { index: number; retryCount: number; status: MusicTaskStatus }) {
  const icon = {
    idle: <div className="w-8 h-8 rounded-full bg-muted/10 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-muted-foreground/70" /></div>,
    generating: <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.info.bgSubtle)}><Loader2 className={cn('w-4 h-4 animate-spin', statusTokens.info.icon)} /></div>,
    completed: <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.success.bgSubtle)}><CheckCircle className={cn('w-4 h-4', statusTokens.success.icon)} /></div>,
    failed: <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.error.bgSubtle)}><XCircle className={cn('w-4 h-4', statusTokens.error.icon)} /></div>,
  }[status]
  const badge = {
    idle: <Badge className="bg-muted/10 text-foreground border-muted/20">待生成</Badge>,
    generating: <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border, 'hover:bg-info/20')}>生成中</Badge>,
    completed: <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border, 'hover:bg-success/20')}>已完成</Badge>,
    failed: <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border, 'hover:bg-error/20')}>失败</Badge>,
  }[status]

  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">#{index + 1}</span>
          {badge}
        </div>
        {retryCount > 0 && <p className="text-xs text-muted-foreground mt-0.5">已重试 {retryCount} 次</p>}
      </div>
    </div>
  )
}

export function GeneratingState() {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 gap-4', statusTokens.info.text)}>
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 rounded-full bg-blue-500/10" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">正在生成音乐</p>
        <p className="text-xs text-muted-foreground">请稍候...</p>
      </div>
    </div>
  )
}

export function DeletedState() {
  return (
    <div className="min-h-[130px] flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-muted/10 border border-muted/20">
      <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center">
        <Trash2 className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground text-center">音乐已删除</p>
    </div>
  )
}

export function FailedState({ error, onRetry, retryCount }: { error: string; onRetry: () => void; retryCount: number }) {
  return (
    <div className="space-y-4 py-2">
      <div className={cn('flex flex-col items-center gap-3 p-4 rounded-xl', statusTokens.error.bgSubtle, statusTokens.error.border)}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <XCircle className={cn('w-6 h-6', statusTokens.error.icon)} />
        </div>
        <p className={cn('text-sm text-center', statusTokens.error.text)}>{error}</p>
      </div>

      <motion.button
        onClick={onRetry}
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium border border-input bg-background px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
      >
        <RotateCcw className="w-4 h-4" />
        重试生成
      </motion.button>

      {retryCount >= 3 && <p className="text-xs text-muted-foreground text-center">已多次重试失败，建议检查参数或稍后重试</p>}
    </div>
  )
}
