import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Dialog, DialogFooter } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
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
import { FormError } from '@/components/ui/FormError'
import { useWorkflowTemplatesStore } from '@/stores/workflowTemplates'
import {
  COMMON_TIMEZONES,
  getLocalTimezone,
  getNextRuns,
  formatDateWithTimezone,
} from '@/lib/cron-utils'
import { CronExpressionBuilder } from '@/components/cron/CronExpressionBuilder'
import { cronJobSchema, type CronJobFormData } from '@/lib/form-schemas'
import type { CreateCronJobDTO } from '@/types/cron'

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateCronJobDTO) => void
}

export function CreateJobModal({ isOpen, onClose, onSubmit }: CreateJobModalProps) {
  const localTimezone = getLocalTimezone()
  const { templates, fetchTemplates } = useWorkflowTemplatesStore()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CronJobFormData>({
    resolver: zodResolver(cronJobSchema),
    defaultValues: {
      name: '',
      description: '',
      cron_expression: '',
      timezone: localTimezone,
      workflow_id: '',
      timeout_ms: 300000, // 5 minutes default
      is_active: true,
    },
  })

  const cronExpression = watch('cron_expression')
  const timezone = watch('timezone')
  const workflowId = watch('workflow_id')

  useEffect(() => {
    if (isOpen) {
      reset({
        name: '',
        description: '',
        cron_expression: '',
        timezone: localTimezone,
        workflow_id: '',
        timeout_ms: 300000, // 5 minutes default
        is_active: true,
      })
      fetchTemplates()
    }
  }, [isOpen, fetchTemplates, localTimezone, reset])

  const handleFormSubmit = (data: CronJobFormData) => {
    onSubmit({
      name: data.name,
      description: data.description ?? '',
      cronExpression: data.cron_expression,
      timezone: data.timezone,
      workflowId: data.workflow_id,
      timeoutMs: data.timeout_ms,
      isActive: data.is_active,
    })
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Create New Cron Job"
      description="Schedule automated workflow executions"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Job Name <span className="text-destructive">*</span>
          </label>
          <Input
            {...register('name')}
            placeholder="e.g., Daily Image Generation"
            className={errors.name ? 'border-destructive' : ''}
          />
          <FormError message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Description</label>
          <Textarea
            {...register('description')}
            placeholder="Optional description of what this job does..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Workflow <span className="text-destructive">*</span>
          </label>
          <Select
            value={workflowId}
            onValueChange={(value) => setValue('workflow_id', value)}
          >
            <SelectTrigger className={errors.workflow_id ? 'border-destructive' : ''}>
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
          <FormError message={errors.workflow_id?.message} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Cron Expression <span className="text-destructive">*</span>
          </label>
          <CronExpressionBuilder
            value={cronExpression}
            onChange={(expression) => setValue('cron_expression', expression)}
            timezone={timezone}
          />
          <FormError message={errors.cron_expression?.message} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Timezone
          </label>
          <Select
            value={timezone}
            onValueChange={(value) => setValue('timezone', value)}
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
          {cronExpression && timezone && (
            <div className="text-sm text-muted-foreground/70 mt-1">
              <span className="font-medium">Next 3 runs: </span>
              {getNextRuns(cronExpression, timezone, 3).map((date, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  {formatDateWithTimezone(date, timezone)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Execution Timeout (seconds)
          </label>
          <Input
            type="number"
            min={1}
            max={600}
            step={1}
            value={watch('timeout_ms') ? Math.floor(watch('timeout_ms')! / 1000) : 300}
            onChange={(e) => {
              const seconds = Math.max(1, Math.min(600, Number(e.target.value) || 1))
              setValue('timeout_ms', seconds * 1000)
            }}
          />
          <p className="text-xs text-muted-foreground/50">
            Range: 1-600 seconds (1 second to 10 minutes). Default: 300 seconds (5 minutes).
          </p>
          <FormError message={errors.timeout_ms?.message} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Switch
              checked={watch('is_active')}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
            <span className="text-sm text-muted-foreground">Active on create</span>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" />
            Create Job
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}