import { memo, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2, Maximize2, Copy, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDuration } from './shared'

interface JsonViewerProps {
  data: string | object | null
  maxHeight?: string
  initiallyExpanded?: boolean
}

export const JsonViewer = memo(function JsonViewer({
  data,
  maxHeight = '300px',
  initiallyExpanded = false,
}: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded)
  const [copied, setCopied] = useState(false)

  const parsedData = useMemo(() => {
    if (!data) return null
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return data
  }, [data])

  const formattedJson = useMemo(() => {
    if (!parsedData) return ''
    try {
      return JSON.stringify(parsedData, null, 2)
    } catch {
      return String(parsedData)
    }
  }, [parsedData])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!data) return <span className="text-muted-foreground/50 italic">No data</span>

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-primary transition-colors"
        >
          {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre
        className={`bg-card/950 rounded-lg p-3 text-xs text-muted-foreground/70 font-mono overflow-auto transition-all ${
          isExpanded ? '' : `max-h-[${maxHeight}]`
        }`}
        style={{ maxHeight: isExpanded ? 'none' : maxHeight }}
      >
        {formattedJson}
      </pre>
    </div>
  )
})

interface ExecutionLogDetail {
  id: string
  nodeId?: string | null
  nodeType?: string | null
  serviceName?: string | null
  methodName?: string | null
  status: string
  startedAt?: string | null
  completedAt?: string | null
  durationMs?: number | null
  inputPayload?: string | object | null
  outputResult?: string | object | null
  errorMessage?: string | null
}

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
          <span>Node Execution Timeline</span>
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
                      <span className="text-muted-foreground/70">▼</span>
                    ) : (
                      <span className="text-muted-foreground/70">▶</span>
                    )}
                  </div>

                  <div
                    className={`p-1.5 rounded ${
                      nodeStatus === 'completed'
                        ? 'bg-green-500/10 text-green-400'
                        : nodeStatus === 'failed'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}
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
                    <p className="text-sm font-medium text-foreground">{formatDuration(detail.durationMs ?? null)}</p>
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
                              <span className="text-sm font-medium text-destructive">Error</span>
                            </div>
                            <pre className="text-xs text-destructive/80 font-mono whitespace-pre-wrap">
                              {detail.errorMessage}
                            </pre>
                          </div>
                        )}

                        <div>
                          <h6 className="text-xs font-medium text-muted-foreground/70 mb-2">Input Payload</h6>
                          <JsonViewer data={detail.inputPayload ?? null} maxHeight="150px" />
                        </div>

                        {hasOutput && (
                          <div>
                            <h6 className="text-xs font-medium text-muted-foreground/70 mb-2">Output Result</h6>
                            <JsonViewer data={detail.outputResult ?? null} maxHeight="200px" />
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
          <h5 className="text-sm font-medium text-muted-foreground mb-2">Legacy Log Details</h5>
          <pre className="bg-card/950 rounded-lg p-3 text-xs text-muted-foreground/70 font-mono overflow-x-auto max-h-40">
            {log.logDetail}
          </pre>
        </div>
      )}
    </div>
  )
})
