import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListTodo, Activity, ScrollText } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useCronJobsWebSocket } from '@/hooks/useCronJobsWebSocket'
import { useTaskQueueWebSocket } from '@/hooks/useTaskQueueWebSocket'
import { useExecutionLogsWebSocket } from '@/hooks/useExecutionLogsWebSocket'
import { CronJobsTab, TaskQueueTab, ExecutionLogsTab } from '@/components/cron/management'

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cron Management</h1>
          <p className="text-muted-foreground/70 mt-2">
            Schedule, monitor, and manage automated workflow executions
          </p>
        </div>
      </div>

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
              <CronJobsTab />
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
