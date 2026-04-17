import { memo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, RefreshCw, History } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { useWebhooksStore } from '@/stores/webhooks'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { WebhookEvent } from '@/types/cron'
import type { DeliveryLogModalProps } from './types'

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

export const DeliveryLogModal = memo(function DeliveryLogModal({
  webhook,
  isOpen,
  onClose,
}: DeliveryLogModalProps) {
  const { deliveries, loading, fetchDeliveries } = useWebhooksStore()
  const { isHydrated } = useAuthStore()
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (!isHydrated) return
    if (hasInitializedRef.current) return
    if (isOpen && webhook) {
      hasInitializedRef.current = true
      fetchDeliveries(webhook.id)
    }
  }, [isHydrated, isOpen, webhook, fetchDeliveries])

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
