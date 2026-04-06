import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ListTodo, Activity, ScrollText, Clock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/shared/PageHeader'
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
      <PageHeader
        icon={<Clock className="w-5 h-5" />}
        title="定时任务"
        description="创建和管理定时执行任务"
        gradient="purple-pink"
        actions={
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
          </Tabs>
        }
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'jobs' && <CronJobsTab />}
          {activeTab === 'queue' && <TaskQueueTab />}
          {activeTab === 'logs' && <ExecutionLogsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
