import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  ListTodo,
  ScrollText,
  Gauge,
  Plus,
  Play,
  Pause,
  Edit3,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  MoreHorizontal,
  Calendar,
  Activity,
  Zap,
  Cpu,
  BarChart3,
  FileText,
  Music,
  Video,
  Image as ImageIcon,
  Mic,
  Filter,
  RotateCcw,
  X,
  Terminal,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import {
  useCronJobsStore,
} from '@/stores/cronJobs'
import { useExecutionLogsStore } from '@/stores/executionLogs'
import { useCapacityStore } from '@/stores/capacity'
import { useWorkflowTemplatesStore } from '@/stores/workflowTemplates'
import { useTaskQueueStore } from '@/stores/taskQueue'
import { useCronJobsWebSocket } from '@/hooks/useCronJobsWebSocket'
import { useTaskQueueWebSocket } from '@/hooks/useTaskQueueWebSocket'
import { useExecutionLogsWebSocket } from '@/hooks/useExecutionLogsWebSocket'
import { TaskStatus } from '@/types/cron'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  CapacityRecord,
  ServiceType,
  CreateCronJobDTO,
  UpdateCronJobDTO,
} from '@/types/cron'
import {
  getCronDescription,
  getNextRuns,
  COMMON_TIMEZONES,
  getLocalTimezone,
  formatDateWithTimezone,
} from '@/lib/cron-utils'
import { CronExpressionBuilder } from '@/components/cron/CronExpressionBuilder'

// ============================================
// Helper Components
// ============================================

const StatusBadge = memo(function StatusBadge({ status }: { status: TaskStatus | string }) {
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

const ServiceIcon = memo(function ServiceIcon({ type }: { type: ServiceType }) {
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// ============================================
// Create Job Modal
// ============================================

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCronJobDTO) => void
}

function CreateJobModal({ isOpen, onClose, onSubmit }: CreateJobModalProps) {
  const localTimezone = getLocalTimezone()
  const [formData, setFormData] = useState<CreateCronJobDTO>({
    name: '',
    description: '',
    cronExpression: '',
    timezone: localTimezone,
    workflowId: '',
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { templates, fetchTemplates } = useWorkflowTemplatesStore()

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        cronExpression: '',
        timezone: localTimezone,
        workflowId: '',
        isActive: true,
      })
      setErrors({})
      fetchTemplates()
    }
  }, [isOpen, fetchTemplates, localTimezone])

  const validateCronExpression = (expr: string): boolean => {
    const parts = expr.trim().split(/\s+/)
    return parts.length === 5
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.cronExpression.trim()) {
      newErrors.cronExpression = 'Cron expression is required'
    } else if (!validateCronExpression(formData.cronExpression)) {
      newErrors.cronExpression = 'Invalid cron format. Use: * * * * * (min hour day month weekday)'
    }

    if (!formData.workflowId) {
      newErrors.workflow = 'Please select a workflow'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Create New Cron Job</h2>
            <p className="text-sm text-muted-foreground/70">Schedule automated workflow executions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-card/800 text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Job Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Daily Image Generation"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of what this job does..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Workflow <span className="text-destructive">*</span>
            </label>
            <Select
              value={formData.workflowId}
              onValueChange={(value) => setFormData({ ...formData, workflowId: value })}
            >
              <SelectTrigger className={errors.workflow ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.workflow && (
              <p className="text-sm text-destructive">{errors.workflow}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Cron Expression <span className="text-destructive">*</span>
            </label>
            <CronExpressionBuilder
              value={formData.cronExpression}
              onChange={(expression) => setFormData({ ...formData, cronExpression: expression })}
              timezone={formData.timezone}
            />
            {errors.cronExpression && (
              <p className="text-sm text-destructive">{errors.cronExpression}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Timezone
            </label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.cronExpression && formData.timezone && (
              <div className="text-sm text-muted-foreground/70 mt-1">
                <span className="font-medium">Next 3 runs: </span>
                {getNextRuns(formData.cronExpression, formData.timezone!, 3).map((date, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {formatDateWithTimezone(date, formData.timezone!)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <span className="text-sm text-muted-foreground">Active on create</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Create Job
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

interface EditJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: UpdateCronJobDTO) => void
  job: CronJob | null
}

function EditJobModal({ isOpen, onClose, onSubmit, job }: EditJobModalProps) {
  const [formData, setFormData] = useState<UpdateCronJobDTO>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { templates, fetchTemplates } = useWorkflowTemplatesStore()

  useEffect(() => {
    if (isOpen && job) {
      setFormData({
        name: job.name,
        description: job.description,
        cronExpression: job.cronExpression,
        timezone: job.timezone || getLocalTimezone(),
        workflowId: job.workflowId ?? undefined,
        isActive: job.isActive,
      })
      setErrors({})
      fetchTemplates()
    }
  }, [isOpen, job, fetchTemplates])

  const validateCronExpression = (expr: string): boolean => {
    const parts = expr.trim().split(/\s+/)
    return parts.length === 5
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.cronExpression?.trim()) {
      newErrors.cronExpression = 'Cron expression is required'
    } else if (!validateCronExpression(formData.cronExpression)) {
      newErrors.cronExpression = 'Invalid cron format. Use: * * * * * (min hour day month weekday)'
    }

    if (!formData.workflowId) {
      newErrors.workflow = 'Please select a workflow'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
    onClose()
  }

  if (!isOpen || !job) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-xl"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Edit Cron Job</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name ?? ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Daily report generation"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <Textarea
              value={formData.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Workflow <span className="text-destructive">*</span>
            </label>
            <Select
              value={formData.workflowId}
              onValueChange={(value) => setFormData({ ...formData, workflowId: value })}
            >
              <SelectTrigger className={errors.workflow ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.workflow && (
              <p className="text-sm text-destructive">{errors.workflow}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Cron Expression <span className="text-destructive">*</span>
            </label>
            <CronExpressionBuilder
              value={formData.cronExpression ?? ''}
              onChange={(expression) => setFormData({ ...formData, cronExpression: expression })}
              timezone={formData.timezone || getLocalTimezone()}
            />
            {errors.cronExpression && (
              <p className="text-sm text-destructive">{errors.cronExpression}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Timezone
            </label>
            <Select
              value={formData.timezone || getLocalTimezone()}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.cronExpression && formData.timezone && (
              <div className="text-sm text-muted-foreground/70 mt-1">
                <span className="font-medium">Next 3 runs: </span>
                {getNextRuns(formData.cronExpression, formData.timezone!, 3).map((date, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {formatDateWithTimezone(date, formData.timezone!)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive ?? true}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ============================================
// Virtualized Table Components
// ============================================

interface VirtualTableContainerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const VirtualTableContainer = memo(function VirtualTableContainer({
  children,
  className = '',
  style,
}: VirtualTableContainerProps) {
  return (
    <div
      className={`overflow-auto ${className}`}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  )
})

// ============================================
// Jobs List Tab - Virtualized
// ============================================

const JobsListTab = memo(function JobsListTab() {
  const { jobs, loading, fetchJobs, createJob, updateJob, deleteJob, toggleJob, runJobManually } =
    useCronJobsStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [jobToEdit, setJobToEdit] = useState<CronJob | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && job.isActive) ||
        (statusFilter === 'inactive' && !job.isActive)
      return matchesSearch && matchesStatus
    })
  }, [jobs, searchQuery, statusFilter])

  const handleCreateJob = async (data: CreateCronJobDTO) => {
    await createJob(data)
  }

  const handleEditJob = async (data: UpdateCronJobDTO) => {
    if (jobToEdit) {
      await updateJob(jobToEdit.id, data)
      setJobToEdit(null)
    }
  }

  const openEditModal = (job: CronJob) => {
    setJobToEdit(job)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      await deleteJob(id)
    }
  }

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cron Jobs</h3>
          <p className="text-sm text-muted-foreground/70">Manage scheduled workflow executions</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredJobs.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Cron Jobs Found</h3>
            <p className="text-sm text-muted-foreground/50 mb-6 max-w-md mx-auto">
              {jobs.length === 0 
                ? "Create your first cron job to automate workflow executions on a schedule."
                : "No jobs match your current search or filter criteria."}
            </p>
            {jobs.length === 0 && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Job
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="bg-muted/30 border-b border-border">
            <div className="grid grid-cols-[2fr_1fr_80px_1fr_1fr_80px_120px] gap-4 px-4 py-3">
              <div className="text-sm font-medium text-muted-foreground/70">Name</div>
              <div className="text-sm font-medium text-muted-foreground/70">Cron</div>
              <div className="text-sm font-medium text-muted-foreground/70">Status</div>
              <div className="text-sm font-medium text-muted-foreground/70">Last Run</div>
              <div className="text-sm font-medium text-muted-foreground/70">Next Run</div>
              <div className="text-sm font-medium text-muted-foreground/70 text-center">Runs</div>
              <div className="text-sm font-medium text-muted-foreground/70 text-right">Actions</div>
            </div>
          </div>
          <div className="overflow-auto max-h-[60vh]">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-[2fr_1fr_80px_1fr_1fr_80px_120px] gap-4 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors items-center"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{job.name}</p>
                  {job.description && (
                    <p className="text-xs text-muted-foreground/50 truncate">{job.description}</p>
                  )}
                </div>
                <div className="min-w-0">
                  <code className="text-xs text-primary font-mono bg-muted/50 px-2 py-1 rounded truncate block">
                    {job.cronExpression}
                  </code>
                  <p className="text-xs text-muted-foreground/50 mt-1">
                    {getCronDescription(job.cronExpression)}
                  </p>
                </div>
                <div className="flex justify-center">
                  <StatusBadge status={job.isActive ? 'active' : 'inactive'} />
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {formatDate(job.lastRunAt)}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {formatDate(job.nextRunAt)}
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  {job.totalRuns}
                  {job.totalFailures > 0 && (
                    <span className="text-destructive ml-1">({job.totalFailures})</span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => toggleJob(job.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
                    title={job.isActive ? 'Pause' : 'Activate'}
                  >
                    {job.isActive ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => runJobManually(job.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                    title="Run Now"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(job)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateJob}
      />

      <EditJobModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setJobToEdit(null)
        }}
        onSubmit={handleEditJob}
        job={jobToEdit}
      />
    </div>
  )
})

// ============================================
// Task Queue Tab
// ============================================

const TaskQueueTab = memo(function TaskQueueTab() {
  const { tasks, loading, filter, fetchTasks, deleteTask, updateTask } = useTaskQueueStore()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTasks(statusFilter === 'all' ? {} : { status: statusFilter })
  }, [fetchTasks, statusFilter])

  const handleRetry = async (task: TaskQueueItem) => {
    await updateTask(task.id, { status: TaskStatus.Pending, retryCount: task.retryCount + 1 })
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id)
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
                        <code className="text-xs text-muted-foreground/70 font-mono truncate block">{task.jobId}</code>
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
                          onClick={() => handleDelete(task.id)}
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
    </div>
  )
})

// ============================================
// Execution Logs Tab
// ============================================

const ExecutionLogsTab = memo(function ExecutionLogsTab() {
  const { logs, loading, fetchLogs } = useExecutionLogsStore()
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const filteredLogs = statusFilter === 'all' 
    ? logs 
    : logs.filter((log) => log.status === statusFilter)

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Execution Logs</h3>
          <p className="text-sm text-muted-foreground/70">View historical execution data and task breakdowns</p>
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <ScrollText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Execution Logs</h3>
            <p className="text-sm text-muted-foreground/50">Logs will appear here after jobs are executed.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight: '70vh' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const log = filteredLogs[virtualRow.index]
              return (
                <motion.div
                  key={log.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-3"
                >
                  <Card
                    className={`cursor-pointer transition-colors ${
                      expandedLogId === log.id ? 'bg-card/800/50' : 'hover:bg-card/800/30'
                    }`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <StatusBadge status={log.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-muted-foreground font-mono">{log.jobId}</code>
                            <Badge variant="outline" className="text-xs">
                              {log.triggerType}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground/50 mt-1">
                            {formatDate(log.startedAt)} • Duration: {formatDuration(log.durationMs)}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-foreground font-medium">{log.tasksExecuted}</p>
                            <p className="text-xs text-muted-foreground/50">Executed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 font-medium">{log.tasksSucceeded}</p>
                            <p className="text-xs text-muted-foreground/50">Succeeded</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-medium ${log.tasksFailed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {log.tasksFailed}
                            </p>
                            <p className="text-xs text-muted-foreground/50">Failed</p>
                          </div>
                        </div>
                        <button className="p-1 rounded hover:bg-card/700">
                          {expandedLogId === log.id ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground/70" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground/70" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedLogId === log.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 mt-4 border-t border-border">
                              <h4 className="text-sm font-medium text-muted-foreground mb-3">Task Breakdown</h4>
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-card/950 rounded-lg p-3">
                                  <p className="text-2xl font-bold text-foreground">{log.tasksExecuted}</p>
                                  <p className="text-xs text-muted-foreground/50">Total Tasks</p>
                                </div>
                                <div className="bg-card/950 rounded-lg p-3">
                                  <p className="text-2xl font-bold text-green-400">{log.tasksSucceeded}</p>
                                  <p className="text-xs text-muted-foreground/50">Succeeded</p>
                                </div>
                                <div className="bg-card/950 rounded-lg p-3">
                                  <p className={`text-2xl font-bold ${log.tasksFailed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {log.tasksFailed}
                                  </p>
                                  <p className="text-xs text-muted-foreground/50">Failed</p>
                                </div>
                              </div>
                              {log.errorSummary && (
                                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                    <span className="text-sm font-medium text-destructive">Error Summary</span>
                                  </div>
                                  <p className="text-sm text-destructive/80">{log.errorSummary}</p>
                                </div>
                              )}
                              {log.logDetail && (
                                <div className="mt-4">
                                  <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <Terminal className="w-4 h-4" />
                                    Log Details
                                  </h5>
                                  <pre className="bg-card/950 rounded-lg p-3 text-xs text-muted-foreground/70 font-mono overflow-x-auto">
                                    {log.logDetail}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})

// ============================================
// Main Cron Management Page
// ============================================

export default function CronManagement() {
  useCronJobsWebSocket()
  useTaskQueueWebSocket()
  useExecutionLogsWebSocket()

  const [activeTab, setActiveTab] = useState('jobs')

  const tabs = [
    { id: 'jobs', label: 'Jobs List', icon: ListTodo },
    { id: 'queue', label: 'Task Queue', icon: Activity },
    { id: 'logs', label: 'Execution Logs', icon: ScrollText },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cron Management</h1>
          <p className="text-muted-foreground/70 mt-2">
            Schedule, monitor, and manage automated workflow executions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="jobs" className="mt-6">
              <JobsListTab />
            </TabsContent>
            <TabsContent value="queue" className="mt-6">
              <TaskQueueTab />
            </TabsContent>
            <TabsContent value="logs" className="mt-6">
              <ExecutionLogsTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}
