import { cn } from '@/lib/utils'
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Download, Image as ImageIcon, Maximize2, Globe, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { OpenAIImage2Result, RetryRecord, ResultStatus } from './types'
import { STATUS_LABELS, STATUS_COLORS } from './types'

interface Props {
  result: OpenAIImage2Result
  retryHistory: RetryRecord[]
  currentRetryIndex: number
  setCurrentRetryIndex: (index: number) => void
  onReset: () => void
  outputFormat: string
  onFullscreen: () => void
}

export function ResultPreview({
  result,
  retryHistory,
  currentRetryIndex,
  setCurrentRetryIndex,
  onReset,
  outputFormat,
  onFullscreen,
}: Props) {
  const hasMultipleAttempts = retryHistory.length > 1

  return (
    <Card className="flex-1 flex flex-col min-h-[500px]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="w-4 h-4 text-indigo-500" />
            结果预览
          </CardTitle>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={result.status}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={cn('text-xs font-medium', STATUS_COLORS[result.status])}
              >
                {STATUS_LABELS[result.status]}
              </motion.span>
            </AnimatePresence>
            {hasMultipleAttempts && (
              <RetryHistoryNav
                retryHistory={retryHistory}
                currentRetryIndex={currentRetryIndex}
                setCurrentRetryIndex={setCurrentRetryIndex}
              />
            )}
            {(result.status === 'success' || result.status === 'failed') && (
              <Button variant="outline" size="sm" onClick={onReset}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                重新生成
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {result.status === 'idle' && <IdleState />}
            {isBusyStatus(result.status) && <LoadingState status={result.status} />}
            {hasMultipleAttempts && retryHistory[currentRetryIndex]?.status === 'failed' && (
              <FailedAttemptState record={retryHistory[currentRetryIndex]} />
            )}
            {hasMultipleAttempts && retryHistory[currentRetryIndex]?.status === 'success' && (
              <SuccessAttemptState record={retryHistory[currentRetryIndex]} outputFormat={outputFormat} onFullscreen={onFullscreen} />
            )}
            {result.status === 'failed' && !hasMultipleAttempts && (
              <FailedSingleState error={result.error} onRetry={onReset} />
            )}
            {result.status === 'success' && !hasMultipleAttempts && (
              <SuccessSingleState result={result} outputFormat={outputFormat} onFullscreen={onFullscreen} />
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

function isBusyStatus(status: ResultStatus): boolean {
  return status === 'creating-log' || status === 'generating' || status === 'updating-log' || status === 'saving-media'
}

function RetryHistoryNav({ retryHistory, currentRetryIndex, setCurrentRetryIndex }: { retryHistory: RetryRecord[]; currentRetryIndex: number; setCurrentRetryIndex: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setCurrentRetryIndex(Math.max(0, currentRetryIndex - 1))}
        disabled={currentRetryIndex === 0}
        className="p-1 rounded hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center gap-1">
        {retryHistory.map((record, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentRetryIndex(idx)}
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all",
              idx === currentRetryIndex && record.status === 'generating' && "ring-[2px] ring-blue-500 bg-blue-500/20 text-blue-500",
              idx === currentRetryIndex && record.status === 'success' && "ring-[2px] ring-emerald-500 bg-emerald-500/20 text-emerald-600",
              idx === currentRetryIndex && record.status === 'failed' && "ring-[2px] ring-red-500 bg-red-500/20 text-red-600",
              idx !== currentRetryIndex && record.status === 'generating' && "bg-blue-500/20 text-blue-500 animate-pulse",
              idx !== currentRetryIndex && record.status === 'success' && "bg-emerald-500/20 text-emerald-600",
              idx !== currentRetryIndex && record.status === 'failed' && "bg-red-500/20 text-red-600"
            )}
          >
            {record.status === 'generating' ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : record.status === 'failed' ? (
              <X className="w-2.5 h-2.5" />
            ) : (
              idx + 1
            )}
          </button>
        ))}
      </div>
      <button
        onClick={() => setCurrentRetryIndex(Math.min(retryHistory.length - 1, currentRetryIndex + 1))}
        disabled={currentRetryIndex === retryHistory.length - 1}
        className="p-1 rounded hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function IdleState() {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground"
    >
      <Globe className="w-16 h-16 mb-4 opacity-20" />
      <p className="text-sm">填写参数后点击「生成图像」</p>
      <p className="text-xs mt-1">前端直连外部 API，后端仅记录调用日志</p>
    </motion.div>
  )
}

function LoadingState({ status }: { status: ResultStatus }) {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center py-20"
    >
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
      <p className="text-sm font-medium text-foreground">{STATUS_LABELS[status]}</p>
      <div className="flex items-center gap-1.5 mt-3">
        {(['creating-log', 'generating', 'updating-log', 'saving-media'] as const).map((step, i) => (
          <div
            key={step}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              ['creating-log', 'generating', 'updating-log', 'saving-media'].indexOf(status) >= i
                ? 'w-8 bg-indigo-500'
                : 'w-4 bg-muted'
            )}
          />
        ))}
      </div>
    </motion.div>
  )
}

function FailedAttemptState({ record }: { record: RetryRecord }) {
  return (
    <motion.div
      key={`failed-${record.attempt}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center py-20"
    >
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-sm font-medium text-red-500 mb-1">第 {record.attempt} 次尝试失败</p>
      <p className="text-xs text-muted-foreground max-w-md text-center">{record.error}</p>
      {record.durationMs && (
        <p className="text-xs text-muted-foreground mt-2">耗时 {(record.durationMs / 1000).toFixed(2)}s</p>
      )}
    </motion.div>
  )
}

function SuccessAttemptState({ record, outputFormat, onFullscreen }: { record: RetryRecord; outputFormat: string; onFullscreen: () => void }) {
  if (!record.previewUrl) return null
  return (
    <motion.div
      key={`success-${record.attempt}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      <ImagePreview url={record.previewUrl} format={outputFormat} attempt={record.attempt} onFullscreen={onFullscreen} />
      <div className="flex flex-wrap items-center gap-3">
        {record.durationMs && (
          <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
            耗时 {(record.durationMs / 1000).toFixed(2)}s
          </span>
        )}
        <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="w-3 h-3 inline mr-1" />
          第 {record.attempt} 次尝试成功
        </span>
      </div>
    </motion.div>
  )
}

function FailedSingleState({ error, onRetry }: { error?: string; onRetry: () => void }) {
  return (
    <motion.div
      key="failed"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center py-20"
    >
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-sm font-medium text-red-500 mb-1">生成失败</p>
      <p className="text-xs text-muted-foreground max-w-md text-center">{error}</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        重试
      </Button>
    </motion.div>
  )
}

function SuccessSingleState({ result, outputFormat, onFullscreen }: { result: OpenAIImage2Result; outputFormat: string; onFullscreen: () => void }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
    >
      {result.previewUrl && (
        <ImagePreview url={result.previewUrl} format={outputFormat} onFullscreen={onFullscreen} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {result.durationMs && (
          <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
            耗时 {(result.durationMs / 1000).toFixed(2)}s
          </span>
        )}
        {result.externalApiLogId && (
          <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
            日志 #{result.externalApiLogId}
          </span>
        )}
        {result.mediaRecordId && (
          <span className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            媒体 #{result.mediaRecordId}
          </span>
        )}
        {result.usage && Object.entries(result.usage).map(([k, v]) => (
          <span key={k} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
            {k}: {String(v)}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function ImagePreview({ url, format, attempt, onFullscreen }: { url: string; format: string; attempt?: number; onFullscreen: () => void }) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/10 group">
      <img
        src={url}
        alt="Generated image"
        className="w-full h-auto max-h-[500px] object-contain"
      />
      <button
        onClick={onFullscreen}
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-foreground/10 backdrop-blur-[1px]"
      >
        <div className="p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background transition-colors">
          <Maximize2 className="w-5 h-5 text-foreground" />
        </div>
      </button>
      <a
        href={url}
        download={attempt != null
          ? `openai-image-${attempt}.${format}`
          : `openai-image-${Date.now()}.${format}`
        }
        className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background transition-colors"
        onClick={e => e.stopPropagation()}
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  )
}
