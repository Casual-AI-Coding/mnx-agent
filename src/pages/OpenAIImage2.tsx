import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Globe } from 'lucide-react'
import { motion } from 'framer-motion'

import { WorkbenchActions } from '@/components/shared/WorkbenchActions'
import { PageHeader } from '@/components/shared/PageHeader'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks/useFormPersistence'
import { submitTask, getTaskStatus } from '@/lib/api/external-api-logs'
import { getMediaToken } from '@/lib/api/media'
import { useSettingsStore } from '@/settings/store'
import { buildOpenAIImage2Url, type OpenAIImage2RequestBody } from '@/lib/openai-image-2'

import { ConnectionConfigCard } from './openai-image-2/ConnectionConfigCard'
import { GenerationParamsCard } from './openai-image-2/GenerationParamsCard'
import { ResultPreview } from './openai-image-2/ResultPreview'
import { FullscreenPreview } from './openai-image-2/FullscreenPreview'
import {
  type OpenAIImage2FormData,
  type RetryRecord,
  type OpenAIImage2Result,
  formatExternalApiError,
  containerVariants,
  itemVariants,
} from './openai-image-2/types'

export default function OpenAIImage2() {
  const settingsEndpoints = useSettingsStore(s => s.settings.api.externalEndpoints ?? [])
  const openaiEndpoints = useMemo(
    () => settingsEndpoints.filter(ep => ep.protocol === 'openai'),
    [settingsEndpoints]
  )
  const baseUrlOptions = useMemo(
    () => openaiEndpoints.map(ep => ({ value: ep.url, label: ep.name, id: ep.id })),
    [openaiEndpoints]
  )
  const endpointById = useMemo(
    () => new Map(openaiEndpoints.map(ep => [ep.id, ep])),
    [openaiEndpoints]
  )

  const [formData, setFormData] = useFormPersistence<OpenAIImage2FormData>({
    storageKey: DEBUG_FORM_KEYS.OPENAI_IMAGE_2,
    defaultValue: {
      baseUrl: openaiEndpoints[0]?.url ?? 'https://mikuapi.org',
      endpointId: openaiEndpoints[0]?.id ?? '',
      bearerToken: '',
      prompt: '',
      model: 'gpt-image-2',
      n: 1,
      size: '1536x2048',
      quality: 'high',
      background: 'auto',
      outputFormat: 'png',
      moderation: 'low',
      retryCount: 0,
    },
  })

  const [result, setResult] = useState<OpenAIImage2Result>({ status: 'idle' })
  const [retryHistory, setRetryHistory] = useState<RetryRecord[]>([])
  const [currentRetryIndex, setCurrentRetryIndex] = useState(0)
  const [fullscreenPreview, setFullscreenPreview] = useState(false)

  const lastAutoFillRef = useRef<string>('')

  useEffect(() => {
    if (lastAutoFillRef.current === formData.baseUrl) return
    lastAutoFillRef.current = formData.baseUrl
    const endpoint = endpointById.get(formData.endpointId)
    if (endpoint?.apiKey) {
      setFormData(prev => ({ ...prev, bearerToken: endpoint.apiKey }))
    }
  }, [formData.baseUrl, formData.endpointId, endpointById, setFormData])

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
    const { baseUrl, bearerToken, prompt, model, n, size, quality, background, outputFormat, moderation, retryCount } = formData
    if (!prompt.trim() || !bearerToken.trim()) return

    if (result.previewUrl) {
      URL.revokeObjectURL(result.previewUrl)
    }
    retryHistory.forEach(r => {
      if (r.previewUrl) URL.revokeObjectURL(r.previewUrl)
    })

    setResult({ status: 'creating-log' })
    setRetryHistory([])
    setCurrentRetryIndex(0)

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

    const maxAttempts = retryCount + 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptRecord: RetryRecord = {
        attempt,
        status: 'generating',
        timestamp: new Date().toISOString(),
      }
      setRetryHistory(prev => [...prev, attemptRecord])
      setCurrentRetryIndex(attempt - 1)
      setResult(prev => ({ ...prev, status: 'generating' }))

      try {
        const url = buildOpenAIImage2Url(baseUrl)
        const submitResult = await submitTask({
          url,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
          },
          body,
          service_provider: 'openai',
          operation: 'image_generation',
          media_type: 'image',
        })

        if (!submitResult.success || !submitResult.data) {
          throw new Error(`任务提交失败: ${submitResult.error}`)
        }

        const taskId = submitResult.data.taskId
        let taskStatus: string = 'pending'
        let resultMediaId: string | null = null
        let errorMessage: string | null = null
        const startTime = performance.now()

        const maxPollAttempts = 60
        const pollIntervalMs = 10000
        let pollAttempts = 0

        while ((taskStatus === 'pending' || taskStatus === 'processing') && pollAttempts < maxPollAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
          const statusResult = await getTaskStatus(taskId)

          if (!statusResult.success || !statusResult.data) {
            throw new Error(`状态查询失败: ${statusResult.error}`)
          }

          taskStatus = statusResult.data.task_status
          resultMediaId = statusResult.data.result_media_id
          errorMessage = statusResult.data.error_message
          pollAttempts++
        }

        if (pollAttempts >= maxPollAttempts && (taskStatus === 'pending' || taskStatus === 'processing')) {
          throw new Error('任务超时，请稍后重试')
        }

        const durationMs = Math.round(performance.now() - startTime)

        if (taskStatus === 'completed') {
          let previewUrl: string | undefined
          if (resultMediaId) {
            try {
              const tokenResult = await getMediaToken(resultMediaId)
              if (tokenResult.success && tokenResult.data) {
                previewUrl = tokenResult.data.downloadUrl
              }
            } catch {
              previewUrl = undefined
            }
          }
          setResult(prev => ({
            ...prev,
            status: 'success',
            previewUrl,
            durationMs,
            externalApiLogId: taskId,
            mediaRecordId: resultMediaId ?? undefined,
          }))

          setRetryHistory(prev => {
            const updated = [...prev]
            updated[attempt - 1] = {
              ...updated[attempt - 1],
              status: 'success',
              durationMs,
              previewUrl,
            }
            return updated
          })
          break
        } else {
          throw new Error(errorMessage || '任务执行失败')
        }
      } catch (err) {
        const error = formatExternalApiError(err)
        setRetryHistory(prev => {
          const updated = [...prev]
          updated[attempt - 1] = {
            ...updated[attempt - 1],
            status: 'failed',
            error,
          }
          return updated
        })

        if (attempt >= maxAttempts) {
          setResult({
            status: 'failed',
            error,
          })
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
  }, [formData, result.previewUrl, retryHistory])

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
    retryHistory.forEach(r => {
      if (r.previewUrl) URL.revokeObjectURL(r.previewUrl)
    })
    setResult({ status: 'idle' })
    setRetryHistory([])
    setCurrentRetryIndex(0)
  }, [result.previewUrl, retryHistory])

  const clearAll = useCallback(() => {
    setFormData({
      baseUrl: openaiEndpoints[0]?.url ?? '',
      endpointId: openaiEndpoints[0]?.id ?? '',
      bearerToken: '',
      prompt: '',
      model: 'gpt-image-2',
      n: 1,
      size: '1536x2048',
      quality: 'high',
      background: 'auto',
      outputFormat: 'png',
      moderation: 'low',
      retryCount: 0,
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

  const currentPreviewUrl = useMemo(() => {
    if (retryHistory.length > 1 && retryHistory[currentRetryIndex]?.previewUrl) {
      return retryHistory[currentRetryIndex].previewUrl
    }
    return result.previewUrl
  }, [retryHistory, currentRetryIndex, result.previewUrl])

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
            <ConnectionConfigCard
              formData={formData}
              updateForm={updateForm}
              isBusy={isBusy}
              baseUrlOptions={baseUrlOptions}
            />
            <GenerationParamsCard
              formData={formData}
              updateForm={updateForm}
              isBusy={isBusy}
              resultStatus={result.status}
              onGenerate={handleGenerate}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="xl:col-span-7 space-y-6 flex flex-col">
            <ResultPreview
              result={result}
              retryHistory={retryHistory}
              currentRetryIndex={currentRetryIndex}
              setCurrentRetryIndex={setCurrentRetryIndex}
              onReset={resetResult}
              outputFormat={formData.outputFormat}
              onFullscreen={() => setFullscreenPreview(true)}
            />
          </motion.div>
        </div>
      </motion.div>

      <FullscreenPreview
        previewUrl={fullscreenPreview ? currentPreviewUrl : undefined}
        onClose={() => setFullscreenPreview(false)}
      />
    </>
  )
}
