import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Edit3, Plus, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select'
import { useCronJobsStore } from '@/stores/cronJobs'
import { WEBHOOK_EVENTS } from './types'
import type { WebhookFormModalProps } from './types'
import type { WebhookEvent } from '@/types/cron'

export function WebhookFormModal({ isOpen, onClose, onSubmit, webhook }: WebhookFormModalProps) {
  const { jobs } = useCronJobsStore()
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as WebhookEvent[],
    jobId: null as string | null,
    headers: null as Record<string, string> | null,
    secret: null as string | null,
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [headerKey, setHeaderKey] = useState('')
  const [headerValue, setHeaderValue] = useState('')

  useEffect(() => {
    if (isOpen) {
      if (webhook) {
        setFormData({
          name: webhook.name,
          url: webhook.url,
          events: webhook.events,
          jobId: webhook.jobId,
          headers: webhook.headers,
          secret: webhook.secret,
          isActive: webhook.isActive,
        })
      } else {
        setFormData({
          name: '',
          url: '',
          events: [],
          jobId: null,
          headers: null,
          secret: null,
          isActive: true,
        })
      }
      setErrors({})
      setHeaderKey('')
      setHeaderValue('')
    }
  }, [isOpen, webhook])

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required'
    } else if (!validateUrl(formData.url)) {
      newErrors.url = 'Invalid URL format'
    }

    if (formData.events.length === 0) {
      newErrors.events = 'At least one event must be selected'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(formData)
    onClose()
  }

  const toggleEvent = (event: WebhookEvent) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }))
  }

  const addHeader = () => {
    if (!headerKey.trim() || !headerValue.trim()) return
    setFormData((prev) => ({
      ...prev,
      headers: { ...(prev.headers || {}), [headerKey]: headerValue },
    }))
    setHeaderKey('')
    setHeaderValue('')
  }

  const removeHeader = (key: string) => {
    setFormData((prev) => {
      const newHeaders = { ...(prev.headers || {}) }
      delete newHeaders[key]
      return { ...prev, headers: Object.keys(newHeaders).length > 0 ? newHeaders : null }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {webhook ? 'Edit Webhook' : 'Create Webhook'}
            </h2>
            <p className="text-sm text-muted-foreground/70">
              {webhook ? 'Update webhook configuration' : 'Configure a new webhook endpoint'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70 hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Webhook Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Slack Notifications"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Target URL <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://hooks.example.com/webhook"
              className={errors.url ? 'border-destructive' : ''}
            />
            {errors.url ? (
              <p className="text-sm text-destructive">{errors.url}</p>
            ) : (
              <p className="text-xs text-muted-foreground/50">
                The URL where webhook payloads will be sent
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Associated Job (Optional)</label>
            <Select
              value={formData.jobId || 'null'}
              onValueChange={(value) => setFormData({ ...formData, jobId: value === 'null' ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All jobs (global webhook)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">All jobs (global webhook)</SelectItem>
                {jobs.map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground/50">
              Leave empty to receive events from all jobs
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              Events <span className="text-destructive">*</span>
            </label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map((event) => (
                <div
                  key={event.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.events.includes(event.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleEvent(event.value)}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      formData.events.includes(event.value)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {formData.events.includes(event.value) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{event.label}</p>
                    <p className="text-xs text-muted-foreground/70">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {errors.events && <p className="text-sm text-destructive">{errors.events}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Secret (Optional)</label>
            <Input
              type="password"
              value={formData.secret || ''}
              onChange={(e) => setFormData({ ...formData, secret: e.target.value || null })}
              placeholder="For HMAC signature verification"
            />
            <p className="text-xs text-muted-foreground/50">
              Used to sign webhook payloads for security verification
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Custom Headers (Optional)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Header name"
                value={headerKey}
                onChange={(e) => setHeaderKey(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Value"
                value={headerValue}
                onChange={(e) => setHeaderValue(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addHeader}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.headers && Object.entries(formData.headers).length > 0 && (
              <div className="space-y-2">
                {Object.entries(formData.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <code className="text-xs font-mono flex-1">
                      {key}: {value}
                    </code>
                    <button
                      type="button"
                      onClick={() => removeHeader(key)}
                      className="p-1 hover:bg-destructive/10 rounded text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {webhook ? (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Webhook
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
