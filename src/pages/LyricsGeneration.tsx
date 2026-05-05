import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { generateLyrics } from '@/lib/api/lyrics'
import { createMedia } from '@/lib/api/media'
import { toastSuccess, toastError } from '@/lib/toast'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'
import type { LyricsMode, LyricsTask, LyricsGenerationResponse, LyricsGenerationRequest } from '@/types/lyrics'
import { LyricsInput } from './lyrics-generation/LyricsInput.js'
import { LyricsResults } from './lyrics-generation/LyricsResults.js'
import { DEFAULT_FORM, exportLyricsToTxt, type LyricsFormData } from './lyrics-generation/constants.js'

export default function LyricsGeneration() {
  const { t } = useTranslation()

  const [formData, setFormData] = useFormPersistence<LyricsFormData>({
    storageKey: DEBUG_FORM_KEYS.LYRICS_GENERATION,
    defaultValue: DEFAULT_FORM,
  })

  const updateForm = useCallback((key: keyof LyricsFormData, value: LyricsFormData[keyof LyricsFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [setFormData])

  const { mode, prompt, lyrics, title, parallelCount } = formData

  const [tasks, setTasks] = useState<LyricsTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const updateTask = useCallback((index: number, updates: Partial<LyricsTask>) => {
    setTasks(prev => {
      const newTasks = [...prev]
      newTasks[index] = { ...newTasks[index], ...updates }
      return newTasks
    })
  }, [])

  const saveLyricsToMedia = async (
    result: LyricsGenerationResponse,
    taskTitle?: string,
    index?: number
  ): Promise<{ id: string; title: string } | null> => {
    try {
      const songTitle = result.song_title || taskTitle || 'Unnamed'
      let filename: string
      if (songTitle && songTitle.trim()) {
        const sanitizedTitle = songTitle.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')
        if (index !== undefined) {
          filename = `${sanitizedTitle} (${index + 1}).txt`
        } else {
          filename = `${sanitizedTitle}.txt`
        }
      } else {
        filename = `lyrics_${Date.now()}.txt`
      }

      const styleTags = Array.isArray(result.style_tags)
        ? result.style_tags
        : (result.style_tags ? result.style_tags.split(',').map(s => s.trim()) : [])

      const mediaResult = await createMedia({
        filename,
        filepath: `lyrics://virtual/${Date.now()}`,
        type: 'lyrics',
        source: 'lyrics_generation',
        size_bytes: new TextEncoder().encode(result.lyrics).length,
        metadata: {
          title: songTitle,
          style_tags: styleTags,
          lyrics: result.lyrics,
          mode: formData.mode,
          generated_at: new Date().toISOString(),
        },
      })

      if (mediaResult.success && mediaResult.data) {
        return {
          id: mediaResult.data.id,
          title: mediaResult.data.original_name || mediaResult.data.filename,
        }
      }
      return null
    } catch { return null }
  }

  const handleGenerate = async () => {
    if (mode === 'edit' && !lyrics.trim()) {
      toastError(t('lyrics.errorEditModeEmpty'))
      return
    }
    if (mode === 'write_full_song' && !prompt.trim()) {
      toastError(t('lyrics.errorWriteModeEmpty'))
      return
    }
    if (prompt.length > 2000) {
      toastError(t('lyrics.errorPromptTooLong'))
      return
    }

    const request: LyricsGenerationRequest = {
      mode,
      prompt: mode === 'write_full_song' ? prompt : undefined,
      lyrics: mode === 'edit' ? lyrics : undefined,
      title,
    }

    if (parallelCount === 1) {
      const taskId = `lyrics-${Date.now()}`
      const newTask: LyricsTask = {
        id: taskId,
        status: 'generating',
        request,
        createdAt: new Date().toISOString(),
      }

      setTasks(prev => [newTask, ...prev].slice(0, 10))
      setCurrentIndex(0)
      setIsGenerating(true)

      try {
        const response = await generateLyrics(request)
        const result = response.data
        if (!result) {
          throw new Error('No result from lyrics generation')
        }
        setTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, status: 'completed', result } : task
        ))
        toastSuccess(t('lyrics.successGenerated'))

        saveLyricsToMedia(result, title).then(mediaInfo => {
          if (mediaInfo) {
            setTasks(prev => prev.map(task =>
              task.id === taskId ? { ...task, mediaId: mediaInfo.id, mediaTitle: mediaInfo.title } : task
            ))
          }
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : t('lyrics.errorGenerationFailed')
        setTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, status: 'failed', error: errorMsg } : task
        ))
        toastError(errorMsg)
      } finally {
        setIsGenerating(false)
      }
    } else {
      const newTasks: LyricsTask[] = Array.from({ length: parallelCount }, (_, i) => ({
        id: `lyrics-${Date.now()}-${i}`,
        status: 'generating' as const,
        request,
        createdAt: new Date().toISOString(),
      }))
      setTasks(newTasks)
      setCurrentIndex(0)
      setIsGenerating(true)

      const promises = newTasks.map(async (_task, index) => {
        try {
          const response = await generateLyrics(request)
          const result = response.data
          if (!result) {
            throw new Error('No result from lyrics generation')
          }
          updateTask(index, { status: 'completed', result })
          saveLyricsToMedia(result, title, index)
          return { success: true, index }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : t('lyrics.errorGenerationFailed')
          updateTask(index, { status: 'failed', error: errorMsg })
          return { success: false, index }
        }
      })

      await Promise.allSettled(promises)
      setIsGenerating(false)
      toastSuccess(t('lyrics.successGenerated'))
    }
  }

const handleRetry = async (index: number) => {
    const task = tasks[index]
    if (!task.request) return

    updateTask(index, { status: 'generating' })
    setIsGenerating(true)

    try {
      const response = await generateLyrics(task.request)
      const result = response.data
      if (!result) {
        throw new Error('No result from lyrics generation')
      }
      updateTask(index, { status: 'completed', result })
      toastSuccess(t('lyrics.successGenerated'))
      saveLyricsToMedia(result, task.request.title, index)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t('lyrics.errorGenerationFailed')
      updateTask(index, { status: 'failed', error: errorMsg })
      toastError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEdit = (result: LyricsGenerationResponse) => {
    updateForm('mode', 'edit')
    updateForm('lyrics', result.lyrics)
    updateForm('title', result.song_title || '')
    updateForm('prompt', '')
    toastSuccess('已切换到编辑模式，歌词已填入左侧输入框')
  }

  const clearAll = () => {
    setTasks([])
    setCurrentIndex(0)
    setFormData(DEFAULT_FORM)
    setIsGenerating(false)
  }

  const generateApiCurl = useCallback(() => {
    const baseUrl = 'https://api.minimaxi.com'
    const endpoint = '/v1/lyrics_generation'

    const body: Record<string, unknown> = { mode }

    if (mode === 'write_full_song') {
      body.prompt = prompt.trim()
    } else {
      body.lyrics = lyrics.trim()
    }

    if (title.trim()) {
      body.title = title.trim()
    }

    return `curl --request POST \\
  --url '${baseUrl}${endpoint}' \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify(body, null, 2)}'`
  }, [mode, prompt, lyrics, title])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('lyrics.title')}
        description="AI 辅助歌词创作与优化"
        icon={<FileText className="w-5 h-5" />}
        gradient="violet-purple"
        actions={
          <WorkbenchActions
            helpTitle={t('lyrics.creationTipsTitle') || '歌词创作提示'}
            helpTips={(<ul className="text-xs text-muted-foreground space-y-2"><li className="whitespace-normal">• 写整首歌：提供创作主题和风格描述</li><li className="whitespace-normal">• 编辑模式：输入已有歌词优化修改</li><li className="whitespace-normal">• 提示词越具体，结果越符合预期</li><li className="whitespace-normal">• 支持导出歌词为文本文件</li></ul>)}
            generateCurl={generateApiCurl}
            onClear={clearAll}
            clearLabel={t('common.clear')}
          />
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <LyricsInput
          characterLabel={t('common.characters')}
          generateLabel={t('lyrics.generate')}
          generatingLabel={t('common.generating')}
          isGenerating={isGenerating}
          lyrics={lyrics}
          lyricsInputLabel={t('lyrics.lyricsInput')}
          lyricsPlaceholder={t('lyrics.lyricsPlaceholder')}
          mode={mode}
          parallelCount={parallelCount}
          prompt={prompt}
          promptLabel={t('lyrics.prompt')}
          promptPlaceholder={t('lyrics.promptPlaceholder')}
          title={title}
          titleInputLabel={t('lyrics.titleInput')}
          onGenerate={handleGenerate}
          onLyricsChange={(value) => updateForm('lyrics', value)}
          onModeChange={(value) => updateForm('mode', value)}
          onParallelCountChange={(value) => updateForm('parallelCount', value)}
          onPromptChange={(value) => updateForm('prompt', value)}
          onTitleChange={(value) => updateForm('title', value)}
        />

        <LyricsResults
          currentIndex={currentIndex}
          resultLabel={t('lyrics.result')}
          tasks={tasks}
          onEdit={handleEdit}
          onExport={exportLyricsToTxt}
          onIndexChange={setCurrentIndex}
          onRetry={handleRetry}
        />
      </div>
    </div>
  )
}
