import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScrollText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  AlertCircle,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock3,
  Code2,
  Terminal,
  ChevronRight,
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
import { TaskStatus } from '@/types/cron'
import type { ExecutionLog, ExecutionLogDetail } from '@/types/cron'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate, formatDuration } from '@/components/shared/dateUtils'
import { JsonViewer } from '@/components/shared/JsonViewer'
import { taskStatus } from '@/themes/tokens'
import { cn } from '@/lib/utils'

interface ExecutionLogPanelProps {
  log: {
    logDetail?: string | null
  }
  details: ExecutionLogDetail[]
  isLoading: boolean
}

export const ExecutionLogPanel = memo(function ExecutionLogPanel({
  log,
  details,
  isLoading,
}: ExecutionLogPanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const sortedDetails = useMemo(() => {
    return [...details].sort((a, b) => {
      if (!a.startedAt) return 1
      if (!b.startedAt) return -1
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    })
  }, [details])

  const timelineStats = useMemo(() => {
    if (details.length === 0) return null
    const totalDuration = details.reduce((sum, d) => sum + (d.durationMs || 0), 0)
    const avgDuration = totalDuration / details.length
    const maxDuration = Math.max(...details.map((d) => d.durationMs || 0))
    return { totalDuration, avgDuration, maxDuration }
  }, [details])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading execution details...</span>
      </div>
    )
  }

  if (details.length === 0) {
    return (
      <div className="py-8 text-center">
        <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground/50">No detailed execution data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {timelineStats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card/950 rounded-lg p-3 border border-border/50">
            <p className="text-lg font-semibold text-foreground">{formatDuration(timelineStats.totalDuration)}</p>
            <p className="text-xs text-muted-foreground/60">Total Duration</p>
          </div>
          <div className="bg-card/950 rounded-lg p-3 border border-border/50">
            <p className="text-lg font-semibold text-foreground">{formatDuration(timelineStats.avgDuration)}</p>
            <p className="text-xs text-muted-foreground/60">Avg. per Node</p>
          </div>
          <div className="bg-card/950 rounded-lg p-3 border border-border/50">
            <p className="text-lg font-semibold text-foreground">{formatDuration(timelineStats.maxDuration)}</p>
            <p className="text-xs text-muted-foreground/60">Slowest Node</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h5 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock3 className="w-4 h-4" />
          Node Execution Timeline
        </h5>
        <div className="space-y-2">
          {sortedDetails.map((detail, index) => {
            const isExpanded = expandedNodes.has(detail.id)
            const hasError = !!detail.errorMessage
            const hasOutput = !!detail.outputResult
            const nodeStatus = detail.errorMessage ? 'failed' : detail.completedAt ? 'completed' : 'running'

            return (
              <div
                key={detail.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  hasError ? 'border-destructive/30 bg-destructive/5' : 'border-border/50 bg-card/30'
                }`}
              >
                <button
                  onClick={() => toggleNode(detail.id)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-card/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground/70" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/70" />
                    )}
                  </div>

                  <div
                    className={cn(
                      'p-1.5 rounded',
                      nodeStatus === 'completed'
                        ? cn(taskStatus.completed.bg, taskStatus.completed.text)
                        : nodeStatus === 'failed'
                        ? 'bg-destructive/10 text-destructive'
                        : cn(taskStatus.running.bg, taskStatus.running.text)
                    )}
                  >
                    {nodeStatus === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {nodeStatus === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                    {nodeStatus === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {detail.nodeId || `Node ${index + 1}`}
                      </span>
                      {detail.nodeType && (
                        <Badge variant="outline" className="text-xs">
                          {detail.nodeType}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                      {detail.serviceName && <span className="truncate">{detail.serviceName}</span>}
                      {detail.methodName && <span className="truncate font-mono">{detail.methodName}</span>}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{formatDuration(detail.durationMs)}</p>
                    <p className="text-xs text-muted-foreground/50">
                      {detail.startedAt ? formatDate(detail.startedAt) : '-'}
                    </p>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-border/30 space-y-4">
                        {hasError && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4 text-destructive" />
                              <span className="text-sm font-medium text-destructive">Error</span>
                            </div>
                            <pre className="text-xs text-destructive/80 font-mono whitespace-pre-wrap">
                              {detail.errorMessage}
                            </pre>
                          </div>
                        )}

                        <div>
                          <h6 className="text-xs font-medium text-muted-foreground/70 mb-2 flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5" />
                            Input Payload
                          </h6>
                          <JsonViewer data={detail.inputPayload} maxHeight="150px" />
                        </div>

                        {hasOutput && (
                          <div>
                            <h6 className="text-xs font-medium text-muted-foreground/70 mb-2 flex items-center gap-2">
                              <Terminal className="w-3.5 h-3.5" />
                              Output Result
                            </h6>
                            <JsonViewer data={detail.outputResult} maxHeight="200px" />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-card/950 rounded p-2">
                            <span className="text-muted-foreground/50">Started:</span>
                            <span className="text-foreground ml-2">
                              {detail.startedAt ? formatDate(detail.startedAt) : '-'}
                            </span>
                          </div>
                          <div className="bg-card/950 rounded p-2">
                            <span className="text-muted-foreground/50">Completed:</span>
                            <span className="text-foreground ml-2">
                              {detail.completedAt ? formatDate(detail.completedAt) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {log.logDetail && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Legacy Log Details
          </h5>
          <pre className="bg-card/950 rounded-lg p-3 text-xs text-muted-foreground/70 font-mono overflow-x-auto max-h-40">
            {log.logDetail}
          </pre>
        </div>
      )}
    </div>
  )
})
