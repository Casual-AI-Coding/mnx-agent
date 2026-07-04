import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { generateLyrics } from '@/lib/api/lyrics'
import { toastSuccess, toastError } from '@/lib/toast'
import { useFormPersistence, FORM_PERSISTENCE_KEYS } from '@/hooks'
import { ResourceReferenceCard } from '@/components/resources/ResourceReferenceCard'
import {
  upsertResourceReference,
  type ResourceReference,
} from '@/lib/resource-references'
import type { LyricsMode, LyricsTask, LyricsGenerationResponse, LyricsGenerationRequest } from '@/types/lyrics'
import { LyricsGenerationForm } from './LyricsGeneration/LyricsGenerationForm.js'
import { LyricsGenerationHeader } from './LyricsGeneration/LyricsGenerationHeader.js'
import { LyricsGenerationResults } from './LyricsGeneration/LyricsGenerationResults.js'
import { downloadLyricsFile } from './LyricsGeneration/lyricsExport.js'
import { saveLyricsToMedia as persistLyricsToMedia } from './LyricsGeneration/lyricsMedia'

type LyricsFormData = {
  mode: LyricsMode
  prompt: string
  lyrics: string
  title: string
  parallelCount: number
}

const DEFAULT_FORM: LyricsFormData = {
  mode: 'write_full_song',
  prompt: '',
  lyrics: '',
  title: '',
  parallelCount: 1,
}

export default function LyricsGeneration() {
  const { t } = useTranslation()

  const [formData, setFormData] = useFormPersistence<LyricsFormData>({
    storageKey: FORM_PERSISTENCE_KEYS.LYRICS_GENERATION,
    defaultValue: DEFAULT_FORM,
  })

  const updateForm = useCallback((key: keyof LyricsFormData, value: LyricsFormData[keyof LyricsFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [setFormData])

  const { mode, prompt, lyrics, title, parallelCount } = formData

  const [tasks, setTasks] = useState<LyricsTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [resourceReferences, setResourceReferences] = useState<readonly ResourceReference[]>([])

  const updateTask = useCallback((index: number, updates: Partial<LyricsTask>) => {
    setTasks(prev => {
      const newTasks = [...prev]
      newTasks[index] = { ...newTasks[index], ...updates }
      return newTasks
    })
  }, [])

  const trackResourceReference = (reference: ResourceReference) => {
    setResourceReferences(current => upsertResourceReference(current, reference))
  }

  const saveLyricsToMedia = async (
    result: LyricsGenerationResponse,
    taskTitle?: string,
    index?: number,
    references: readonly ResourceReference[] = resourceReferences
  ): Promise<{ id: string; title: string } | null> => {
    return persistLyricsToMedia({ mode: formData.mode, references, result, taskTitle, index })
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
        resourceReferences,
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

        saveLyricsToMedia(result, title, undefined, newTask.resourceReferences).then(mediaInfo => {
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
        resourceReferences,
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
          saveLyricsToMedia(result, title, index, _task.resourceReferences ?? [])
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
      saveLyricsToMedia(result, task.request.title, index, task.resourceReferences ?? [])
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
    setResourceReferences([])
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
      <LyricsGenerationHeader generateCurl={generateApiCurl} onClear={clearAll} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <LyricsGenerationForm
          mode={mode}
          title={title}
          prompt={prompt}
          lyrics={lyrics}
          parallelCount={parallelCount}
          isGenerating={isGenerating}
          updateForm={(key, value) => updateForm(key as keyof LyricsFormData, value as LyricsFormData[keyof LyricsFormData])}
          onGenerate={handleGenerate}
          resourceReferenceSlot={(
            <ResourceReferenceCard
              generationType="lyrics"
              onApplyTemplate={({ content, reference }) => {
                updateForm('mode', 'write_full_song')
                updateForm('prompt', content)
                trackResourceReference(reference)
              }}
              onApplyMaterialItem={({ lyrics: materialLyrics, reference }) => {
                updateForm('mode', 'edit')
                updateForm('lyrics', materialLyrics)
                trackResourceReference(reference)
              }}
              onApplyWorkflow={({ reference }) => trackResourceReference(reference)}
            />
          )}
          t={t}
        />

        <LyricsGenerationResults
          tasks={tasks}
          currentIndex={currentIndex}
          isGenerating={isGenerating}
          onIndexChange={setCurrentIndex}
          onRetry={handleRetry}
          onEdit={handleEdit}
          onExport={downloadLyricsFile}
          t={t}
        />
      </div>
    </div>
  )
}
