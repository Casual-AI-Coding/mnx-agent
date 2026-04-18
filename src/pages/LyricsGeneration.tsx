// src/pages/LyricsGeneration.tsx

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { FileText, Loader2, Wand2, Edit3, Settings2, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/shared/PageHeader'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { generateLyrics } from '@/lib/api/lyrics'
import { toastSuccess, toastError } from '@/lib/toast'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks'
import { LyricsTaskCarousel } from '@/components/lyrics/LyricsTaskCarousel'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'
import { cn } from '@/lib/utils'
import type { LyricsMode, LyricsTask, LyricsGenerationResponse, LyricsGenerationRequest } from '@/types/lyrics'

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
        const result = await generateLyrics(request)
        setTasks(prev => prev.map(task =>
          task.id === taskId ? { ...task, status: 'completed', result } : task
        ))
        toastSuccess(t('lyrics.successGenerated'))
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
          const result = await generateLyrics(request)
          updateTask(index, { status: 'completed', result })
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
      const result = await generateLyrics(task.request)
      updateTask(index, { status: 'completed', result })
      toastSuccess(t('lyrics.successGenerated'))
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
    updateForm('title', result.song_title)
    updateForm('prompt', '')
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
            helpTips={(
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="whitespace-normal">• 写整首歌模式：提供创作主题和风格描述</li>
                <li className="whitespace-normal">• 编辑模式：输入已有歌词进行优化和修改</li>
                <li className="whitespace-normal">• 提示词越具体，生成结果越符合预期</li>
                <li className="whitespace-normal">• 支持生成后的歌词导出为文本文件</li>
              </ul>
            )}
            generateCurl={generateApiCurl}
            onClear={clearAll}
            clearLabel={t('common.clear')}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        {/* Left: Form */}
        <div className="space-y-4">
          {/* Mode selection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Settings2 className="w-5 h-5" />
                <span className="text-base font-semibold">生成模式</span>
              </div>
              <div className="p-4">
                <Select
                  value={mode}
                  onValueChange={(value) => updateForm('mode', value as LyricsMode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {mode === 'write_full_song' ? (
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-3 h-3" />
                          <span>创作模式</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-3 h-3" />
                          <span>编辑模式</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="write_full_song">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-3 h-3" />
                        <span>创作模式</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="edit">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-3 h-3" />
                        <span>编辑模式</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Parameters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Palette className="w-5 h-5" />
                <span className="text-base font-semibold">参数配置</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>{t('lyrics.titleInput')}</Label>
                  <Input
                    value={title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    placeholder="歌曲标题（可选）"
                    maxLength={100}
                  />
                </div>

                {mode === 'write_full_song' && (
                  <div className="space-y-2">
                    <Label>{t('lyrics.prompt')}</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => updateForm('prompt', e.target.value)}
                      placeholder={t('lyrics.promptPlaceholder')}
                      maxLength={2000}
                      rows={8}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {prompt.length}/2000 {t('common.characters')}
                    </p>
                  </div>
                )}

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

                <div className="space-y-2">
                  <Label>并发生成数量</Label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => !isGenerating && updateForm('parallelCount', n)}
                        disabled={isGenerating}
                        className={cn(
                          "w-8 h-8 rounded-md text-sm font-medium transition-all duration-200",
                          parallelCount === n
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                          isGenerating && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full shadow-lg shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('common.generating')}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                {t('lyrics.generate')}
              </>
            )}
          </Button>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
            className="relative group z-20"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-visible">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <FileText className="w-5 h-5" />
                <span className="text-base font-semibold">{t('lyrics.result')}</span>
              </div>
              <div className="p-4">
                <LyricsTaskCarousel
                  tasks={tasks}
                  currentIndex={currentIndex}
                  onIndexChange={setCurrentIndex}
                  onRetry={handleRetry}
                  onEdit={handleEdit}
                  onExport={exportLyricsToTxt}
                />
              </div>
            </div>
          </motion.div>

          {/* History note */}
          {tasks.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {t('lyrics.historyHint')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}