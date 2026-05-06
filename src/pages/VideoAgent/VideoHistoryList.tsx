import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Download, Film, Trash2, Video } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { VIDEO_AGENT_TEMPLATES } from '@/types'

export type TaskStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

export interface AgentTask {
  id: string
  taskId: string
  status: TaskStatus
  templateId: string
  inputs: Record<string, string>
  createdAt: number
  videoUrl?: string
  duration?: number
  error?: string
}

interface VideoHistoryListProps {
  formatDuration: (seconds?: number) => string
  getStatusBadge: (status: TaskStatus) => ReactNode
  getStatusIcon: (status: TaskStatus) => ReactNode
  tasks: AgentTask[]
  onDownload: (task: AgentTask) => void
  onRemoveTask: (taskId: string) => void
}

export function VideoHistoryList({
  formatDuration,
  getStatusBadge,
  getStatusIcon,
  tasks,
  onDownload,
  onRemoveTask,
}: VideoHistoryListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="w-5 h-5" />
              任务列表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无任务</p>
                <p className="text-sm">创建任务后将显示在这里</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.taskId} className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusIcon(task.status)}
                        <span className="font-medium text-sm truncate">{task.taskId.slice(0, 8)}...</span>
                        {getStatusBadge(task.status)}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onRemoveTask(task.taskId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="text-sm">
                      <Badge variant="outline" className="mb-1">
                        {VIDEO_AGENT_TEMPLATES.find((template) => template.id === task.templateId)?.name}
                      </Badge>
                      <p className="text-muted-foreground break-words">
                        {Object.entries(task.inputs).map(([key, value]) => `${key}: ${value}`).join(', ')}
                      </p>
                    </div>

                    {task.status === 'completed' && task.videoUrl && (
                      <div className="space-y-3">
                        <video src={task.videoUrl} controls className="w-full rounded-lg border" />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-muted-foreground">时长: {formatDuration(task.duration)}</span>
                          <Button variant="outline" size="sm" onClick={() => onDownload(task)}>
                            <Download className="w-4 h-4 mr-2" />
                            下载
                          </Button>
                        </div>
                      </div>
                    )}

                    {task.error && <p className="text-sm text-destructive">{task.error}</p>}

                    <div className="text-xs text-muted-foreground">创建时间: {new Date(task.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
