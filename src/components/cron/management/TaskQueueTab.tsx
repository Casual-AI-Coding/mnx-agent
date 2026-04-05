import { useState, useEffect, memo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  ListTodo,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
} from '@/components/ui/Card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useTaskQueueStore } from '@/stores/taskQueue'
import { TaskStatus } from '@/types/cron'
import type { TaskQueueItem } from '@/types/cron'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/components/shared/dateUtils'

export const TaskQueueTab = memo(function TaskQueueTab() {
  const { tasks, loading, fetchTasks, deleteTask, updateTask } = useTaskQueueStore()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [taskToDelete, setTaskToDelete] = useState<TaskQueueItem | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTasks(statusFilter === 'all' ? {} : { status: statusFilter })
  }, [fetchTasks, statusFilter])

  const handleRetry = async (task: TaskQueueItem) => {
    await updateTask(task.id, { status: TaskStatus.Pending, retryCount: task.retryCount + 1 })
  }

  const openDeleteDialog = (task: TaskQueueItem) => {
    setTaskToDelete(task)
  }

  const handleDelete = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete.id)
      setTaskToDelete(null)
    }
  }

  const rowVirtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Task Queue</h3>
          <p className="text-sm text-muted-foreground/70">Monitor and manage pending, running, and completed tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground/70" />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
            >
              <SelectTrigger className="w-40 bg-card/950 border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchTasks()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter((t: TaskQueueItem) => t.status === 'pending').length}
                </p>
                <p className="text-xs text-muted-foreground/70">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter((t: TaskQueueItem) => t.status === 'running').length}
                </p>
                <p className="text-xs text-muted-foreground/70">Running</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter((t: TaskQueueItem) => t.status === 'completed').length}
                </p>
                <p className="text-xs text-muted-foreground/70">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {tasks.filter((t: TaskQueueItem) => t.status === 'failed').length}
                </p>
                <p className="text-xs text-muted-foreground/70">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <ListTodo className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Tasks</h3>
            <p className="text-sm text-muted-foreground/50">Tasks will appear here when jobs are executed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="bg-card border-b border-border">
            <div className="grid grid-cols-[1fr,1fr,0.8fr,0.6fr,1fr,0.7fr,1fr] gap-4 px-4 py-3">
              <div className="text-sm font-medium text-muted-foreground/70">Task Type</div>
              <div className="text-sm font-medium text-muted-foreground/70">Job ID</div>
              <div className="text-sm font-medium text-muted-foreground/70">Status</div>
              <div className="text-sm font-medium text-muted-foreground/70">Priority</div>
              <div className="text-sm font-medium text-muted-foreground/70">Created</div>
              <div className="text-sm font-medium text-muted-foreground/70">Retries</div>
              <div className="text-sm font-medium text-muted-foreground/70 text-right">Actions</div>
            </div>
          </div>
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ maxHeight: '50vh' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualRow) => {
                const task = tasks[virtualRow.index]
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="border-b border-border/50 hover:bg-card/800/30 transition-colors"
                  >
                    <div className="grid grid-cols-[1fr,1fr,0.8fr,0.6fr,1fr,0.7fr,1fr] gap-4 px-4 py-3 items-center h-full">
                      <div>
                        <span className="text-sm text-foreground font-medium">{task.taskType}</span>
                      </div>
                      <div>
                        <code className="text-xs text-muted-foreground font-mono">{task.jobId}</code>
                      </div>
                      <div>
                        <StatusBadge status={task.status} />
                      </div>
                      <div>
                        <Badge variant={task.priority > 5 ? 'default' : 'secondary'}>
                          {task.priority}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(task.createdAt)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {task.retryCount}/{task.maxRetries}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {task.status === 'failed' && task.retryCount < task.maxRetries && (
                          <button
                            onClick={() => handleRetry(task)}
                            className="p-2 rounded-lg hover:bg-card/800 text-muted-foreground/70 hover:text-primary transition-colors"
                            title="Retry"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteDialog(task)}
                          className="p-2 rounded-lg hover:bg-card/800 text-muted-foreground/70 hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Task"
        description={`Are you sure you want to delete this ${taskToDelete?.taskType} task?`}
        confirmText="Delete"
        variant="destructive"
        requireInput="DELETE"
      />
    </div>
  )
})
