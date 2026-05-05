import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { AuditLog, AuditAction } from '@/lib/api/audit'

export function AuditLogDetail({
  selectedLog,
  actionConfig,
  defaultActionConfig,
  statusColors,
  formatDuration,
  onClose,
  t,
}: {
  selectedLog: AuditLog
  actionConfig: Record<AuditAction, { color: string; label: string }>
  defaultActionConfig: { color: string; label: string }
  statusColors: Record<string, string>
  formatDuration: (ms: number | null) => string
  onClose: () => void
  t: (key: string, fallback?: string) => string
}) {
  const [copied, setCopied] = useState(false)

  const getActionConfig = (action: string) =>
    (actionConfig as Record<string, { color: string; label: string }>)[action] || defaultActionConfig

  const copyLogToClipboard = async () => {
    const content = `## 审计日志详情

**操作**: ${getActionConfig(selectedLog.action).label}
**状态**: ${selectedLog.response_status || '-'}
**路径**: ${selectedLog.request_method || '-'} ${selectedLog.request_path || '-'}
**资源类型**: ${selectedLog.resource_type || '-'}
**资源ID**: ${selectedLog.resource_id || '-'}
**IP地址**: ${selectedLog.ip_address || '-'}
**耗时**: ${formatDuration(selectedLog.duration_ms)}
**时间**: ${new Date(selectedLog.created_at).toLocaleString('zh-CN')}
${selectedLog.error_message ? `\n**错误信息**:\n\`\`\`\n${selectedLog.error_message}\n\`\`\`` : ''}
${selectedLog.request_body ? `\n**请求体**:\n\`\`\`json\n${typeof selectedLog.request_body === 'object' ? JSON.stringify(selectedLog.request_body, null, 2) : selectedLog.request_body}\n\`\`\`` : ''}`

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog open={!!selectedLog} onClose={onClose} size="lg">
      <DialogHeader>
        <h2 className="text-lg font-semibold">{t('audit.logDetail', '日志详情')}</h2>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">{t('audit.action', '操作')}</label>
            <Badge className={cn('ml-2', getActionConfig(selectedLog.action).color)}>
              {getActionConfig(selectedLog.action).label}
            </Badge>
          </div>
          <div>
            <label className="text-muted-foreground/50">{t('audit.status', '状态')}</label>
            <span className={cn('ml-2', statusColors[Math.floor((selectedLog.response_status || 0) / 100).toString()] || 'text-muted-foreground/70')}>
              {selectedLog.response_status || '-'}
            </span>
          </div>
        </div>
        <div>
          <label className="text-muted-foreground/50">{t('audit.path', '路径')}</label>
          <p className="text-foreground/80">{selectedLog.request_method || '-'} {selectedLog.request_path || '-'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">{t('audit.resourceType', '资源类型')}</label>
            <p className="text-foreground/80">{selectedLog.resource_type || '-'}</p>
          </div>
          <div>
            <label className="text-muted-foreground/50">{t('audit.resourceId', '资源ID')}</label>
            <p className="text-foreground/80 font-mono text-xs">{selectedLog.resource_id || '-'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">{t('audit.ip', 'IP地址')}</label>
            <p className="text-foreground/80">{selectedLog.ip_address || '-'}</p>
          </div>
          <div>
            <label className="text-muted-foreground/50">{t('audit.duration', '耗时')}</label>
            <p className="text-foreground/80">{formatDuration(selectedLog.duration_ms)}</p>
          </div>
        </div>
        <div>
          <label className="text-muted-foreground/50">{t('audit.time', '时间')}</label>
          <p className="text-foreground/80">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
        </div>
        {selectedLog.error_message && (
          <div>
            <label className="text-destructive">{t('audit.errorMessage', '错误信息')}</label>
            <pre className={cn('p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all', status.error.text, status.error.bgSubtle, 'border', status.error.border)}>
              {selectedLog.error_message}
            </pre>
          </div>
        )}
        {selectedLog.request_body && (
          <div>
            <label className="text-muted-foreground/50">{t('audit.requestBody', '请求体')}</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">
              {(() => {
                const body = selectedLog.request_body
                if (typeof body === 'object') {
                  return JSON.stringify(body, null, 2)
                }
                if (typeof body === 'string') {
                  try { return JSON.stringify(JSON.parse(body), null, 2) }
                  catch { return body }
                }
                return String(body)
              })()}
            </pre>
          </div>
        )}
        {selectedLog.query_params && (
          <div>
            <label className="text-muted-foreground/50">{t('audit.queryParams', '查询参数')}</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(selectedLog.query_params, null, 2)}
            </pre>
          </div>
        )}
        {selectedLog.response_body && (
          <div>
            <label className="text-muted-foreground/50">{t('audit.responseBody', '响应体')}</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
              {(() => {
                try { return JSON.stringify(JSON.parse(selectedLog.response_body), null, 2) }
                catch { return selectedLog.response_body }
              })()}
            </pre>
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={copyLogToClipboard}>
          {copied ? (
            <><Check className="w-4 h-4 mr-2" />{t('common.copied', '已复制')}</>
          ) : (
            <><Copy className="w-4 h-4 mr-2" />{t('common.copy', '复制')}</>
          )}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {t('common.close', '关闭')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
