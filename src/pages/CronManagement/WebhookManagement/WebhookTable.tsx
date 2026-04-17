import { memo, useState, useEffect, useRef } from 'react'
import { Webhook, Plus, Edit3, Trash2, RefreshCw, Play, CheckCircle2, XCircle, Clock, History, Link2, Bell, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { useWebhooksStore } from '@/stores/webhooks'
import { useCronJobsStore } from '@/stores/cronJobs'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { WebhookFormModal } from './WebhookModal'
import { DeliveryLogModal } from './DeliveryHistory'
import type { WebhookConfig, CreateWebhookConfig, UpdateWebhookConfig, WebhookEvent } from '@/types/cron'
import type { WebhooksListTabProps } from './types'

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

export const WebhooksListTab = memo(function WebhooksListTab({
  onCreateClick,
}: WebhooksListTabProps) {
  const { webhooks, loading, fetchWebhooks, removeWebhook, testWebhook } = useWebhooksStore()
  const { jobs, fetchJobs } = useCronJobsStore()
  const { isHydrated } = useAuthStore()
  const hasInitializedRef = useRef(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [webhookToEdit, setWebhookToEdit] = useState<WebhookConfig | null>(null)
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookConfig | null>(null)
  const [deliveryModalWebhook, setDeliveryModalWebhook] = useState<WebhookConfig | null>(null)

  useEffect(() => {
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true
    fetchWebhooks()
    fetchJobs()
  }, [isHydrated, fetchWebhooks, fetchJobs])

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
      {webhooks.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <Webhook className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Webhooks Yet</h3>
            <p className="text-sm text-muted-foreground/50 mb-6 max-w-md mx-auto">
              Create your first webhook to receive notifications when jobs start, succeed, or fail.
            </p>
            <Button onClick={onCreateClick}>
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
