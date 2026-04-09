import type { WebhookEvent, CreateWebhookConfig, UpdateWebhookConfig, WebhookConfig } from '@/types/cron'

export type { WebhookEvent }

export interface WebhookFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateWebhookConfig | UpdateWebhookConfig) => void
  webhook?: WebhookConfig | null
}

export interface DeliveryLogModalProps {
  webhook: WebhookConfig | null
  isOpen: boolean
  onClose: () => void
}

export interface WebhooksListTabProps {
  onCreateClick?: () => void
}

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: 'on_start', label: 'On Start', description: 'Triggered when job execution starts' },
  { value: 'on_success', label: 'On Success', description: 'Triggered when job execution succeeds' },
  { value: 'on_failure', label: 'On Failure', description: 'Triggered when job execution fails' },
]
