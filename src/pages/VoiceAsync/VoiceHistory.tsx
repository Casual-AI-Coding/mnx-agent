import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Volume2,
  Trash2,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status as statusTokens, services } from '@/themes/tokens'
import { Badge } from '@/components/ui/Badge'
import type { Task, TaskStatus, VoiceHistoryProps, VoiceTaskCardProps } from './types'

const taskVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.3 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return (
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusTokens.warning.bgSubtle)}>
          <Clock className={cn('w-4 h-4', statusTokens.warning.icon)} />
        </div>
      )
    case 'processing':
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

function getStatusBadge(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return (
        <Badge className={cn(statusTokens.warning.bgSubtle, statusTokens.warning.text, statusTokens.warning.border, 'hover:bg-warning/20')}>
          等待中
        </Badge>
      )
    case 'processing':
      return (
        <Badge className={cn(statusTokens.info.bgSubtle, statusTokens.info.text, statusTokens.info.border, 'hover:bg-info/20')}>
          处理中
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

function getProgressForStatus(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return 25
    case 'processing':
      return 60
    case 'completed':
      return 100
    case 'failed':
      return 100
    default:
      return 0
  }
}

function getProgressColor(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return statusTokens.warning.gradient
    case 'processing':
      return statusTokens.info.gradient
    case 'completed':
      return statusTokens.success.gradient
    case 'failed':
      return statusTokens.error.gradient
    default:
      return 'from-muted/40 to-muted-foreground/70/40'
  }
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function VoiceTaskCard({ task, onRemove, onDownload }: VoiceTaskCardProps) {
  return (
    <motion.div
      variants={taskVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="group relative"
    >
      {task.status === 'processing' && (
        <div className={cn('absolute inset-0 blur-xl rounded-2xl animate-pulse', statusTokens.info.bgSubtle)} />
      )}

      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
          task.status === 'completed'
            ? cn('bg-card/80', statusTokens.success.border)
            : task.status === 'processing'
              ? cn('bg-card/80', statusTokens.info.border)
              : task.status === 'failed'
                ? cn('bg-card/80', statusTokens.error.border)
                : 'bg-card/60 border-border/50'
        }`}
      >
        <div
          className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${getProgressColor(task.status)} transition-all duration-500`}
          style={{ width: `${getProgressForStatus(task.status)}%` }}
        />

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(task.status)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-foreground">
                    {task.taskId.slice(0, 8)}...
                  </span>
                  {getStatusBadge(task.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(task.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={onRemove}
              className={cn('p-2 rounded-lg text-muted-foreground transition-colors opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error/10')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <div
              className={`absolute inset-0 rounded-lg opacity-10 ${
                task.status === 'completed'
                  ? statusTokens.success.bg
                  : task.status === 'processing'
                    ? statusTokens.info.bg
                    : task.status === 'failed'
                      ? statusTokens.error.bg
                      : 'bg-muted'
              }`}
            />
            <p className="relative p-3 text-sm text-muted-foreground/70 line-clamp-2">
              {task.text.slice(0, 150)}
              {task.text.length > 150 ? '...' : ''}
            </p>
          </div>

          {task.status === 'completed' && task.result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <button
                onClick={() =>
                  onDownload(
                    task.result!.audioUrl,
                    `audio-${task.taskId}.mp3`
                  )
                }
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all duration-200 group/btn border border-secondary/20', services.voice.bg, 'hover:opacity-80', services.voice.text)}
              >
                <Download
                  className="w-4 h-4 group-hover/btn:animate-bounce"
                />
                <span className="font-medium">
                  下载音频
                  {task.result.audioLength > 0 && (
                    <span className={cn('ml-1 opacity-70', services.voice.text)}>
                      ({formatDuration(task.result.audioLength)})
                    </span>
                  )}
                </span>
              </button>
              {task.result.subtitleUrl && (
                <button
                  onClick={() =>
                    onDownload(
                      task.result!.subtitleUrl!,
                      `subtitle-${task.taskId}.srt`
                    )
                  }
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-secondary/50 hover:bg-secondary/50 border border-border text-foreground rounded-lg transition-all duration-200"
                >
                  <FileText className="w-4 h-4" />
                  <span>字幕</span>
                </button>
              )}
            </motion.div>
          )}

          {task.error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex items-center gap-2 p-3 rounded-lg', statusTokens.error.bgSubtle, statusTokens.error.border)}
            >
              <XCircle className={cn('w-4 h-4 shrink-0', statusTokens.error.icon)} />
              <p className={cn('text-sm', statusTokens.error.text)}>{task.error}</p>
            </motion.div>
          )}

          {task.status === 'processing' && (
            <div className={cn('flex items-center gap-2 text-xs', statusTokens.info.text)}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>正在生成音频，请稍候...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function VoiceHistory({ tasks, onRemoveTask, onDownload }: VoiceHistoryProps) {
  return (
    <motion.div variants={cardVariants}>
      <div className="relative group h-full">
        <div className={cn('absolute inset-0 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity', statusTokens.warning.bgSubtle)} />
        <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden h-full">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', statusTokens.warning.bgSubtle)}>
                <Clock className={cn('w-4 h-4', statusTokens.warning.icon)} />
              </div>
              <div className="font-semibold text-foreground">任务列表</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {tasks.length} 个任务
            </div>
          </div>

          <div className="p-6 max-h-[800px] overflow-y-auto task-scrollbar">
            {tasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              >
                <div className="relative">
                  <div className={cn('absolute inset-0 blur-3xl rounded-full', statusTokens.warning.bgSubtle)} />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-card border border-border flex items-center justify-center">
                    <Volume2 className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="mt-6 text-lg font-medium text-muted-foreground/70">暂无任务</p>
                <p className="text-sm text-muted-foreground/50 mt-2">
                  创建任务后将显示在这里
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                  {tasks.map((task, index) => (
                    <VoiceTaskCard
                      key={task.taskId}
                      task={task}
                      onRemove={() => onRemoveTask(task.taskId)}
                      onDownload={onDownload}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .task-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .task-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .task-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(45, 212, 191, 0.3), rgba(34, 211, 238, 0.2));
          border-radius: 3px;
        }
        .task-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(45, 212, 191, 0.5), rgba(34, 211, 238, 0.4));
        }
      `}</style>
    </motion.div>
  )
}
