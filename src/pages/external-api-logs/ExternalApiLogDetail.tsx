import { Check, Copy } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'
import { status as statusTokens } from '@/themes/tokens'
import type { ExternalApiLog, ExternalApiStatus } from '@/lib/api/external-api-logs'

export function ExternalApiLogDetail({
  selectedLog,
  copied,
  providerColors,
  statusConfig,
  formatDuration,
  onCopy,
  onClose,
  t,
}: {
  selectedLog: ExternalApiLog
  copied: boolean
  providerColors: Record<string, string>
  statusConfig: Record<ExternalApiStatus, { color: string; label: string }>
  formatDuration: (ms: number | null) => string
  onCopy: (log: ExternalApiLog) => void
  onClose: () => void
  t: (key: string, fallback?: string) => string
}) {
  const getProviderColor = (p: string) => providerColors[p] || 'bg-muted/20 text-muted-foreground border-border'

  return (
    <Dialog open={!!selectedLog} onClose={onClose} size="lg">
      <DialogHeader>
        <h2 className="text-lg font-semibold">{t('externalApiLogs.logDetail', '日志详情')}</h2>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.provider', '服务商')}</label>
            <Badge className={cn('ml-2', getProviderColor(selectedLog.service_provider))}>{selectedLog.service_provider}</Badge>
          </div>
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.status', '状态')}</label>
            <Badge className={cn('ml-2', statusConfig[selectedLog.status].color)}>{statusConfig[selectedLog.status].label}</Badge>
          </div>
        </div>
        <div>
          <label className="text-muted-foreground/50">{t('externalApiLogs.apiEndpoint', 'API路径')}</label>
          <p className="text-foreground/80 font-mono text-xs">{selectedLog.api_endpoint}</p>
        </div>
        <div>
          <label className="text-muted-foreground/50">{t('externalApiLogs.operation', '操作')}</label>
          <p className="text-foreground/80">{selectedLog.operation}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.duration', '耗时')}</label>
            <p className="text-foreground/80">{formatDuration(selectedLog.duration_ms)}</p>
          </div>
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.time', '时间')}</label>
            <p className="text-foreground/80">{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</p>
          </div>
        </div>
        {selectedLog.error_message && (
          <div>
            <label className="text-destructive">{t('externalApiLogs.errorMessage', '错误信息')}</label>
            <pre className={cn('p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all', statusTokens.error.text, statusTokens.error.bgSubtle, 'border', statusTokens.error.border)}>{selectedLog.error_message}</pre>
          </div>
        )}
        {selectedLog.request_params && (
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.requestParams', '请求参数')}</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all">{JSON.stringify(selectedLog.request_params, null, 2)}</pre>
          </div>
        )}
        {selectedLog.request_body && (
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.requestBody', '请求体')}</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
              {(() => { try { return JSON.stringify(JSON.parse(selectedLog.request_body), null, 2) } catch { return selectedLog.request_body } })()}
            </pre>
          </div>
        )}
        {selectedLog.response_body && (
          <div>
            <label className="text-muted-foreground/50">{t('externalApiLogs.responseBody', '响应体')}</label>
            <pre className="text-muted-foreground bg-card/secondary p-2 rounded mt-1 overflow-x-auto text-xs whitespace-pre-wrap break-all max-h-64">
              {(() => { try { return JSON.stringify(JSON.parse(selectedLog.response_body), null, 2) } catch { return selectedLog.response_body } })()}
            </pre>
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onCopy(selectedLog)}>
          {copied ? <><Check className="w-4 h-4 mr-2" />{t('common.copied', '已复制')}</> : <><Copy className="w-4 h-4 mr-2" />{t('common.copy', '复制')}</>}
        </Button>
        <Button variant="outline" onClick={onClose}>{t('common.close', '关闭')}</Button>
      </DialogFooter>
    </Dialog>
  )
}
