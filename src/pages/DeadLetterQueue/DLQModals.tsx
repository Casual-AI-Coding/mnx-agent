import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  X,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Calendar,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Label,
} from '@/components/ui/Label'
import {
  Dialog,
  DialogFooter,
} from '@/components/ui/Dialog'
import type { DeadLetterQueueItem } from '@/types/cron'
import { updateAutoRetryConfig, type AutoRetryStats } from '@/lib/api/cron'
import { status } from '@/themes/tokens'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { ErrorDetailModalProps, AutoRetryConfigModalProps, BulkRetryModalProps } from './types'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ErrorDetailModal({ isOpen, onClose, item }: ErrorDetailModalProps) {
  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Error Details</h2>
            <p className="text-sm text-muted-foreground/70">Task ID: {item.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Task Type</label>
              <p className="text-foreground font-medium">{item.taskType}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job ID</label>
              <p className="text-foreground font-mono text-sm">{item.jobId || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Failed At</label>
              <p className="text-foreground">{formatDate(item.failedAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Retry Count</label>
              <p className="text-foreground">{item.retryCount} / {item.maxRetries}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Error Message</label>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Error</span>
              </div>
              <p className="text-sm text-destructive/80 whitespace-pre-wrap font-mono">
                {item.errorMessage || 'No error message available'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Payload</label>
            <pre className="bg-card/950 rounded-lg p-4 text-xs text-muted-foreground/70 font-mono overflow-x-auto max-h-60">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export function AutoRetryConfigModal({ isOpen, onClose, stats, onSave }: AutoRetryConfigModalProps) {
  const [config, setConfig] = useState({
    initialDelayMs: 60,
    maxDelayMs: 1440,
    maxAttempts: 3,
    backoffMultiplier: 2,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (stats?.config) {
      setConfig({
        initialDelayMs: Math.round(stats.config.initialDelayMs / 60000),
        maxDelayMs: Math.round(stats.config.maxDelayMs / 60000),
        maxAttempts: stats.config.maxAttempts,
        backoffMultiplier: stats.config.backoffMultiplier,
      })
    }
  }, [stats])

  const handleSave = async () => {
    setIsSaving(true)
    const response = await updateAutoRetryConfig({
      initialDelayMs: config.initialDelayMs * 60000,
      maxDelayMs: config.maxDelayMs * 60000,
      maxAttempts: config.maxAttempts,
      backoffMultiplier: config.backoffMultiplier,
    })
    setIsSaving(false)

    if (response.success) {
      toast.success('Configuration saved successfully')
      onSave()
      onClose()
    } else {
      toast.error(response.error || 'Failed to save configuration')
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Auto-Retry Configuration">
      <div className="grid gap-6 py-4">
        <div className="grid gap-2">
          <Label htmlFor="initialDelay">Initial Delay (minutes)</Label>
          <Input
            id="initialDelay"
            type="number"
            min={1}
            max={1440}
            value={config.initialDelayMs}
            onChange={(e) => setConfig({ ...config, initialDelayMs: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Time before the first retry attempt
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maxDelay">Max Delay (minutes)</Label>
          <Input
            id="maxDelay"
            type="number"
            min={1}
            max={10080}
            value={config.maxDelayMs}
            onChange={(e) => setConfig({ ...config, maxDelayMs: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum time between retry attempts
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maxAttempts">Max Attempts</Label>
          <Input
            id="maxAttempts"
            type="number"
            min={1}
            max={10}
            value={config.maxAttempts}
            onChange={(e) => setConfig({ ...config, maxAttempts: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Maximum number of retry attempts per task
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="backoffMultiplier">Backoff Multiplier</Label>
          <Input
            id="backoffMultiplier"
            type="number"
            min={1}
            max={10}
            step={0.5}
            value={config.backoffMultiplier}
            onChange={(e) => setConfig({ ...config, backoffMultiplier: parseFloat(e.target.value) || 1 })}
          />
          <p className="text-xs text-muted-foreground">
            Multiplier for exponential backoff (e.g., 2 = double the delay each time)
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

export function BulkRetryModal({ isOpen, onClose, selectedItems, onConfirm, isProcessing }: BulkRetryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Bulk Retry</h2>
            <p className="text-sm text-muted-foreground/70">Retry multiple failed tasks</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-foreground">
            You are about to retry <strong>{selectedItems.length}</strong> failed task(s).
          </p>
          <div className={cn('bg-warning/10 border border-warning/30 rounded-lg p-4')}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('w-4 h-4', status.warning.icon)} />
              <span className={cn('text-sm font-medium', status.warning.text)}>Warning</span>
            </div>
            <p className={cn('text-sm mt-1', status.warning.text)}>
              This action will re-queue all selected tasks. Make sure you have reviewed the errors.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry {selectedItems.length} Items
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
