import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle, Clock, Download, Film, Loader2, Trash2, Video, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import type { VideoTask, TaskStatus } from '../VideoGeneration.js'

interface VideoTaskListProps {
  readonly tasks: readonly VideoTask[]
  readonly onRemoveTask: (taskId: string) => void
}

export function VideoTaskList({ tasks, onRemoveTask }: VideoTaskListProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Film className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-foreground">{t('videoGeneration.taskListTitle')}</span>
        </div>
        <div className="p-4">
          {tasks.length === 0 ? <EmptyVideoTasks /> : <VideoTaskRows tasks={tasks} onRemoveTask={onRemoveTask} />}
        </div>
      </div>
    </motion.div>
  )
}

function EmptyVideoTasks() {
  const { t } = useTranslation()

  return (
    <div className="text-center py-8 text-muted-foreground">
      <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>{t('videoGeneration.noTasksTitle')}</p>
      <p className="text-sm">{t('videoGeneration.tasksAppearHere')}</p>
    </div>
  )
}

function VideoTaskRows({ tasks, onRemoveTask }: VideoTaskListProps) {
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <VideoTaskRow key={task.taskId} task={task} onRemoveTask={onRemoveTask} />
      ))}
    </div>
  )
}

interface VideoTaskRowProps {
  readonly task: VideoTask
  readonly onRemoveTask: (taskId: string) => void
}

function VideoTaskRow({ task, onRemoveTask }: VideoTaskRowProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon(task.status)}
          <span className="font-medium text-sm">{task.taskId.slice(0, 8)}...</span>
          <StatusBadge status={task.status} />
        </div>
        <Button variant="ghost" size="sm" onClick={() => onRemoveTask(task.taskId)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{task.prompt}</p>
      {task.status === 'completed' && task.videoUrl && <CompletedVideoTask task={task} />}
      {task.error && <p className="text-sm text-destructive">{task.error}</p>}
      <div className="text-xs text-muted-foreground">
        {t('videoGeneration.createdAt', { time: new Date(task.createdAt).toLocaleString() })}
      </div>
    </div>
  )
}

function CompletedVideoTask({ task }: { readonly task: VideoTask }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <video src={task.videoUrl} controls className="w-full rounded-lg border" />
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {t('videoGeneration.duration', { duration: formatDuration(task.duration) })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const a = document.createElement('a')
            a.href = task.videoUrl ?? ''
            a.download = `video-${task.taskId}.mp4`
            a.click()
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          {t('videoGeneration.download')}
        </Button>
      </div>
    </div>
  )
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case 'pending':
      return <Clock className="w-5 h-5 text-muted-foreground" />
    case 'processing':
      return <Loader2 className="w-5 h-5 animate-spin text-primary" />
    case 'completed':
      return <CheckCircle className={cn('w-5 h-5', statusTokens.success.icon)} />
    case 'failed':
      return <XCircle className="w-5 h-5 text-destructive" />
    default:
      return <AlertCircle className="w-5 h-5 text-muted-foreground" />
  }
}

function StatusBadge({ status }: { readonly status: TaskStatus }) {
  const { t } = useTranslation()

  switch (status) {
    case 'pending':
      return <Badge variant="secondary">{t('videoGeneration.waiting')}</Badge>
    case 'processing':
      return <Badge variant="default">{t('videoGeneration.processing')}</Badge>
    case 'completed':
      return <Badge variant="secondary" className={cn(statusTokens.success.bgSubtle, statusTokens.success.text)}>{t('videoGeneration.completed')}</Badge>
    case 'failed':
      return <Badge variant="destructive">{t('videoGeneration.failed')}</Badge>
    default:
      return <Badge variant="outline">{t('videoGeneration.unknown')}</Badge>
  }
}

function formatDuration(seconds?: number) {
  if (!seconds) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
