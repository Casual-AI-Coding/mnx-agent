import { useState, useEffect, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Webhook,
  Plus,
  Edit3,
  Trash2,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  History,
  Link2,
  Bell,
  Shield,
  Copy,
  ExternalLink,
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
import { Switch } from '@/components/ui/Switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useWebhooksStore } from '@/stores/webhooks'
import { useCronJobsStore } from '@/stores/cronJobs'
import type { WebhookConfig, WebhookDelivery, WebhookEvent, CreateWebhookConfig, UpdateWebhookConfig } from '@/types/cron'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { status } from '@/themes/tokens'
import { cn } from '@/lib/utils'

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: 'on_start', label: 'On Start', description: 'Triggered when job execution starts' },
  { value: 'on_success', label: 'On Success', description: 'Triggered when job execution succeeds' },
  { value: 'on_failure', label: 'On Failure', description: 'Triggered when job execution fails' },
]

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

const StatusBadge = memo(function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="default" className="gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Active
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="w-3 h-3" />
      Inactive
    </Badge>
  )
})

const EventBadge = memo(function EventBadge({ event }: { event: WebhookEvent }) {
  const colors: Record<WebhookEvent, string> = {
    on_start: cn('bg-primary/10 text-primary border-primary/20'),
    on_success: cn(status.success.bgSubtle, status.success.icon, status.success.border),
    on_failure: cn(status.error.bgSubtle, status.error.icon, status.error.border),
  }

  const labels: Record<WebhookEvent, string> = {
    on_start: 'Start',
    on_success: 'Success',
    on_failure: 'Failure',
  }

  return (
    <Badge variant="outline" className={colors[event]}>
      {labels[event]}
    </Badge>
  )
})

interface WebhookFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateWebhookConfig | UpdateWebhookConfig) => void
  webhook?: WebhookConfig | null
}

function WebhookFormModal({ isOpen, onClose, onSubmit, webhook }: WebhookFormModalProps) {
  const { jobs } = useCronJobsStore()
  const [formData, setFormData] = useState<CreateWebhookConfig>({
    name: '',
    url: '',
    events: [],
    jobId: null,
    headers: null,
    secret: null,
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [headerKey, setHeaderKey] = useState('')
  const [headerValue, setHeaderValue] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (webhook) {
        setFormData({
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          jobId: webhook.jobId,
          headers: webhook.headers,
          secret: webhook.secret,
          isActive: webhook.isActive,
        })
      } else {
        setFormData({
          name: '',
          url: '',
          events: [],
          jobId: null,
          headers: null,
          secret: null,
          isActive: true,
        })
      }
      setErrors({})
      setHeaderKey('')
      setHeaderValue('')
    }
  }, [isOpen, webhook])

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else if (!validateUrl(formData.url)) {
      newErrors.url = 'Invalid URL format'
    }

    if (formData.events.length === 0) {
      newErrors.events = 'At least one event must be selected'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
    onClose()
  }

  const toggleEvent = (event: WebhookEvent) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const addHeader = () => {
    if (!headerKey.trim() || !headerValue.trim()) return
    setFormData((prev) => ({
      ...prev,
      headers: { ...(prev.headers || {}), [headerKey]: headerValue },
    }))
    setHeaderKey('')
    setHeaderValue('')
  }

  const removeHeader = (key: string) => {
    setFormData((prev) => {
      const newHeaders = { ...(prev.headers || {}) }
      delete newHeaders[key]
      return { ...prev, headers: Object.keys(newHeaders).length > 0 ? newHeaders : null }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {webhook ? 'Edit Webhook' : 'Create Webhook'}
            </h2>
            <p className="text-sm text-muted-foreground/70">
              {webhook ? 'Update webhook configuration' : 'Configure a new webhook endpoint'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Webhook Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Slack Notifications"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Target URL <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://hooks.example.com/webhook"
              className={errors.url ? 'border-destructive' : ''}
            />
            {errors.url ? (
              <p className="text-sm text-destructive">{errors.url}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50">
                The URL where webhook payloads will be sent
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Associated Job (Optional)</label>
            <Select
              value={formData.jobId || 'null'}
              onValueChange={(value) => setFormData({ ...formData, jobId: value === 'null' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All jobs (global webhook)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">All jobs (global webhook)</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground/50">
              Leave empty to receive events from all jobs
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Events <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((event) => (
                <div
                  key={event.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.events.includes(event.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleEvent(event.value)}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      formData.events.includes(event.value)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {formData.events.includes(event.value) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground/70">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {errors.events && <p className="text-sm text-destructive">{errors.events}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Secret (Optional)</label>
            <Input
              type="password"
              value={formData.secret || ''}
              onChange={(e) => setFormData({ ...formData, secret: e.target.value || null })}
              placeholder="For HMAC signature verification"
            />
            <p className="text-xs text-muted-foreground/50">
              Used to sign webhook payloads for security verification
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Custom Headers (Optional)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Header name"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.headers && Object.entries(formData.headers).length > 0 && (
              <div className="space-y-2">
                {Object.entries(formData.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <code className="text-xs font-mono flex-1">
                      {key}: {value}
                    </code>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="p-1 hover:bg-destructive/10 rounded text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
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
              {webhook ? (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Webhook
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

const DeliveryLogModal = memo(function DeliveryLogModal({
  webhook,
  isOpen,
  onClose,
}: {
  webhook: WebhookConfig | null
  isOpen: boolean
  onClose: () => void
}) {
  const { deliveries, loading, fetchDeliveries } = useWebhooksStore()

  useEffect(() => {
    if (isOpen && webhook) {
      fetchDeliveries(webhook.id)
    }
  }, [isOpen, webhook, fetchDeliveries])

  if (!isOpen || !webhook) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Delivery History</h2>
            <p className="text-sm text-muted-foreground/70">{webhook.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No delivery history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <EventBadge event={delivery.event} />
                      <span className="text-sm text-muted-foreground">
                        {formatDate(delivery.deliveredAt)}
                      </span>
                    </div>
                    {delivery.responseStatus ? (
                      <Badge
                        variant={delivery.responseStatus >= 200 && delivery.responseStatus < 300 ? 'default' : 'destructive'}
                      >
                        {delivery.responseStatus}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No Response</Badge>
                    )}
                  </div>
                  {delivery.errorMessage && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                      {delivery.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
})

const WebhooksListTab = memo(function WebhooksListTab() {
  const { webhooks, loading, fetchWebhooks, removeWebhook, testWebhook } = useWebhooksStore()
  const { jobs, fetchJobs } = useCronJobsStore()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [webhookToEdit, setWebhookToEdit] = useState<WebhookConfig | null>(null)
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null)
  const [deliveryModalWebhook, setDeliveryModalWebhook] = useState<WebhookConfig | null>(null)

  useEffect(() => {
    fetchWebhooks()
    fetchJobs()
  }, [fetchWebhooks, fetchJobs])

  const handleCreate = async (data: CreateWebhookConfig | UpdateWebhookConfig) => {
    const { addWebhook } = useWebhooksStore.getState()
    await addWebhook(data as CreateWebhookConfig)
    toast.success('Webhook created successfully')
  }

  const handleEdit = async (data: CreateWebhookConfig | UpdateWebhookConfig) => {
    if (!webhookToEdit) return
    const { updateWebhook } = useWebhooksStore.getState()
    await updateWebhook(webhookToEdit.id, data as UpdateWebhookConfig)
    toast.success('Webhook updated successfully')
    setWebhookToEdit(null)
  }

  const openEditModal = (webhook: WebhookConfig) => {
    setWebhookToEdit(webhook)
    setIsEditModalOpen(true)
  }

  const openDeleteDialog = (webhook: WebhookConfig) => {
    setWebhookToDelete(webhook)
  }

  const handleDelete = async () => {
    if (webhookToDelete) {
      await removeWebhook(webhookToDelete.id)
      toast.success('Webhook deleted successfully')
      setWebhookToDelete(null)
    }
  }

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook(id)
      if (result.success) {
        toast.success('Webhook test successful')
      } else {
        toast.error(`Webhook test failed: ${result.message}`)
      }
    } catch (err) {
      toast.error('Webhook test failed')
    }
  }

  const getJobName = (jobId: string | null) => {
    if (!jobId) return 'All Jobs'
    const job = jobs.find((j) => j.id === jobId)
    return job?.name || jobId
  }

  if (loading && webhooks.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Webhooks</h3>
          <p className="text-sm text-muted-foreground/70">
            Configure webhook endpoints to receive job execution notifications
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <Webhook className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Webhooks Yet</h3>
            <p className="text-sm text-muted-foreground/50 mb-6 max-w-md mx-auto">
              Create your first webhook to receive notifications when jobs start, succeed, or fail.
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground truncate">{webhook.name}</h4>
                      <StatusBadge isActive={webhook.isActive} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Link2 className="w-3.5 h-3.5" />
                      <code className="font-mono text-xs truncate">{webhook.url}</code>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-4">
                        <Bell className="w-3.5 h-3.5" />
                        <span>Events:</span>
                      </div>
                      {webhook.events.map((event) => (
                        <EventBadge key={event} event={event} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground/70">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created: {formatDate(webhook.createdAt)}
                      </span>
                      <span className="mx-2">•</span>
                      <span>Job: {getJobName(webhook.jobId)}</span>
                      {webhook.secret && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="flex items-center gap-1 text-primary">
                            <Shield className="w-3 h-3" />
                            Signed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTest(webhook.id)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                      title="Test Webhook"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeliveryModalWebhook(webhook)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                      title="View Delivery History"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(webhook)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(webhook)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <WebhookFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
      />

      <WebhookFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setWebhookToEdit(null)
        }}
        onSubmit={handleEdit}
        webhook={webhookToEdit}
      />

      <DeliveryLogModal
        webhook={deliveryModalWebhook}
        isOpen={!!deliveryModalWebhook}
        onClose={() => setDeliveryModalWebhook(null)}
      />

      <ConfirmDialog
        open={!!webhookToDelete}
        onClose={() => setWebhookToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Webhook"
        description={`Are you sure you want to delete "${webhookToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        requireInput="DELETE"
      />
    </div>
  )
})

export default function WebhookManagement() {
  const [activeTab, setActiveTab] = useState('webhooks')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="webhooks"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-6"
          >
            <TabsContent value="webhooks" className="mt-0">
              <WebhooksListTab />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  )
}
