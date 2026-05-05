import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { ExternalApiLog, ExternalApiStatus, ServiceProvider } from '@/lib/api/external-api-logs'

const PROVIDER_COLORS: Record<string, string> = {
  minimax: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
  deepseek: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}
const DEFAULT_PROVIDER_COLOR = 'bg-muted/20 text-muted-foreground border-border'

const STATUS_CONFIG: Record<ExternalApiStatus, { color: string; label: string }> = {
  success: { color: cn(status.success.bgSubtle, status.success.icon, status.success.border), label: '成功' },
  failed: { color: cn(status.error.bgSubtle, status.error.icon, status.error.border), label: '失败' },
  pending: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '进行中' },
}

function getProviderColor(provider: ServiceProvider | string) {
  return PROVIDER_COLORS[provider] || DEFAULT_PROVIDER_COLOR
}

interface LogDetailDialogProps {
  log: ExternalApiLog
  onClose: () => void
  formatDuration: (ms: number | null) => string
}

export function LogDetailDialog({ log, onClose, formatDuration }: LogDetailDialogProps) {
  const [copied, setCopied] = useState(false)

  const copyLogToClipboard = async () => {
    const content = `## 外部调用日志详情

**服务商**: ${log.service_provider}
**API**: ${log.api_endpoint}
**操作**: ${log.operation}
**状态**: ${log.status}
**耗时**: ${formatDuration(log.duration_ms)}
**时间**: ${new Date(log.created_at).toLocaleString('zh-CN')}
${log.error_message ? `\n**错误信息**:\n\`\`\`\n${log.error_message}\n\`\`\`` : ''}
${log.request_params ? `\n**请求参数**:\n\`\`\`json\n${JSON.stringify(log.request_params, null, 2)}\n\`\`\`` : ''}
${log.request_body ? `\n**请求体**:\n\`\`\`\n${log.request_body}\n\`\`\`` : ''}
${log.response_body ? `\n**响应体**:\n\`\`\`\n${log.response_body}\n\`\`\`` : ''}`

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

  const formatTimeStr = (dateStr: string) =>
    new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })

  return (
    <Dialog open onClose={onClose} size="lg">
      <DialogHeader>
        <h2 className="text-lg font-semibold">日志详情</h2>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">服务商</label>
            <Badge className={cn('ml-2', getProviderColor(log.service_provider))}>
              {log.service_provider}
            </Badge>
          </div>
          <div>
            <label className="text-muted-foreground/50">状态</label>
            <Badge className={cn('ml-2', STATUS_CONFIG[log.status].color)}>
              {STATUS_CONFIG[log.status].label}
            </Badge>
          </div>
        </div>
        <div>
          <label className="text-muted-foreground/50">API路径</label>
          <p className="text-foreground/80 font-mono text-xs">{log.api_endpoint}</p>
        </div>
        <div>
          <label className="text-muted-foreground/50">操作</label>
          <p className="text-foreground/80">{log.operation}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">耗时</label>
            <p className="text-foreground/80">{formatDuration(log.duration_ms)}</p>
          </div>
          <div>
            <label className="text-muted-foreground/50">时间</label>
            <p className="text-foreground/80">{formatTimeStr(log.created_at)}</p>
          </div>
        </div>
        {log.error_message && (
          <div>
            <label className="text-destructive">错误信息</label>
            <pre className={cn('p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all', status.error.text, status.error.bgSubtle, 'border', status.error.border)}>
              {log.error_message}
            </pre>
          </div>
        )}
        {log.request_params && (
          <div>
            <label className="text-muted-foreground/50">请求参数</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">
              {JSON.stringify(log.request_params, null, 2)}
            </pre>
          </div>
        )}
        {log.request_body && (
          <div>
            <label className="text-muted-foreground/50">请求体</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
              {(() => {
                try { return JSON.stringify(JSON.parse(log.request_body), null, 2) }
                catch { return log.request_body }
              })()}
            </pre>
          </div>
        )}
        {log.response_body && (
          <div>
            <label className="text-muted-foreground/50">响应体</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
              {(() => {
                try { return JSON.stringify(JSON.parse(log.response_body), null, 2) }
                catch { return log.response_body }
              })()}
            </pre>
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={copyLogToClipboard}>
          {copied ? <><Check className="w-4 h-4 mr-2" />已复制</> : <><Copy className="w-4 h-4 mr-2" />复制</>}
        </Button>
        <Button variant="outline" onClick={onClose}>关闭</Button>
      </DialogFooter>
    </Dialog>
  )
}
