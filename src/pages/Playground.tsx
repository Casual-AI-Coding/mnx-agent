import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FlaskConical, Play, RotateCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { internalAxios } from '@/lib/api/client'
import { PLAYGROUND_ENDPOINTS, type PlaygroundEndpoint } from '@/components/playground/endpoint-catalog'
import { CodeSnippetGenerator } from '@/components/playground/CodeSnippetGenerator'
import { status as statusTokens } from '@/themes/tokens'
import { cn } from '@/lib/utils'

interface ParamRow {
  key: string
  value: string
}

interface PlayResponse {
  status: number | null
  durationMs: number
  body: string
  ok: boolean
}

function buildUrl(path: string, params: ParamRow[]): string {
  const search = new URLSearchParams()
  for (const { key, value } of params) {
    if (key.trim() !== '') search.append(key.trim(), value)
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

/**
 * API Playground（R-018）：交互式调试界面。
 * 端点目录 + 参数/请求体编辑 + 实时响应 + 一键生成 Python/JS/cURL 代码。
 */
export default function Playground() {
  const [endpointId, setEndpointId] = useState<string>(PLAYGROUND_ENDPOINTS[0].id)
  const endpoint: PlaygroundEndpoint = useMemo(
    () => PLAYGROUND_ENDPOINTS.find((e) => e.id === endpointId) ?? PLAYGROUND_ENDPOINTS[0],
    [endpointId]
  )

  const [params, setParams] = useState<ParamRow[]>(endpoint.params ?? [])
  const [body, setBody] = useState<string>(endpoint.body ?? '')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<PlayResponse | null>(null)
  const [bodyError, setBodyError] = useState<string | null>(null)

  // 切换端点时重置参数与请求体
  useEffect(() => {
    setParams(endpoint.params ? endpoint.params.map((p) => ({ ...p })) : [])
    setBody(endpoint.body ?? '')
    setResponse(null)
    setBodyError(null)
  }, [endpoint])

  const requestPath = useMemo(() => buildUrl(endpoint.path, params), [endpoint, params])

  const send = useCallback(async () => {
    let parsedBody: unknown
    if (endpoint.method === 'POST') {
      try {
        parsedBody = body.trim() === '' ? undefined : JSON.parse(body)
        setBodyError(null)
      } catch (error) {
        setBodyError(error instanceof Error ? error.message : 'JSON 解析失败')
        return
      }
    }

    setSending(true)
    const startedAt = performance.now()
    try {
      const resp = await internalAxios.request({
        method: endpoint.method,
        url: requestPath,
        data: parsedBody,
      })
      setResponse({
        status: resp.status,
        durationMs: Math.round(performance.now() - startedAt),
        body: JSON.stringify(resp.data, null, 2),
        ok: true,
      })
    } catch (error) {
      const axiosError = error as { response?: { status: number; data: unknown }; message?: string }
      setResponse({
        status: axiosError.response?.status ?? null,
        durationMs: Math.round(performance.now() - startedAt),
        body: axiosError.response?.data != null
          ? JSON.stringify(axiosError.response.data, null, 2)
          : axiosError.message ?? '请求失败',
        ok: false,
      })
    } finally {
      setSending(false)
    }
  }, [endpoint, requestPath, body])

  return (
    <div className="space-y-6" data-testid="playground-page">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary-400" />
          API Playground
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          交互式调试平台 API：选择端点、编辑参数、实时查看响应，并生成调用代码
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">端点目录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {PLAYGROUND_ENDPOINTS.map((item) => (
              <button
                key={item.id}
                onClick={() => setEndpointId(item.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg transition-colors',
                  item.id === endpointId ? 'bg-primary-400/10 border border-primary-400/30' : 'hover:bg-secondary/50 border border-transparent'
                )}
                data-testid={`endpoint-${item.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-secondary text-muted-foreground">
                    {item.method}
                  </span>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                  {item.sideEffect && (
                    <Badge className={cn('text-[10px] px-1.5 py-0', statusTokens.warning.bgSubtle, statusTokens.warning.text)}>
                      真实消耗
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{item.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-secondary">{endpoint.method}</span>
              <span className="font-mono text-xs text-muted-foreground truncate">{requestPath}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {endpoint.sideEffect && (
              <div className={cn('flex items-start gap-2 rounded-lg p-3 text-xs', statusTokens.warning.bgSubtle, statusTokens.warning.text)}>
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                该端点会触发真实的 MiniMax API 调用并消耗配额，请确认参数后再发送。
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">查询参数</p>
              {params.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">该端点无需查询参数</p>
              ) : (
                <div className="space-y-2">
                  {params.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) => setParams((prev) => prev.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r)))}
                        placeholder="参数名"
                        className="flex-1"
                        aria-label={`参数名 ${idx + 1}`}
                      />
                      <Input
                        value={row.value}
                        onChange={(e) => setParams((prev) => prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)))}
                        placeholder="值"
                        className="flex-1"
                        aria-label={`参数值 ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {endpoint.method === 'POST' && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">请求体（JSON）</p>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  className="font-mono text-xs"
                  aria-label="请求体"
                />
                {bodyError && <p className="text-xs text-destructive mt-1">{bodyError}</p>}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={() => void send()} disabled={sending}>
                {sending ? <RotateCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                发送请求
              </Button>
            </div>

            {response && (
              <div data-testid="playground-response">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'font-mono text-xs font-bold px-2 py-0.5 rounded',
                      response.ok ? statusTokens.success.bgSubtle : statusTokens.error.bgSubtle,
                      response.ok ? statusTokens.success.text : statusTokens.error.text
                    )}
                  >
                    {response.status ?? 'ERR'}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{response.durationMs} ms</span>
                </div>
                <pre className="text-xs bg-secondary/50 rounded-lg p-3 overflow-x-auto max-h-72 text-foreground/90 font-mono">
                  {response.body}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CodeSnippetGenerator method={endpoint.method} path={requestPath} body={body} />
    </div>
  )
}
