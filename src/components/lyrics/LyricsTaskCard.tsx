// src/components/lyrics/LyricsTaskCard.tsx

import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
  Edit3,
  FileText,
  Heart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LyricsTask, LyricsGenerationResponse } from '@/types/lyrics'

interface LyricsTaskCardProps {
  task: LyricsTask
  index: number
  onRetry: (index: number) => void
  onEdit: (result: LyricsGenerationResponse) => void
  onExport: (result: LyricsGenerationResponse) => void
}

const taskVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
}

function getStatusIcon(status: LyricsTask['status']) {
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
  }
}

function getStatusBadge(status: LyricsTask['status']) {
  switch (status) {
    case 'idle':
      return <Badge className="bg-muted/10 text-foreground border-muted/20">待生成</Badge>
    case 'generating':
      return <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border)}>生成中</Badge>
    case 'completed':
      return <Badge className={cn(statusTokens.success.bgSubtle, statusTokens.success.text, statusTokens.success.border)}>已完成</Badge>
    case 'failed':
      return <Badge className={cn(statusTokens.error.bgSubtle, statusTokens.error.text, statusTokens.error.border)}>失败</Badge>
  }
}

function truncateLyrics(lyrics: string, maxLines: number = 4): string {
  const lines = lyrics.split('\n').slice(0, maxLines)
  return lines.join('\n')
}

export function LyricsTaskCard({
  task,
  index,
  onRetry,
  onEdit,
  onExport,
}: LyricsTaskCardProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!task.result) return
    setIsExporting(true)
    try {
      onExport(task.result)
      toastSuccess('歌词已导出')
    } catch (error) {
      toastError('导出失败')
    } finally {
      setIsExporting(false)
    }
  }

  const progressColor = task.status === 'generating' 
    ? statusTokens.info.gradient 
    : task.status === 'completed'
      ? statusTokens.success.gradient
      : task.status === 'failed'
        ? statusTokens.error.gradient
        : 'from-muted/40 to-muted-foreground/70/40'

  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative rounded-xl border bg-card overflow-hidden',
        'hover:shadow-lg transition-shadow duration-200',
        'group'
      )}
    >
      {/* Gradient border glow on hover */}
      <div className={cn(
        'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        'bg-gradient-to-r',
        progressColor,
        'blur-sm -z-10'
      )} />

      {/* Header: status + title */}
      <div className="p-4 flex items-start gap-3">
        {getStatusIcon(task.status)}
        <div className="flex-1 min-w-0">
          {task.result ? (
            <>
              <h3 className="text-sm font-medium truncate">
                {task.result.song_title || '未命名歌曲'}
              </h3>
              {task.result.style_tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {task.result.style_tags.slice(0, 3).map((tag, i) => (
                    <span 
                      key={i}
                      className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {task.status === 'generating' ? '正在创作歌词...' : '等待生成'}
            </div>
          )}
        </div>
        {getStatusBadge(task.status)}
      </div>

      {/* Lyrics preview */}
      {task.result && (
        <div className="px-4 pb-3">
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 max-h-24 overflow-hidden">
            <pre className="whitespace-pre-wrap font-sans">
              {truncateLyrics(task.result.lyrics)}
            </pre>
          </div>
        </div>
      )}

      {/* Error message */}
      {task.status === 'failed' && task.error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-destructive">{task.error}</p>
        </div>
      )}

      {/* Progress bar */}
      {task.status === 'generating' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div 
            className={cn('h-full bg-gradient-to-r animate-pulse', progressColor)}
            style={{ width: '60%' }}
          />
        </div>
      )}

      {/* Actions */}
      {task.result && (
        <div className="px-4 pb-4 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => task.result && onEdit(task.result)}
            className="flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            编辑此歌词
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            导出 TXT
          </Button>
        </div>
      )}

      {/* Retry button */}
      {task.status === 'failed' && (
        <div className="px-4 pb-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRetry(index)}
            className="flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            重试
          </Button>
        </div>
      )}
    </motion.div>
  )
}
