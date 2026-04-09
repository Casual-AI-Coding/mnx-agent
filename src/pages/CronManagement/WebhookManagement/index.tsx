import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Webhook, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { useWebhooksStore } from '@/stores/webhooks'
import { toast } from 'sonner'
import type { CreateWebhookConfig, UpdateWebhookConfig } from '@/types/cron'
import { WebhooksListTab } from './WebhookTable'
import { WebhookFormModal } from './WebhookModal'

export default function WebhookManagement() {
  const [activeTab, setActiveTab] = useState('webhooks')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const handleCreate = async (data: CreateWebhookConfig | UpdateWebhookConfig) => {
    const { addWebhook } = useWebhooksStore.getState()
    await addWebhook(data as CreateWebhookConfig)
    toast.success('Webhook created successfully')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Webhook className="w-5 h-5" />}
        title="Webhook Management"
        description="Configure webhook endpoints to receive real-time notifications for job executions"
        gradient="purple-pink"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook
          </Button>
        }
      />

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
              <WebhooksListTab onCreateClick={() => setIsCreateModalOpen(true)} />
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <WebhookFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
