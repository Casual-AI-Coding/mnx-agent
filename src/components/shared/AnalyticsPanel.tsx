import { useState, useEffect } from 'react'
import { X, Trash2, BarChart3, AlertCircle, Clock, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import analytics, { type AnalyticsEvent, type AnalyticsSummary } from '@/lib/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface AnalyticsPanelProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'overview' | 'errors' | 'performance' | 'usage'

export default function AnalyticsPanel({ isOpen, onClose }: AnalyticsPanelProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    if (isOpen) {
      setSummary(analytics.getSummary())
    }
  }, [isOpen])

  const handleClearEvents = () => {
    analytics.clearEvents()
    setSummary(analytics.getSummary())
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatDuration = (ms: number) => {
    return ms.toFixed(2) + 'ms'
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '概览', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'errors', label: '错误', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'performance', label: '性能', icon: <Clock className="w-4 h-4" /> },
    { id: 'usage', label: '使用', icon: <Activity className="w-4 h-4" /> },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[90vw] md:max-w-3xl md:max-h-[80vh] z-50 flex flex-col"
          >
            <Card className="flex-1 flex flex-col overflow-hidden bg-card/95 backdrop-blur-xl border-border">
              <CardHeader className="flex-shrink-0 pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary-500" />
                    </div>
                    <CardTitle className="text-foreground">数据分析</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearEvents}
                      className="text-muted-foreground/70 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      清除
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground/70 hover:text-foreground">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-1 mt-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-primary-600/20 text-primary-400'
                          : 'text-muted-foreground/70 hover:text-foreground hover:bg-secondary/50'
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-4">
                {summary && (
                  <div className="space-y-4">
                    {activeTab === 'overview' && (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <StatCard label="总事件" value={summary.totalEvents} />
                          <StatCard label="错误数" value={summary.errorCount} variant="destructive" />
                          <StatCard
                            label="性能事件"
                            value={summary.performanceEvents.length}
                          />
                          <StatCard label="页面浏览" value={summary.pageviewEvents.length} />
                        </div>
                        {Object.keys(summary.avgPerformanceByName).length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">平均性能 (ms)</h3>
                            <div className="space-y-2">
                              {Object.entries(summary.avgPerformanceByName as Record<string, number>).map(([name, avg]) => (
                                <div key={name} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                                  <span className="text-foreground text-sm">{name}</span>
                                  <span className="text-primary-400 text-sm font-mono">
                                    {formatDuration(avg)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Object.keys(summary.usageCountByAction).length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">使用统计</h3>
                            <div className="space-y-2">
                              {Object.entries(summary.usageCountByAction as Record<string, number>).map(([action, count]) => (
                                <div key={action} className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg">
                                  <span className="text-foreground text-sm">{action}</span>
                                  <span className="text-foreground text-sm font-mono">×{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {activeTab === 'errors' && (
                      <EventList
                        events={summary.errorEvents}
                        emptyMessage="暂无错误记录"
                        renderItem={(e) => (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground text-sm font-medium truncate">{e.name}</p>
                              {e.metadata && (
                                <p className="text-muted-foreground/70 text-xs mt-1 truncate">
                                  {JSON.stringify(e.metadata)}
                                </p>
                              )}
                            </div>
                            <span className="text-muted-foreground/50 text-xs shrink-0">
                              {formatTimestamp(e.timestamp)}
                            </span>
                          </div>
                        )}
                      />
                    )}
                    {activeTab === 'performance' && (
                      <EventList
                        events={summary.performanceEvents}
                        emptyMessage="暂无性能记录"
                        renderItem={(e) => (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground text-sm font-medium truncate">{e.name}</p>
                              <p className="text-primary-400 text-xs mt-1">
                                耗时: {formatDuration(typeof e.metadata?.duration === 'number' ? e.metadata.duration : 0)}
                              </p>
                            </div>
                            <span className="text-muted-foreground/50 text-xs shrink-0">
                              {formatTimestamp(e.timestamp)}
                            </span>
                          </div>
                        )}
                      />
                    )}
                    {activeTab === 'usage' && (
                      <EventList
                        events={summary.usageEvents}
                        emptyMessage="暂无使用记录"
                        renderItem={(e) => (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-foreground text-sm font-medium truncate">{e.name}</p>
                              {e.metadata && Object.keys(e.metadata).length > 0 && (
                                <p className="text-muted-foreground/70 text-xs mt-1 truncate">
                                  {JSON.stringify(e.metadata)}
                                </p>
                              )}
                            </div>
                            <span className="text-muted-foreground/50 text-xs shrink-0">
                              {formatTimestamp(e.timestamp)}
                            </span>
                          </div>
                        )}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function StatCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant?: 'default' | 'destructive'
}) {
  return (
    <div className="p-4 bg-secondary/50 rounded-xl">
      <p className="text-muted-foreground/70 text-xs mb-1">{label}</p>
      <p
        className={cn(
          'text-2xl font-bold',
          variant === 'destructive' ? 'text-destructive' : 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function EventList({
  events,
  emptyMessage,
  renderItem,
}: {
  events: AnalyticsEvent[]
  emptyMessage: string
  renderItem: (event: AnalyticsEvent) => React.ReactNode
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/70">
        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div
          key={`${event.timestamp}-${index}`}
          className="p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
        >
          {renderItem(event)}
        </div>
      ))}
    </div>
  )
}