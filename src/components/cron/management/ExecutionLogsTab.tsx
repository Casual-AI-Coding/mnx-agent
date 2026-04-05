import { useState, useEffect, memo, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useExecutionLogsStore } from '@/stores/executionLogs'
import type { TaskStatus } from '@/types/cron'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDuration } from '@/components/shared/dateUtils'
import { ExecutionLogPanel } from './ExecutionLogPanel'

export const ExecutionLogsTab = memo(function ExecutionLogsTab() {
  const { logs, logDetails, loading, detailsLoading, fetchLogs, fetchLogDetails } = useExecutionLogsStore()
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const parentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const toggleExpand = useCallback(async (logId: string) => {
    const newExpandedId = expandedLogId === logId ? null : logId
    setExpandedLogId(newExpandedId)

    if (newExpandedId && !logDetails.has(logId)) {
      await fetchLogDetails(logId)
    }
  }, [expandedLogId, logDetails, fetchLogDetails])

  const filteredLogs = statusFilter === 'all'
    ? logs
    : logs.filter((log) => log.status === statusFilter)

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height,
  })

  const virtualItems = rowVirtualizer.getVirtualItems()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Execution Logs</h3>
          <p className="text-sm text-muted-foreground/70">View detailed execution data with node-level insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground/70" />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}
            >
              <SelectTrigger className="w-40 bg-card/950 border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-16 text-center">
            <ScrollText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Execution Logs</h3>
            <p className="text-sm text-muted-foreground/50">Logs will appear here after jobs are executed.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight: '70vh' }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualRow) => {
              const log = filteredLogs[virtualRow.index]
              const isExpanded = expandedLogId === log.id
              const isLoadingDetails = detailsLoading.has(log.id)
              const details = logDetails.get(log.id) || []

              return (
                <motion.div
                  key={log.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-3"
                >
                  <Card
                    className={`cursor-pointer transition-colors ${
                      isExpanded ? 'bg-card/800/50' : 'hover:bg-card/800/30'
                    }`}
                    onClick={() => toggleExpand(log.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <StatusBadge status={log.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-muted-foreground font-mono">{log.jobId}</code>
                            <Badge variant="outline" className="text-xs">
                              {log.triggerType}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground/50 mt-1">
                            {formatDate(log.startedAt)} • Duration: {formatDuration(log.durationMs)}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-foreground font-medium">{log.tasksExecuted}</p>
                            <p className="text-xs text-muted-foreground/50">Executed</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 font-medium">{log.tasksSucceeded}</p>
                            <p className="text-xs text-muted-foreground/50">Succeeded</p>
                          </div>
                          <div className="text-center">
                            <p className={`font-medium ${log.tasksFailed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {log.tasksFailed}
                            </p>
                            <p className="text-xs text-muted-foreground/50">Failed</p>
                          </div>
                        </div>
                        <button className="p-1 rounded hover:bg-card/700">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground/70" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground/70" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 mt-4 border-t border-border">
                              {log.errorSummary && (
                                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                    <span className="text-sm font-medium text-destructive">Error Summary</span>
                                  </div>
                                  <p className="text-sm text-destructive/80">{log.errorSummary}</p>
                                </div>
                              )}

                              <ExecutionLogPanel
                                log={log}
                                details={details}
                                isLoading={isLoadingDetails}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
})
