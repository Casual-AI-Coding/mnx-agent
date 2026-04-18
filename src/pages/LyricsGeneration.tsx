// src/pages/LyricsGeneration.tsx

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Loader2, Wand2, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { generateLyrics } from '@/lib/api/lyrics'
import { toastSuccess, toastError } from '@/lib/toast'
import { useFormPersistence } from '@/hooks'
import { LyricsTaskCarousel } from '@/components/lyrics/LyricsTaskCarousel'
import type { LyricsMode, LyricsTask, LyricsGenerationResponse, LyricsGenerationRequest } from '@/types/lyrics'

type LyricsFormData = {
  mode: LyricsMode
  prompt: string
  lyrics: string
  title: string
}

const DEFAULT_FORM: LyricsFormData = {
  mode: 'write_full_song',
  prompt: '',
  lyrics: '',
  title: '',
}

// Export lyrics to txt file
function exportLyricsToTxt(result: LyricsGenerationResponse) {
  const content = result.lyrics
  const filename = `${result.song_title || 'lyrics'}.txt`

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function LyricsGeneration() {
  const { t } = useTranslation()

  const [formData, setFormData] = useFormPersistence<LyricsFormData>({
    storageKey: 'lyrics-generation',
    defaultValue: DEFAULT_FORM,
  })

  const updateForm = useCallback((key: keyof LyricsFormData, value: LyricsFormData[keyof LyricsFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [setFormData])

  const { mode, prompt, lyrics, title } = formData

  const [tasks, setTasks] = useState<LyricsTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate lyrics
  const handleGenerate = async () => {
    // Validation
    if (mode === 'edit' && !lyrics.trim()) {
      toastError('编辑模式需要输入歌词')
      return
    }
    if (mode === 'write_full_song' && !prompt.trim()) {
      toastError('创作模式需要输入创作提示')
      return
    }
    if (prompt.length > 2000) {
      toastError('创作提示不能超过2000字符')
      return
    }

    const taskId = `lyrics-${Date.now()}`
    const newTask: LyricsTask = {
      id: taskId,
      status: 'generating',
      request: { mode, prompt, lyrics, title },
      createdAt: new Date().toISOString(),
    }

    setTasks(prev => [newTask, ...prev])
    setCurrentIndex(0)
    setIsGenerating(true)

    try {
      const request: LyricsGenerationRequest = {
        mode,
        prompt: mode === 'write_full_song' ? prompt : undefined,
        lyrics: mode === 'edit' ? lyrics : undefined,
        title,
      }

      const result = await generateLyrics(request)

      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'completed', result }
          : task
      ))
      toastSuccess('歌词生成完成')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成失败'
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'failed', error: errorMsg }
          : task
      ))
      toastError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  // Retry failed task
  const handleRetry = async (index: number) => {
    const task = tasks[index]
    if (!task.request) return

    const taskId = `lyrics-${Date.now()}`
    const newTask: LyricsTask = {
      id: taskId,
      status: 'generating',
      request: task.request,
      createdAt: new Date().toISOString(),
    }

    setTasks(prev => {
      const updated = [...prev]
      updated[index] = newTask
      return updated
    })
    setIsGenerating(true)

    try {
      const result = await generateLyrics(task.request)
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'completed', result } : t
      ))
      toastSuccess('歌词生成完成')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '生成失败'
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'failed', error: errorMsg } : t
      ))
      toastError(errorMsg)
    } finally {
      setIsGenerating(false)
    }
  }

  // Edit this lyrics - switch to edit mode with lyrics filled
  const handleEdit = (result: LyricsGenerationResponse) => {
    updateForm('mode', 'edit')
    updateForm('lyrics', result.lyrics)
    updateForm('title', result.song_title)
    updateForm('prompt', '') // clear prompt for edit mode
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <PageHeader
        title={t('lyrics.title')}
        description="AI 辅助歌词创作与优化"
        icon={<FileText className="w-5 h-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Mode selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">生成模式</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={mode}
                onValueChange={(value) => updateForm('mode', value as LyricsMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择生成模式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="write_full_song">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-3 h-3" />
                      {t('lyrics.modeWrite')}
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3 h-3" />
                      {t('lyrics.modeEdit')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">参数配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title (optional for both modes) */}
              <div className="space-y-2">
                <Label>{t('lyrics.titleInput')}</Label>
                <Input
                  value={title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="歌曲标题（可选）"
                  maxLength={100}
                />
              </div>

              {/* Prompt (write_full_song mode) */}
              {mode === 'write_full_song' && (
                <div className="space-y-2">
                  <Label>{t('lyrics.prompt')}</Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => updateForm('prompt', e.target.value)}
                    placeholder={t('lyrics.promptPlaceholder')}
                    maxLength={2000}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {prompt.length}/2000 {t('common.characters')}
                  </p>
                </div>
              )}

              {/* Lyrics input (edit mode) */}
              {mode === 'edit' && (
                <div className="space-y-2">
                  <Label>{t('lyrics.lyricsInput')}</Label>
                  <Textarea
                    value={lyrics}
                    onChange={(e) => updateForm('lyrics', e.target.value)}
                    placeholder={t('lyrics.lyricsPlaceholder')}
                    rows={8}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {lyrics.length} {t('common.characters')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('common.generating')}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                {t('lyrics.generate')}
              </>
            )}
          </Button>
        </div>

        {/* Right: Results */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('lyrics.result')}</CardTitle>
            </CardHeader>
            <CardContent>
              <LyricsTaskCarousel
                tasks={tasks}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onRetry={handleRetry}
                onEdit={handleEdit}
                onExport={exportLyricsToTxt}
              />
            </CardContent>
          </Card>

          {/* History note */}
          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              最近生成的歌词（最多保留10条）
            </p>
          )}
        </div>
      </div>
    </div>
  )
}