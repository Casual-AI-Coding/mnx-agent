import { useCallback, useEffect, useState } from 'react'
import { Gauge, RefreshCw, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { internalAxios } from '@/lib/api/client'
import { toastSuccess, toastError } from '@/lib/toast'
import { status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'

interface ServiceRateLimit {
  rpm: number
  overridden: boolean
}

interface RateLimitsResponse {
  services: Record<string, ServiceRateLimit>
  configKey: string
}

const SERVICE_LABELS: Record<string, string> = {
  text: '文本（Chat）',
  voice_sync: '语音合成（同步）',
  voice_async: '语音合成（异步）',
  image: '图片生成',
  music: '音乐生成',
  video: '视频生成',
}

interface EditState {
  [service: string]: string
}

/**
 * 速率限制管理（R-015）：Super 管理员查看/调整各服务 MiniMax API RPM，
 * 写入 system_config（ratelimit.service_rpm）即时生效，无需改代码或重启。
 */
export default function RateLimits() {
  const [data, setData] = useState<RateLimitsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edits, setEdits] = useState<EditState>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await internalAxios.get<{ data: RateLimitsResponse }>('/admin/rate-limits')
      setData(response.data.data)
      setEdits({})
    } catch (error) {
      toastError('加载速率限制失败', error instanceof Error ? error.message : undefined)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const hasChanges = Object.keys(edits).length > 0

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      // 只提交有改动的服务；空值 = 清除该服务覆盖回默认
      const parts: string[] = []
      for (const [service, raw] of Object.entries(edits)) {
        const base = data.services[service]?.rpm ?? 0
        const value = raw.trim()
        if (value === '') continue
        const rpm = parseInt(value, 10)
        if (!Number.isNaN(rpm) && rpm !== base) {
          parts.push(`${service}=${rpm}`)
        }
      }
      const response = await internalAxios.put<{ data: RateLimitsResponse }>('/admin/rate-limits', {
        config: parts.join(','),
      })
      setData(response.data.data)
      setEdits({})
      toastSuccess('速率限制已更新', '配置即时生效，无需重启')
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败'
      const detail = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
      toastError('保存速率限制失败', detail || message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6" data-testid="rate-limits-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Gauge className="w-6 h-6 text-primary-400" />
            速率限制管理
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            各服务 MiniMax API 调用频率（RPM：每分钟请求数），保存后即时生效
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="刷新">
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || loading || !hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">服务 RPM</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !data ? (
            <p className="text-sm text-muted-foreground/70 py-4">正在加载速率限制...</p>
          ) : (
            <div className="space-y-3" data-testid="rate-limit-rows">
              {Object.entries(data.services).map(([service, info]) => {
                const edited = edits[service]
                const current = edited !== undefined ? edited : String(info.rpm)
                return (
                  <div
                    key={service}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 border-b border-border/40 last:border-0"
                    data-testid={`rate-limit-${service}`}
                  >
                    <div className="sm:w-56">
                      <span className="text-sm font-medium text-foreground">{SERVICE_LABELS[service] ?? service}</span>
                      <span className="ml-2 text-xs text-muted-foreground/60">{service}</span>
                      {info.overridden && (
                        <span className={cn('ml-2 px-1.5 rounded-full text-[10px] font-medium', statusTokens.warning.bgSubtle, statusTokens.warning.text)}>
                          已覆盖
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={100000}
                        value={current}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [service]: e.target.value }))}
                        className="w-32"
                        aria-label={`${SERVICE_LABELS[service] ?? service} RPM`}
                      />
                      <span className="text-xs text-muted-foreground/70">RPM</span>
                      {edited !== undefined && parseInt(edited, 10) !== info.rpm && (
                        <span className="text-xs text-muted-foreground/50">
                          默认 {info.rpm}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 覆盖配置存储在系统配置（ratelimit.service_rpm），清空输入并保存可回退默认值</li>
            <li>• RPM 取值范围 1 ~ 100000，超过供应商配额可能导致请求被上游拒绝</li>
            <li>• 保存后容量检查与保护限流立即按新值计算，无需重启服务</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
