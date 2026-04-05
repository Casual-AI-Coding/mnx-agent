import { useState, useEffect, memo, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Plus,
  Play,
  Pause,
  Edit3,
  Trash2,
  Search,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useCronJobsStore } from '@/stores/cronJobs'
import { useWorkflowTemplatesStore } from '@/stores/workflowTemplates'
import type { CronJob, CreateCronJobDTO, UpdateCronJobDTO } from '@/types/cron'
import { getCronDescription } from '@/lib/cron-utils'
import { CreateJobModal } from './CreateJobModal'
import { EditJobModal } from './EditJobModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/components/shared/dateUtils'

export const CronJobsTab = memo(function CronJobsTab() {
  const { jobs, loading, fetchJobs, createJob, updateJob, deleteJob, toggleJob, runJobManually } =
    useCronJobsStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [jobToEdit, setJobToEdit] = useState<CronJob | null>(null)
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null)
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

  const openDeleteDialog = (job: CronJob) => {
    setJobToDelete(job)
  }

  const handleDelete = async () => {
    if (jobToDelete) {
      await deleteJob(jobToDelete.id)
      setJobToDelete(null)
    }
  }

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 animate-spin border-2 border-primary border-t-transparent rounded-full" />
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
                    onClick={() => openDeleteDialog(job)}
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

      <ConfirmDialog
        open={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Cron Job"
        description={`Are you sure you want to delete "${jobToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        requireInput="DELETE"
      />
    </div>
  )
})
