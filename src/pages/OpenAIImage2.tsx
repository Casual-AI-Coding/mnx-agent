import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Globe, Settings2, Loader2, Wand2, RefreshCw, Key, AlertCircle, CheckCircle2, Download, Image as ImageIcon, Maximize2, X, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ComboboxInput } from '@/components/ui/ComboboxInput'
import { SizePopup } from '@/components/ui/SizePopup'
import { Tooltip } from '@/components/ui/Tooltip'
import { PageHeader } from '@/components/shared/PageHeader'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks/useFormPersistence'
import { createExternalApiLog, updateExternalApiLog } from '@/lib/api/external-api-logs'
import { internalAxios } from '@/lib/api/client'
import { TIMEOUTS } from '@/lib/config/constants'
import { uploadMedia } from '@/lib/api/media'
import { useSettingsStore } from '@/settings/store'
import {
  parseOpenAIImage2Response,
  buildOpenAIImage2Url,
  base64ToBlob,
  extractImageBase64List,
  createOpenAIImage2RequestSummary,
  createOpenAIImage2ResponseSummary,
  type OpenAIImage2RequestBody,
  type OpenAIImage2ResponseBody,
} from '@/lib/openai-image-2'

function formatExternalApiError(err: unknown): string {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return '请求失败（可能是 CORS 跨域限制）。请确认目标 API 支持跨域请求，或使用支持 CORS 的代理地址。'
  }
  return err instanceof Error ? err.message : '外部 API 调用失败'
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
}

interface OpenAIImage2FormData {
  baseUrl: string
  bearerToken: string
  prompt: string
  model: string
  n: number
  size: string
  quality: string
  background: string
  outputFormat: string
  moderation: string
  imageTitle: string
}

type ResultStatus = 'idle' | 'creating-log' | 'generating' | 'updating-log' | 'saving-media' | 'success' | 'failed'

interface OpenAIImage2Result {
  status: ResultStatus
  previewUrl?: string
  blob?: Blob
  mediaRecordId?: string
  externalApiLogId?: number
  usage?: Record<string, unknown>
  durationMs?: number
  error?: string
}

const STATUS_LABELS: Record<ResultStatus, string> = {
  idle: '等待生成',
  'creating-log': '创建调用日志...',
  generating: '正在调用外部 API...',
  'updating-log': '更新调用日志...',
  'saving-media': '保存媒体记录...',
  success: '生成成功',
  failed: '生成失败',
}

const STATUS_COLORS: Record<ResultStatus, string> = {
  idle: 'text-muted-foreground',
  'creating-log': 'text-blue-500',
  generating: 'text-indigo-500',
  'updating-log': 'text-blue-500',
  'saving-media': 'text-blue-500',
  success: 'text-emerald-500',
  failed: 'text-red-500',
}

const MODEL_OPTIONS = [
  { value: 'gpt-image-2', label: 'GPT Image 2' },
]



const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'auto', label: 'Auto' },
]

const BACKGROUND_OPTIONS = [
  { value: 'transparent', label: '透明' },
  { value: 'opaque', label: '不透明' },
  { value: 'auto', label: 'Auto' },
]

const OUTPUT_FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]

const MODERATION_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
]

export default function OpenAIImage2() {
  const settingsEndpoints = useSettingsStore(s => s.settings.api.externalEndpoints ?? [])
  const openaiEndpoints = useMemo(
    () => settingsEndpoints.filter(ep => ep.protocol === 'openai'),
    [settingsEndpoints]
  )
  const baseUrlOptions = useMemo(
    () => openaiEndpoints.map(ep => ({ value: ep.url, label: ep.name })),
    [openaiEndpoints]
  )
  const endpointByUrl = useMemo(
    () => new Map(openaiEndpoints.map(ep => [ep.url, ep])),
    [openaiEndpoints]
  )

  const [formData, setFormData] = useFormPersistence<OpenAIImage2FormData>({
    storageKey: DEBUG_FORM_KEYS.OPENAI_IMAGE_2,
    defaultValue: {
      baseUrl: openaiEndpoints[0]?.url ?? 'https://mikuapi.org',
      bearerToken: '',
      prompt: '',
      model: 'gpt-image-2',
      n: 1,
      size: '1536x2048',
      quality: 'high',
      background: 'auto',
      outputFormat: 'png',
      moderation: 'low',
      imageTitle: '',
    },
  })

  const [result, setResult] = useState<OpenAIImage2Result>({ status: 'idle' })
  const [logUpdateFailed, setLogUpdateFailed] = useState(false)
  const [mediaSaveFailed, setMediaSaveFailed] = useState(false)
  const [lastParsedResponse, setLastParsedResponse] = useState<OpenAIImage2ResponseBody | null>(null)
  const [fullscreenPreview, setFullscreenPreview] = useState(false)
  const [sizePopupOpen, setSizePopupOpen] = useState(false)

  const lastAutoFillRef = useRef<string>('')

  useEffect(() => {
    if (lastAutoFillRef.current === formData.baseUrl) return
    lastAutoFillRef.current = formData.baseUrl
    const endpoint = endpointByUrl.get(formData.baseUrl)
    if (endpoint?.apiKey) {
      setFormData(prev => ({ ...prev, bearerToken: endpoint.apiKey }))
    }
  }, [formData.baseUrl, endpointByUrl, setFormData])

  useEffect(() => {
    return () => {
      if (result.previewUrl) {
        URL.revokeObjectURL(result.previewUrl)
      }
    }
  }, [result.previewUrl])

  useEffect(() => {
    if (!fullscreenPreview) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenPreview(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [fullscreenPreview])

  const updateForm = useCallback((updates: Partial<OpenAIImage2FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [setFormData])

  const handleGenerate = useCallback(async () => {
    const { baseUrl, bearerToken, prompt, model, n, size, quality, background, outputFormat, moderation, imageTitle } = formData
    if (!prompt.trim() || !bearerToken.trim()) return

    if (result.previewUrl) {
      URL.revokeObjectURL(result.previewUrl)
    }

    setResult({ status: 'creating-log' })
    setLogUpdateFailed(false)
    setMediaSaveFailed(false)

    const body: OpenAIImage2RequestBody = {
      model,
      prompt: prompt.trim(),
      n,
      size,
      quality,
      background,
      output_format: outputFormat,
      moderation,
    }

    let logId: number | undefined
    try {
      const logResult = await createExternalApiLog({
        service_provider: 'openai',
        api_endpoint: 'POST /v1/images/generations',
        operation: 'image_generation',
        request_params: createOpenAIImage2RequestSummary(body),
        request_body: JSON.stringify(body),
        status: 'pending',
      })
      if (!logResult.success || !logResult.data) {
        throw new Error(`创建日志失败: ${logResult.error}`)
      }
      logId = logResult.data.id
    } catch (err) {
      setResult({
        status: 'failed',
        externalApiLogId: logId,
        error: err instanceof Error ? err.message : '创建调用日志失败',
      })
      return
    }

    setResult(prev => ({ ...prev, status: 'generating', externalApiLogId: logId }))

    let parsed: OpenAIImage2ResponseBody
    let durationMs: number
    try {
      const startTime = performance.now()
      const url = buildOpenAIImage2Url(baseUrl)
      const proxyResult = await internalAxios.post('/external-proxy', {
        url,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        body,
      }, { timeout: TIMEOUTS.EXTERNAL_PROXY }).then(r => r.data)
      durationMs = Math.round(performance.now() - startTime)

      if (!proxyResult.success) {
        throw new Error(proxyResult.error || '代理请求失败')
      }

      const { status: upstreamStatus, body: upstreamBody } = proxyResult.data
      if (upstreamStatus >= 400) {
        const errorText = typeof upstreamBody === 'string'
          ? upstreamBody.slice(0, 200)
          : JSON.stringify(upstreamBody).slice(0, 200)
        throw new Error(`外部 API 响应 ${upstreamStatus}: ${errorText}`)
      }

      parsed = parseOpenAIImage2Response(upstreamBody)
      setLastParsedResponse(parsed)
    } catch (err) {
      const errorMsg = formatExternalApiError(err)
      await updateExternalApiLog(logId, {
        status: 'failed',
        error_message: errorMsg,
        duration_ms: 0,
      }).catch(() => {})
      setResult({
        status: 'failed',
        externalApiLogId: logId,
        error: errorMsg,
      })
      return
    }

    setResult(prev => ({ ...prev, status: 'updating-log' }))

    try {
      await updateExternalApiLog(logId, {
        status: 'success',
        duration_ms: durationMs,
        response_body: JSON.stringify(createOpenAIImage2ResponseSummary(parsed)),
      })
    } catch {
      setLogUpdateFailed(true)
    }

    const base64List = extractImageBase64List(parsed)
    if (base64List.length === 0) {
      setResult({
        status: 'failed',
        externalApiLogId: logId,
        durationMs,
        usage: parsed.usage,
        error: '外部 API 未返回图片数据',
      })
      return
    }

    const firstBase64 = base64List[0]
    const blob = base64ToBlob(firstBase64, `image/${outputFormat}`)
    const previewUrl = URL.createObjectURL(blob)

    setResult(prev => ({
      ...prev,
      status: 'saving-media',
      previewUrl,
      blob,
      durationMs,
      usage: parsed.usage,
    }))

    try {
      const filename = (imageTitle.trim() || `openai-image-${Date.now()}`) + `.${outputFormat}`
      const mediaResult = await uploadMedia(
        blob,
        filename,
        'image',
        'external_debug',
        {
          service_provider: 'openai',
          operation: 'image_generation',
          external_api_log_id: logId,
          model,
          prompt_summary: prompt.trim().slice(0, 100),
          size,
          quality,
          background,
          output_format: outputFormat,
          created: parsed.created,
          usage: parsed.usage,
        }
      )
      if (mediaResult.success && mediaResult.data) {
        setResult(prev => ({
          ...prev,
          status: 'success',
          mediaRecordId: mediaResult.data.id,
        }))
      } else {
        setMediaSaveFailed(true)
        setResult(prev => ({ ...prev, status: 'success' }))
      }
    } catch {
      setMediaSaveFailed(true)
      setResult(prev => ({ ...prev, status: 'success' }))
    }
  }, [formData, result.previewUrl])

  const retryMediaSave = useCallback(async () => {
    if (!result.blob) return
    setMediaSaveFailed(false)
    try {
      const filename = (formData.imageTitle.trim() || `openai-image-${Date.now()}`) + `.${formData.outputFormat}`
      const mediaResult = await uploadMedia(
        result.blob,
        filename,
        'image',
        'external_debug',
        {
          service_provider: 'openai',
          operation: 'image_generation',
          external_api_log_id: result.externalApiLogId,
          model: formData.model,
          prompt_summary: formData.prompt.trim().slice(0, 100),
          size: formData.size,
          quality: formData.quality,
          background: formData.background,
          output_format: formData.outputFormat,
          usage: result.usage,
        }
      )
      if (mediaResult.success && mediaResult.data) {
        setResult(prev => ({ ...prev, mediaRecordId: mediaResult.data.id }))
        setMediaSaveFailed(false)
      }
    } catch {
      setMediaSaveFailed(true)
    }
  }, [result.blob, result.externalApiLogId, result.usage, formData])

  const retryLogUpdate = useCallback(async () => {
    if (!result.externalApiLogId || !result.durationMs || !lastParsedResponse) return
    setLogUpdateFailed(false)
    try {
      await updateExternalApiLog(result.externalApiLogId, {
        status: 'success',
        duration_ms: result.durationMs,
        response_body: JSON.stringify(createOpenAIImage2ResponseSummary(lastParsedResponse)),
      })
      setLogUpdateFailed(false)
    } catch {
      setLogUpdateFailed(true)
    }
  }, [result.externalApiLogId, result.durationMs, lastParsedResponse])

  const generateCurl = useCallback(() => {
    const body: Record<string, unknown> = {
      model: formData.model,
      prompt: formData.prompt || 'your prompt here',
      n: formData.n,
      size: formData.size,
      quality: formData.quality,
      background: formData.background,
      output_format: formData.outputFormat,
      moderation: formData.moderation,
    }

    return `curl -X POST "${buildOpenAIImage2Url(formData.baseUrl)}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${formData.bearerToken || 'YOUR_TOKEN'}" \\
  -d '${JSON.stringify(body, null, 2)}'`
  }, [formData])

  const resetResult = useCallback(() => {
    if (result.previewUrl) {
      URL.revokeObjectURL(result.previewUrl)
    }
    setResult({ status: 'idle' })
    setLogUpdateFailed(false)
    setMediaSaveFailed(false)
    setLastParsedResponse(null)
  }, [result.previewUrl])

  const clearAll = useCallback(() => {
    setFormData({
      baseUrl: openaiEndpoints[0]?.url ?? '',
      bearerToken: '',
      prompt: '',
      model: 'gpt-image-2',
      n: 1,
      size: '1536x2048',
      quality: 'high',
      background: 'auto',
      outputFormat: 'png',
      moderation: 'low',
      imageTitle: '',
    })
    resetResult()
  }, [setFormData, resetResult, openaiEndpoints])

  const helpTips = (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-medium text-foreground">连接配置</p>
        <p className="text-muted-foreground">Base URL 从设置中的外部 API 端点读取，切换端点时自动填充对应的 API Key。页面也可临时修改。</p>
      </div>
      <div>
        <p className="font-medium text-foreground">图像生成</p>
        <p className="text-muted-foreground">填写提示词后点击「生成图像」，页面会直连外部 API 进行生成，生成结果自动保存到媒体库。</p>
      </div>
      <div>
        <p className="font-medium text-foreground">配置管理</p>
        <p className="text-muted-foreground">外部 API 端点和密钥在「设置 → API 配置 → 外部 API 配置」中统一管理。API Key 通过后端存储，不在浏览器本地缓存。</p>
      </div>
    </div>
  )

  const isBusy = result.status !== 'idle' && result.status !== 'success' && result.status !== 'failed'

  return (
    <>
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
          <motion.div variants={itemVariants}>
            <PageHeader
              icon={<Globe className="w-5 h-5" />}
              title="OpenAI Image-2"
              description="直连外部 OpenAI 兼容 API 进行图像生成调试"
              gradient="indigo-violet"
              actions={
                <WorkbenchActions
                  helpTitle="OpenAI Image-2 使用帮助"
                  helpTips={helpTips}
                  generateCurl={generateCurl}
                  onClear={clearAll}
                  clearLabel="清空"
                />
              }
            />
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <motion.div variants={itemVariants} className="xl:col-span-5 space-y-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Globe className="w-4 h-4 text-indigo-500" />
                    连接配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">Base URL</Label>
                    <ComboboxInput
                      value={formData.baseUrl}
                      onChange={v => updateForm({ baseUrl: v })}
                      options={baseUrlOptions}
                      suffix="/v1/images/generations"
                      placeholder="https://api.example.com"
                      disabled={isBusy}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Bearer Token</Label>
                      <Tooltip content="从设置中的外部 API 端点自动填充，也可临时修改" side="top">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="relative flex-1">
                      <Input
                        type="password"
                        value={formData.bearerToken}
                        onChange={e => updateForm({ bearerToken: e.target.value })}
                        placeholder="sk-..."
                        disabled={isBusy}
                        className="pr-10"
                      />
                      <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Settings2 className="w-4 h-4 text-indigo-500" />
                    生成参数
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">图片标题</Label>
                    <Input
                      value={formData.imageTitle}
                      onChange={e => updateForm({ imageTitle: e.target.value })}
                      placeholder="可选，用于保存媒体记录的名称"
                      disabled={isBusy}
                      className="flex-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">提示词</Label>
                    <Textarea
                      value={formData.prompt}
                      onChange={e => updateForm({ prompt: e.target.value })}
                      placeholder="描述你想生成的图像..."
                      rows={12}
                      disabled={isBusy}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="space-y-2 flex-1 min-w-[140px]">
                      <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                      <Select value={formData.model} onValueChange={v => updateForm({ model: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MODEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative space-y-2 flex-1 min-w-[140px]">
                      <Label className="text-xs font-medium text-muted-foreground">Size</Label>
                      <button
                        type="button"
                        onClick={() => setSizePopupOpen(true)}
                        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden"
                      >
                        <span className="line-clamp-1">{formData.size}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50 shrink-0">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <SizePopup
                        open={sizePopupOpen}
                        onClose={() => setSizePopupOpen(false)}
                        value={formData.size}
                        onChange={v => updateForm({ size: v })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Quality</Label>
                      <Select value={formData.quality} onValueChange={v => updateForm({ quality: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {QUALITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">数量</Label>
                      <Select value={String(formData.n)} onValueChange={v => updateForm({ n: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 [&>*]:min-w-0">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Background</Label>
                      <Select value={formData.background} onValueChange={v => updateForm({ background: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {BACKGROUND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Format</Label>
                      <Select value={formData.outputFormat} onValueChange={v => updateForm({ outputFormat: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OUTPUT_FORMAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Moderation</Label>
                      <Select value={formData.moderation} onValueChange={v => updateForm({ moderation: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MODERATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="w-full h-11 text-base font-medium bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg shadow-indigo-500/25"
                        onClick={handleGenerate}
                        disabled={isBusy || !formData.prompt.trim() || !formData.bearerToken.trim()}
                      >
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4 mr-1.5" />
                        )}
                        {isBusy ? STATUS_LABELS[result.status] : '生成'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="xl:col-span-7 space-y-6 flex flex-col">
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
                      {(result.status === 'success' || result.status === 'failed') && (
                        <Button variant="outline" size="sm" onClick={resetResult}>
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
                    {result.status === 'idle' && (
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
                    )}

                    {(result.status === 'creating-log' || result.status === 'generating' || result.status === 'updating-log' || result.status === 'saving-media') && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center py-20"
                      >
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                        <p className="text-sm font-medium text-foreground">{STATUS_LABELS[result.status]}</p>
                        <div className="flex items-center gap-1.5 mt-3">
                          {(['creating-log', 'generating', 'updating-log', 'saving-media'] as const).map((step, i) => (
                            <div
                              key={step}
                              className={cn(
                                'h-1.5 rounded-full transition-all duration-300',
                                ['creating-log', 'generating', 'updating-log', 'saving-media'].indexOf(result.status) >= i
                                  ? 'w-8 bg-indigo-500'
                                  : 'w-4 bg-muted'
                              )}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {result.status === 'failed' && (
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
                        <p className="text-xs text-muted-foreground max-w-md text-center">{result.error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={resetResult}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          重试
                        </Button>
                      </motion.div>
                    )}

                    {result.status === 'success' && (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/10 group">
                          {result.previewUrl && (
                            <img
                              src={result.previewUrl}
                              alt="Generated image"
                              className="w-full h-auto max-h-[500px] object-contain"
                            />
                          )}
                          {result.previewUrl && (
                            <>
                              <button
                                onClick={() => setFullscreenPreview(true)}
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-foreground/10 backdrop-blur-[1px]"
                              >
                                <div className="p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-background transition-colors">
                                  <Maximize2 className="w-5 h-5 text-foreground" />
                                </div>
                              </button>
                              <a
                                href={result.previewUrl}
                                download={`openai-image-${Date.now()}.${formData.outputFormat}`}
                                className="absolute top-3 right-3 p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </>
                          )}
                        </div>

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

                        {(logUpdateFailed || mediaSaveFailed) && (
                          <div className="space-y-2">
                            {logUpdateFailed && (
                              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-600 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>日志回写失败</span>
                                <Button variant="ghost" size="sm" className="h-5 px-1.5 ml-auto text-amber-600" onClick={retryLogUpdate}>
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            {mediaSaveFailed && (
                              <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-600 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>媒体保存失败</span>
                                <Button variant="ghost" size="sm" className="h-5 px-1.5 ml-auto text-amber-600" onClick={retryMediaSave}>
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}


                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>

        {fullscreenPreview && result.previewUrl && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setFullscreenPreview(false)}>
            <button
              onClick={() => setFullscreenPreview(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={result.previewUrl}
              alt="Fullscreen preview"
              className="max-w-[90vw] max-h-[90vh] object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
      </>
  )
}
