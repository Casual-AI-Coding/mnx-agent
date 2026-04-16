import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Music, Loader2, Wand2, RefreshCw, Music2, Settings2, HelpCircle, X, Palette, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/utils'
import { generateMusic, preprocessMusic } from '@/lib/api/music'
import { uploadMediaFromUrl, toggleFavorite, togglePublic, deleteMedia, type MediaRecord } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { MUSIC_MODELS, MUSIC_TEMPLATES, STRUCTURE_TAGS, type MusicModel, type MusicGenerationRequest } from '@/types'
import { DEFAULT_MODELS } from '@/models'
import { MusicCarousel, type MusicTask } from '@/components/music/MusicCarousel'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks'

type MusicFormData = {
  lyrics: string
  songTitle: string
  stylePrompt: string
  model: MusicModel
  optimizeLyrics: boolean
  parallelCount: number
  instrumental: boolean
  sampleRate: 16000 | 24000 | 32000 | 44100
  bitrate: 32000 | 64000 | 128000 | 256000
  format: 'mp3' | 'wav' | 'flac'
  seed: string
  coverMode: 'one-step' | 'two-step'
  referenceAudioUrl: string
  useOriginalLyrics: boolean
}

export default function MusicGeneration() {
  const { t } = useTranslation()
  const musicSettings = useSettingsStore(s => s.settings.generation.music)
  const validModel = MUSIC_MODELS.some(m => m.id === musicSettings.model)
  const defaultModel: MusicModel = validModel ? musicSettings.model as MusicModel : DEFAULT_MODELS.music

  const [formData, setFormData] = useFormPersistence<MusicFormData>({
    storageKey: DEBUG_FORM_KEYS.MUSIC_GENERATION,
    defaultValue: {
      lyrics: '',
      songTitle: '',
      stylePrompt: '',
      model: defaultModel,
      optimizeLyrics: musicSettings.optimizeLyrics,
      parallelCount: 1,
      instrumental: false,
      sampleRate: 44100,
      bitrate: 256000,
      format: 'mp3',
      seed: '',
      coverMode: 'one-step',
      referenceAudioUrl: '',
      useOriginalLyrics: true,
    },
  })

  const updateForm = useCallback((key: keyof MusicFormData, value: MusicFormData[keyof MusicFormData]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [setFormData])

  const { lyrics, songTitle, stylePrompt, model, optimizeLyrics, parallelCount, instrumental,
          sampleRate, bitrate, format, seed, coverMode, referenceAudioUrl, useOriginalLyrics } = formData

  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const [tasks, setTasks] = useState<MusicTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const advancedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (advancedRef.current && !advancedRef.current.contains(e.target as Node)) {
        setAdvancedOpen(false)
      }
    }
    if (advancedOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [advancedOpen])

  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  const [preprocessLoading, setPreprocessLoading] = useState(false)
  const [preprocessResult, setPreprocessResult] = useState<{ lyrics: string; audio_url: string } | null>(null)

  const blobUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url)
      })
      blobUrlsRef.current.clear()
    }
  }, [])

  const handleTemplateSelect = (templateId: string) => {
    const template = MUSIC_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      updateForm('stylePrompt', template.style)
    }
  }

  const insertTag = (tag: string) => {
    const textarea = document.getElementById('lyrics-editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newLyrics = lyrics.substring(0, start) + tag + '\n' + lyrics.substring(end)
      updateForm('lyrics', newLyrics)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + tag.length + 1, start + tag.length + 1)
      }, 0)
    }
  }

  const saveMusicToMedia = async (audioUrl: string, title?: string, index?: number): Promise<MediaRecord | null> => {
    try {
      let filename: string
      if (title && title.trim()) {
        const sanitizedTitle = title.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')
        if (index !== undefined) {
          filename = `${sanitizedTitle} (${index + 1}).mp3`
        } else {
          filename = `${sanitizedTitle}.mp3`
        }
      } else {
        filename = `music_${Date.now()}.mp3`
      }
      const result = await uploadMediaFromUrl(
        audioUrl,
        filename,
        'music',
        'music_generation'
      )
      if (result.success && result.data) {
        return result.data
      }
      return null
    } catch (error) {
      console.error('Failed to save music:', error)
      return null
    }
  }

  const updateTask = useCallback((index: number, updates: Partial<MusicTask>) => {
    setTasks(prev => {
      const newTasks = [...prev]
      newTasks[index] = { ...newTasks[index], ...updates }
      return newTasks
    })
  }, [])

  const instrumentalModels = ['music-2.6', 'music-2.5+']
  const isInstrumentalAvailable = instrumentalModels.includes(model)

  const seedModels = ['music-2.6']
  const isSeedAvailable = seedModels.includes(model)

  const optimizeLyricsModels = ['music-2.5', 'music-2.5+', 'music-2.6']
  const isOptimizeLyricsAvailable = optimizeLyricsModels.includes(model)

  const isCoverModel = model === 'music-cover'

  const buildRequest = useCallback((): MusicGenerationRequest => {
    const request: MusicGenerationRequest = {
      model,
      output_format: 'url',
    }

    if (isCoverModel) {
      request.reference_audio_url = referenceAudioUrl
      if (!useOriginalLyrics && lyrics.trim()) {
        request.lyrics = lyrics.trim()
      }
      if (stylePrompt.trim()) {
        request.prompt = stylePrompt.trim()
      }
    } else {
      if (lyrics.trim()) {
        request.lyrics = lyrics.trim()
      }
      if (stylePrompt.trim()) {
        request.prompt = stylePrompt.trim()
      }
    }

    request.audio_setting = {
      sample_rate: sampleRate,
      bitrate: bitrate,
      format: format,
    }

    if (optimizeLyrics && isOptimizeLyricsAvailable && !instrumental && !isCoverModel) {
      request.optimize_lyrics = true
    }

    if (isSeedAvailable && seed.trim()) {
      request.seed = parseInt(seed, 10)
    }

    return request
  }, [model, lyrics, stylePrompt, sampleRate, bitrate, format, optimizeLyrics, seed, instrumental, isCoverModel, referenceAudioUrl, useOriginalLyrics])

  const decodeAudioData = useCallback(async (audioData: string): Promise<string> => {
    const mimeType = format === 'mp3' ? 'audio/mp3' 
      : format === 'wav' ? 'audio/wav' 
      : 'audio/flac'
    
    let blob: Blob
    if (audioData.startsWith('http')) {
      blob = await fetch(audioData).then(r => r.blob())
    } else {
      const byteArray = new Uint8Array(audioData.length / 2)
      for (let i = 0; i < audioData.length; i += 2) {
        byteArray[i / 2] = parseInt(audioData.substring(i, i + 2), 16)
      }
      blob = new Blob([byteArray], { type: mimeType })
    }
    
    return URL.createObjectURL(blob)
  }, [format])

  const handleGenerate = async () => {
    if (isSubmitDisabled()) return

    setError(null)

    const newTasks: MusicTask[] = Array.from({ length: parallelCount }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      status: 'idle' as const,
      progress: 0,
      retryCount: 0,
    }))
    setTasks(newTasks)
    setCurrentIndex(0)

    const request = buildRequest()

    const promises = newTasks.map(async (_task, index) => {
      updateTask(index, { status: 'generating', progress: 25 })

      try {
        const response = await generateMusic(request)
        const audioData = response.data.audio
        if (!audioData) {
          throw new Error('No audio data in response')
        }

        updateTask(index, { progress: 60 })

        const url = await decodeAudioData(audioData)
        blobUrlsRef.current.add(url)
        
        const durationSec = Math.round((response.data.extra_info?.music_duration || 0) / 1000)

updateTask(index, {
          status: 'completed',
          progress: 100,
          audioUrl: url,
          audioDuration: durationSec,
        })

        saveMusicToMedia(
          audioData.startsWith('http') ? audioData : url,
          songTitle,
          parallelCount > 1 ? index : undefined
        ).then(mediaRecord => {
          if (mediaRecord) {
            updateTask(index, {
              mediaId: mediaRecord.id,
              mediaTitle: mediaRecord.original_name || mediaRecord.filename,
              isFavorite: mediaRecord.is_favorite ?? false,
              isPublic: mediaRecord.is_public ?? false,
            })
          }
        })

        addUsage('musicRequests', 1)
        addItem({
          type: 'music',
          input: isCoverModel ? referenceAudioUrl : lyrics.trim(),
          outputUrl: url,
          metadata: {
            model,
            stylePrompt,
            optimizeLyrics,
            duration: durationSec,
            instrumental,
            seed: seed ? parseInt(seed, 10) : undefined,
          },
        })

        return { success: true, index }
      } catch (err) {
        updateTask(index, {
          status: 'failed',
          progress: 100,
          error: err instanceof Error ? err.message : t('musicGeneration.musicGenFailed'),
        })
        return { success: false, index }
      }
    })

    await Promise.allSettled(promises)
  }

  const retryTask = async (index: number) => {
    const task = tasks[index]
    if (task.status !== 'failed') return

    updateTask(index, {
      status: 'generating',
      progress: 25,
      error: undefined,
      retryCount: task.retryCount + 1,
    })

    const request = buildRequest()

    try {
      const response = await generateMusic(request)
      const audioData = response.data.audio
      if (!audioData) {
        throw new Error('No audio data in response')
      }

      updateTask(index, { progress: 60 })

      const url = await decodeAudioData(audioData)
      blobUrlsRef.current.add(url)
      const durationSec = Math.round((response.data.extra_info?.music_duration || 0) / 1000)

      updateTask(index, {
        status: 'completed',
        progress: 100,
        audioUrl: url,
        audioDuration: durationSec,
      })

      saveMusicToMedia(
        audioData.startsWith('http') ? audioData : url,
        songTitle,
        tasks.length > 1 ? index : undefined
      ).then(mediaRecord => {
        if (mediaRecord) {
          updateTask(index, {
            mediaId: mediaRecord.id,
            mediaTitle: mediaRecord.original_name || mediaRecord.filename,
            isFavorite: mediaRecord.is_favorite ?? false,
            isPublic: mediaRecord.is_public ?? false,
          })
        }
      })
      addUsage('musicRequests', 1)
    } catch (err) {
      updateTask(index, {
        status: 'failed',
        progress: 100,
        error: err instanceof Error ? err.message : t('musicGeneration.musicGenFailed'),
      })
    }
  }

  const handleDownload = useCallback((audioUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = filename
    a.click()
  }, [])

  const handleDeleteMedia = useCallback(async (mediaId: string) => {
    try {
      await deleteMedia(mediaId)
      setTasks(prev => prev.map(task => 
        task.mediaId === mediaId 
          ? { ...task, mediaId: undefined, mediaTitle: undefined }
          : task
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }, [])

  const handleFavorite = useCallback(async (mediaId: string) => {
    try {
      const result = await toggleFavorite(mediaId)
      if (result.success) {
        setTasks(prev => prev.map(task =>
          task.mediaId === mediaId
            ? { ...task, isFavorite: result.data.isFavorite }
            : task
        ))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '收藏操作失败')
    }
  }, [])

  const handleTogglePublic = useCallback(async (mediaId: string, isPublic: boolean) => {
    try {
      const result = await togglePublic(mediaId, isPublic)
      if (result.success) {
        setTasks(prev => prev.map(task =>
          task.mediaId === mediaId
            ? { ...task, isPublic: result.data.is_public ?? isPublic }
            : task
        ))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '公开设置失败')
    }
  }, [])

  const clearAll = () => {
    blobUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url)
    })
    blobUrlsRef.current.clear()
    setTasks([])
    setCurrentIndex(0)
    updateForm('lyrics', '')
    updateForm('stylePrompt', '')
    setError(null)
  }

  const STYLE_PROMPT_MAX = 2000
  const LYRICS_MAX = 3500

  const isStylePromptOverLimit = stylePrompt.length > STYLE_PROMPT_MAX
  const isLyricsOverLimit = lyrics.length > LYRICS_MAX

  const handlePreprocess = async (file: File) => {
    setPreprocessLoading(true)
    setError(null)
    setPreprocessResult(null)

    try {
      const result = await preprocessMusic(file)
      setPreprocessResult(result)
      updateForm('lyrics', result.lyrics)
      updateForm('referenceAudioUrl', result.audio_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '预处理失败')
    } finally {
      setPreprocessLoading(false)
    }
  }

  const isSubmitDisabled = () => {
    if (tasks.some(t => t.status === 'generating')) return true
    if (isStylePromptOverLimit || isLyricsOverLimit) return true

    if (isCoverModel) {
      if (coverMode === 'one-step' && !referenceAudioUrl.trim()) return true
      if (coverMode === 'two-step' && !preprocessResult) return true
      return false
    }

    if (instrumental) {
      return !stylePrompt.trim()
    }

    return !lyrics.trim()
  }

  const isGenerating = tasks.some(t => t.status === 'generating')

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Music className="w-5 h-5" />}
        title="音乐生成"
        description="AI 音乐创作与生成"
        gradient="violet-purple"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTipsOpen(!tipsOpen)}
                className="h-8 w-8"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
              {tipsOpen && (
                <div className="absolute right-0 top-full mt-2 w-96 z-50 bg-card border border-border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center justify-between p-3 border-b border-border">
                    <span className="text-sm font-medium">{t('musicGeneration.creationTipsTitle')}</span>
                    <Button variant="ghost" size="icon" onClick={() => setTipsOpen(false)} className="h-6 w-6">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="p-3">
                    <ul className="text-xs text-muted-foreground space-y-2">
                      <li className="whitespace-normal">• {t('musicGeneration.tip1')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip2')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip3')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip4')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip5')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip6')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip7')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip8')}</li>
                      <li className="whitespace-normal">• {t('musicGeneration.tip9')}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={clearAll}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t('musicGeneration.clearBtn')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {(!instrumental || !isInstrumentalAvailable) && !isCoverModel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                  <Music2 className="w-5 h-5" />
                  <span className="text-base font-semibold">{t('musicGeneration.lyricsEditorTitle')}</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium shrink-0">歌曲标题</label>
                    <Input
                      value={songTitle}
                      onChange={(e) => updateForm('songTitle', e.target.value)}
                      placeholder="可选，用于命名生成的音乐文件"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {STRUCTURE_TAGS.map(tag => (
                      <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        onClick={() => insertTag(tag)}
                        className="h-7 px-2 text-xs shrink-0"
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                  <div className="relative">
                    <Textarea
                      id="lyrics-editor"
                      value={lyrics}
                      onChange={(e) => updateForm('lyrics', e.target.value)}
                      placeholder={t('musicGeneration.lyricsPlaceholder')}
                      className={cn(
                        "min-h-[300px] resize-none font-mono text-sm pb-6",
                        isLyricsOverLimit && "border-red-500"
                      )}
                    />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('musicGeneration.useTags')}</span>
                      <span className={cn(
                        isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {lyrics.length} / {LYRICS_MAX}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {!isCoverModel && (
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
                  <span className="text-base font-semibold">{instrumental ? '风格描述 *' : t('musicGeneration.styleDescription')}</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 relative">
                    <Select value="" onValueChange={handleTemplateSelect}>
                      <SelectTrigger className="w-[400px]">
                        <SelectValue placeholder="选择风格模板..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSIC_TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex items-center gap-2">
                              <span>{t.name}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">{t.style}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                      disabled={!stylePrompt.trim()}
                      title="保存为模板"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    {showSaveTemplate && (
                      <div className="absolute top-full mt-2 right-0 w-72 bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                        <div className="p-3 space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium">模板名称</label>
                            <Input
                              value={newTemplateName}
                              onChange={(e) => setNewTemplateName(e.target.value)}
                              placeholder="输入模板名称..."
                              className="h-8"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7"
                              onClick={() => {
                                setShowSaveTemplate(false)
                                setNewTemplateName('')
                              }}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="h-7"
                              disabled={!newTemplateName.trim()}
                              onClick={() => {
                                // TODO: 实现保存模板到 localStorage 或后端
                                console.log('Save template:', newTemplateName, stylePrompt)
                                setShowSaveTemplate(false)
                                setNewTemplateName('')
                              }}
                            >
                              保存
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Textarea
                      value={stylePrompt}
                      onChange={(e) => updateForm('stylePrompt', e.target.value)}
                      placeholder={instrumental
                        ? '纯音乐模式需填写风格描述，定义音乐风格和段落结构'
                        : t('musicGeneration.stylePlaceholder')
                      }
                      className={cn(
                        "min-h-[80px] resize-none pb-5",
                        isStylePromptOverLimit && "border-red-500"
                      )}
                    />
                    <div className={cn(
                      "absolute bottom-1.5 right-2 text-xs",
                      isStylePromptOverLimit ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {stylePrompt.length} / {STYLE_PROMPT_MAX}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
            className="relative group"
          >
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Settings2 className="w-5 h-5" />
                <span className="text-base font-semibold">{t('musicGeneration.paramsTitle')}</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex gap-6">
                  <div className="space-y-2 flex-1 pr-6 border-r border-border">
                    <label className="text-sm font-medium text-foreground">{t('musicGeneration.modelLabel')}</label>
                    <Select value={model} onValueChange={(v) => updateForm('model', v as MusicModel)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MUSIC_MODELS.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            <span>{m.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium text-foreground">并发生成数量</label>
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
                              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {(isInstrumentalAvailable || isOptimizeLyricsAvailable) && !isCoverModel && (
                  <div className="flex items-center justify-between gap-4">
                    {isInstrumentalAvailable && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="instrumental"
                          checked={instrumental}
                          onCheckedChange={(checked) => updateForm('instrumental', checked as boolean)}
                        />
                        <label htmlFor="instrumental" className="text-sm">
                          纯音乐模式
                        </label>
                      </div>
                    )}
                    {isOptimizeLyricsAvailable && !instrumental && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="optimize-lyrics"
                          checked={optimizeLyrics}
                          onCheckedChange={(checked) => updateForm('optimizeLyrics', checked as boolean)}
                        />
                        <label htmlFor="optimize-lyrics" className="text-sm">
                          AI歌词优化
                        </label>
                      </div>
                    )}
<div className="relative" ref={advancedRef}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        className="h-8 px-2.5 text-sm text-muted-foreground hover:text-foreground"
                      >
                        <Settings2 className="w-4 h-4 mr-1" />
                        高级设置
                      </Button>
                      {advancedOpen && (
                        <div className="absolute top-full mt-2 right-0 w-[360px] bg-card border border-border rounded-lg shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
                          <div className="p-3 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">采样率</label>
                              <Select
                                value={sampleRate.toString()}
                                onValueChange={(v) => updateForm('sampleRate', Number(v) as 16000 | 24000 | 32000 | 44100)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="16000">16000 Hz</SelectItem>
                                  <SelectItem value="24000">24000 Hz</SelectItem>
                                  <SelectItem value="32000">32000 Hz</SelectItem>
                                  <SelectItem value="44100">44100 Hz (推荐)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">比特率</label>
                              <Select
                                value={bitrate.toString()}
                                onValueChange={(v) => updateForm('bitrate', Number(v) as 32000 | 64000 | 128000 | 256000)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="32000">32 kbps</SelectItem>
                                  <SelectItem value="64000">64 kbps</SelectItem>
                                  <SelectItem value="128000">128 kbps</SelectItem>
                                  <SelectItem value="256000">256 kbps (推荐)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">格式</label>
                              <Select value={format} onValueChange={(v) => updateForm('format', v as 'mp3' | 'wav' | 'flac')}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mp3">MP3</SelectItem>
                                  <SelectItem value="wav">WAV</SelectItem>
                                  <SelectItem value="flac">FLAC</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">随机种子</label>
                              <Input
                                value={seed}
                                onChange={(e) => updateForm('seed', e.target.value)}
                                placeholder="留空则随机"
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isCoverModel && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Music className="w-5 h-5" />
                        翻唱设置
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Tabs value={coverMode} onValueChange={(v) => updateForm('coverMode', v as 'one-step' | 'two-step')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="one-step">一步模式</TabsTrigger>
                          <TabsTrigger value="two-step">两步模式</TabsTrigger>
                        </TabsList>

                        <TabsContent value="one-step" className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              参考音频 URL *
                            </label>
                            <Input
                              value={referenceAudioUrl}
                              onChange={(e) => updateForm('referenceAudioUrl', e.target.value)}
                              placeholder="https://example.com/song.mp3"
                              type="url"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              翻唱风格描述
                            </label>
                            <Textarea
                              value={stylePrompt}
                              onChange={(e) => updateForm('stylePrompt', e.target.value)}
                              placeholder="描述翻唱风格，如更悲伤、更激昂..."
                              className="min-h-[60px] resize-none"
                            />
                            <div className={cn(
                              "text-xs",
                              isStylePromptOverLimit ? "text-red-500" : "text-muted-foreground"
                            )}>
                              {stylePrompt.length} / {STYLE_PROMPT_MAX}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="use-original"
                              checked={useOriginalLyrics}
                              onCheckedChange={(checked) => updateForm('useOriginalLyrics', checked as boolean)}
                            />
                            <label htmlFor="use-original" className="text-sm">
                              使用原歌词（自动提取）
                            </label>
                          </div>

                          {!useOriginalLyrics && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                自定义歌词
                              </label>
                              <Textarea
                                value={lyrics}
                                onChange={(e) => updateForm('lyrics', e.target.value)}
                                placeholder="输入自定义翻唱歌词..."
                                className={cn(
                                  "min-h-[150px] resize-none font-mono text-sm",
                                  isLyricsOverLimit && "border-red-500"
                                )}
                              />
                              <div className={cn(
                                "text-xs",
                                isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {lyrics.length} / {LYRICS_MAX}
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="two-step" className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              上传参考音频
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept=".mp3,.wav,.flac"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handlePreprocess(file)
                                }}
                                className="flex-1"
                              />
                              {preprocessLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              支持 mp3/wav/flac 格式
                            </p>
                          </div>

                          {preprocessResult && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                提取的歌词（可修改）
                              </label>
                              <Textarea
                                value={lyrics}
                                onChange={(e) => updateForm('lyrics', e.target.value)}
                                defaultValue={preprocessResult.lyrics}
                                className={cn(
                                  "min-h-[150px] resize-none font-mono text-sm",
                                  isLyricsOverLimit && "border-red-500"
                                )}
                              />
                              <div className={cn(
                                "text-xs",
                                isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {lyrics.length} / {LYRICS_MAX}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              翻唱风格描述
                            </label>
                            <Textarea
                              value={stylePrompt}
                              onChange={(e) => updateForm('stylePrompt', e.target.value)}
                              placeholder="描述翻唱风格..."
                              className="min-h-[60px] resize-none"
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={isSubmitDisabled()}
                  className="w-full shadow-lg shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('musicGeneration.composing')}
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      {t('musicGeneration.generateMusic')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          <MusicCarousel
            tasks={tasks}
            currentIndex={currentIndex}
            onIndexChange={setCurrentIndex}
            onRetry={retryTask}
            onDownload={handleDownload}
            onDelete={handleDeleteMedia}
            onFavorite={handleFavorite}
            onTogglePublic={handleTogglePublic}
          />
        </div>
      </div>
    </div>
  )
}