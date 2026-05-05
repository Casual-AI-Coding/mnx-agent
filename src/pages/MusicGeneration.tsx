import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Music } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { generateMusic, preprocessMusic } from '@/lib/api/music'
import { uploadMediaFromUrl, toggleFavorite, togglePublic, deleteMedia, type MediaRecord } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { WorkbenchActions } from '@/components/shared/WorkbenchActions'
import { MUSIC_MODELS, MUSIC_TEMPLATES, STRUCTURE_TAGS, type MusicModel, type MusicGenerationRequest } from '@/types'
import { DEFAULT_MODELS } from '@/models'
import { MusicCarousel, type MusicTask } from '@/components/music/MusicCarousel'
import { useFormPersistence, DEBUG_FORM_KEYS } from '@/hooks'
import { LyricsEditorCard } from './music-generation/LyricsEditorCard.js'
import { StylePromptCard } from './music-generation/StylePromptCard.js'
import { MusicSettingsCard } from './music-generation/MusicSettingsCard.js'

type MusicFormData = {
  lyrics: string; songTitle: string; stylePrompt: string; model: MusicModel; optimizeLyrics: boolean; parallelCount: number; instrumental: boolean
  sampleRate: 16000 | 24000 | 32000 | 44100; bitrate: 32000 | 64000 | 128000 | 256000; format: 'mp3' | 'wav' | 'flac'; seed: string; outputFormat: 'url' | 'hex'
  coverMode: 'one-step' | 'two-step'; referenceAudioUrl: string; useOriginalLyrics: boolean
}

const STYLE_PROMPT_MAX = 2000
const LYRICS_MAX = 3500

export default function MusicGeneration() {
  const { t } = useTranslation()
  const musicSettings = useSettingsStore(s => s.settings.generation.music)
  const validModel = MUSIC_MODELS.some(m => m.id === musicSettings.model)
  const defaultValue: MusicFormData = {
    lyrics: '', songTitle: '', stylePrompt: '', model: validModel ? musicSettings.model as MusicModel : DEFAULT_MODELS.music,
    optimizeLyrics: musicSettings.optimizeLyrics, parallelCount: 1, instrumental: false, sampleRate: 44100, bitrate: 256000, format: 'mp3', seed: '', outputFormat: 'url', coverMode: 'one-step', referenceAudioUrl: '', useOriginalLyrics: true,
  }
  const [formData, setFormData] = useFormPersistence<MusicFormData>({ storageKey: DEBUG_FORM_KEYS.MUSIC_GENERATION, defaultValue })
  const updateForm = useCallback(<K extends keyof MusicFormData>(key: K, value: MusicFormData[K]) => setFormData(prev => ({ ...prev, [key]: value })), [setFormData])
  const { lyrics, songTitle, stylePrompt, model, optimizeLyrics, parallelCount, instrumental, sampleRate, bitrate, format, seed, outputFormat, coverMode, referenceAudioUrl, useOriginalLyrics } = formData
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<MusicTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [preprocessLoading, setPreprocessLoading] = useState(false)
  const [preprocessResult, setPreprocessResult] = useState<{ lyrics: string; audio_url: string } | null>(null)
  const advancedRef = useRef<HTMLDivElement>(null)
  const blobUrlsRef = useRef<Set<string>>(new Set())
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()
  const isInstrumentalAvailable = ['music-2.6', 'music-2.5+'].includes(model)
  const isSeedAvailable = ['music-2.6'].includes(model)
  const isOptimizeLyricsAvailable = ['music-2.5', 'music-2.5+', 'music-2.6'].includes(model)
  const isCoverModel = model === 'music-cover'
  const isStylePromptOverLimit = stylePrompt.length > STYLE_PROMPT_MAX
  const isLyricsOverLimit = lyrics.length > LYRICS_MAX
  const isGenerating = tasks.some(task => task.status === 'generating')

  useEffect(() => () => { blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); blobUrlsRef.current.clear() }, [])
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const isPortalContent = target instanceof Element && (target.closest('[role="listbox"]') || target.closest('.bg-popover'))
      if (!isPortalContent && advancedOpen && advancedRef.current && !advancedRef.current.contains(target)) setAdvancedOpen(false)
    }
    if (advancedOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [advancedOpen])

  const updateTask = useCallback((index: number, updates: Partial<MusicTask>) => setTasks(prev => prev.map((task, i) => i === index ? { ...task, ...updates } : task)), [])
  const saveMusicToMedia = useCallback(async (audioUrl: string, title?: string, index?: number): Promise<MediaRecord | null> => {
    try {
      const filename = title?.trim() ? `${title.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')}${index !== undefined ? ` (${index + 1})` : ''}.mp3` : `music_${Date.now()}.mp3`
      const result = await uploadMediaFromUrl(audioUrl, filename, 'music', 'music_generation', { source_url: audioUrl, saved_at: new Date().toISOString() })
      return result.success && result.data ? result.data : null
    } catch (saveError) {
      console.error('Failed to save music:', saveError)
      return null
    }
  }, [])
  const buildRequest = useCallback((): MusicGenerationRequest => {
    const request: MusicGenerationRequest = { model, output_format: outputFormat, audio_setting: { sample_rate: sampleRate, bitrate, format } }
    if (isCoverModel) {
      request.reference_audio_url = referenceAudioUrl
      if (!useOriginalLyrics && lyrics.trim()) request.lyrics = lyrics.trim()
      if (stylePrompt.trim()) request.prompt = stylePrompt.trim()
    } else {
      if (lyrics.trim()) request.lyrics = lyrics.trim()
      if (stylePrompt.trim()) request.prompt = stylePrompt.trim()
      if (optimizeLyrics && isOptimizeLyricsAvailable && !instrumental) request.optimize_lyrics = true
    }
    if (isSeedAvailable && seed.trim()) request.seed = parseInt(seed, 10)
    return request
  }, [model, outputFormat, sampleRate, bitrate, format, isCoverModel, referenceAudioUrl, useOriginalLyrics, lyrics, stylePrompt, optimizeLyrics, isOptimizeLyricsAvailable, instrumental, isSeedAvailable, seed])
  const generateApiCurl = useCallback(() => {
    const body: Record<string, unknown> = { model, output_format: outputFormat, audio_setting: { sample_rate: sampleRate, bitrate, format } }
    if (isCoverModel) {
      if (referenceAudioUrl.trim()) body.reference_audio_url = referenceAudioUrl.trim()
      if (!useOriginalLyrics && lyrics.trim()) body.lyrics = lyrics.trim()
      if (stylePrompt.trim()) body.prompt = stylePrompt.trim()
    } else {
      if (lyrics.trim()) body.lyrics = lyrics.trim()
      if (stylePrompt.trim()) body.prompt = stylePrompt.trim()
      if (instrumental) body.instrumental = true
      if (optimizeLyrics && isOptimizeLyricsAvailable) body.optimize_lyrics = true
      if (isSeedAvailable && seed.trim()) body.seed = parseInt(seed, 10)
    }
    return `curl --request POST \\
  --url 'https://api.minimaxi.com/v1/music_generation' \\
  --header 'Authorization: Bearer YOUR_API_KEY' \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify(body, null, 2)}'`
  }, [model, outputFormat, sampleRate, bitrate, format, isCoverModel, referenceAudioUrl, useOriginalLyrics, lyrics, stylePrompt, instrumental, optimizeLyrics, isOptimizeLyricsAvailable, isSeedAvailable, seed])
  const decodeAudioData = useCallback(async (audioData: string) => {
    const mimeType = format === 'mp3' ? 'audio/mp3' : format === 'wav' ? 'audio/wav' : 'audio/flac'
    const blob = audioData.startsWith('http') ? await fetch(audioData).then(r => r.blob()) : new Blob([new Uint8Array(audioData.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) ?? [])], { type: mimeType })
    return URL.createObjectURL(blob)
  }, [format])
  const persistMediaTask = useCallback((index: number, sourceUrl: string, count: number) => {
    saveMusicToMedia(sourceUrl, songTitle, count > 1 ? index : undefined).then(mediaRecord => {
      if (mediaRecord) updateTask(index, { mediaId: mediaRecord.id, mediaTitle: mediaRecord.original_name || mediaRecord.filename, isFavorite: mediaRecord.is_favorite ?? false, isPublic: mediaRecord.is_public ?? false })
    })
  }, [saveMusicToMedia, songTitle, updateTask])
  const runGeneration = useCallback(async (index: number, request: MusicGenerationRequest, retryCount: number, addHistory: boolean, taskCount: number) => {
    updateTask(index, { status: 'generating', progress: 25, error: undefined, retryCount })
    try {
      const response = await generateMusic(request)
      const audioData = response.data.audio
      if (!audioData) throw new Error('No audio data in response')
      updateTask(index, { progress: 60 })
      const url = await decodeAudioData(audioData)
      blobUrlsRef.current.add(url)
      const durationSec = Math.round((response.data.extra_info?.music_duration || 0) / 1000)
      updateTask(index, { status: 'completed', progress: 100, audioUrl: url, audioDuration: durationSec })
      persistMediaTask(index, audioData.startsWith('http') ? audioData : url, taskCount)
      addUsage('musicRequests', 1)
      if (addHistory) addItem({ type: 'music', input: isCoverModel ? referenceAudioUrl : lyrics.trim(), outputUrl: url, metadata: { model, stylePrompt, optimizeLyrics, duration: durationSec, instrumental, seed: seed ? parseInt(seed, 10) : undefined } })
    } catch (runError) {
      updateTask(index, { status: 'failed', progress: 100, error: runError instanceof Error ? runError.message : t('musicGeneration.musicGenFailed') })
    }
  }, [updateTask, decodeAudioData, persistMediaTask, addUsage, addItem, isCoverModel, referenceAudioUrl, lyrics, model, stylePrompt, optimizeLyrics, instrumental, seed, t])
  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = MUSIC_TEMPLATES.find(item => item.id === templateId)
    if (template) updateForm('stylePrompt', template.style)
  }, [updateForm])
  const insertTag = useCallback((tag: string) => {
    const textarea = document.getElementById('lyrics-editor') as HTMLTextAreaElement | null
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    updateForm('lyrics', lyrics.substring(0, start) + tag + '\n' + lyrics.substring(end))
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + tag.length + 1, start + tag.length + 1) }, 0)
  }, [lyrics, updateForm])
  const isSubmitDisabled = useCallback(() => isGenerating || isStylePromptOverLimit || isLyricsOverLimit || (isCoverModel ? (coverMode === 'one-step' ? !referenceAudioUrl.trim() : !preprocessResult) : instrumental ? !stylePrompt.trim() : !lyrics.trim()), [isGenerating, isStylePromptOverLimit, isLyricsOverLimit, isCoverModel, coverMode, referenceAudioUrl, preprocessResult, instrumental, stylePrompt, lyrics])
  const handleGenerate = useCallback(async () => {
    if (isSubmitDisabled()) return
    setError(null)
    const newTasks = Array.from({ length: parallelCount }, (_, i): MusicTask => ({ id: `${Date.now()}-${i}`, status: 'idle', progress: 0, retryCount: 0 }))
    setTasks(newTasks)
    setCurrentIndex(0)
    const request = buildRequest()
    await Promise.allSettled(newTasks.map((_, index) => runGeneration(index, request, 0, true, parallelCount)))
  }, [isSubmitDisabled, parallelCount, buildRequest, runGeneration])
  const retryTask = useCallback(async (index: number) => {
    const task = tasks[index]
    if (task?.status !== 'failed') return
    await runGeneration(index, buildRequest(), task.retryCount + 1, false, tasks.length)
  }, [tasks, runGeneration, buildRequest])
  const clearAll = useCallback(() => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); blobUrlsRef.current.clear(); setTasks([]); setCurrentIndex(0); setFormData(defaultValue); setError(null)
  }, [defaultValue, setFormData])
  const handlePreprocess = useCallback(async (file: File) => {
    setPreprocessLoading(true); setError(null); setPreprocessResult(null)
    try {
      const result = await preprocessMusic(file)
      setPreprocessResult(result)
      updateForm('lyrics', result.lyrics)
      updateForm('referenceAudioUrl', result.audio_url)
    } catch (preprocessError) {
      setError(preprocessError instanceof Error ? preprocessError.message : '预处理失败')
    } finally { setPreprocessLoading(false) }
  }, [updateForm])
  const handleDownload = useCallback((audioUrl: string, filename: string) => { const a = document.createElement('a'); a.href = audioUrl; a.download = filename; a.click() }, [])
  const handleDeleteMedia = useCallback(async (mediaId: string) => { await deleteMedia(mediaId); setTasks(prev => prev.map(task => task.mediaId === mediaId ? { ...task, mediaId: undefined, mediaTitle: undefined, isFavorite: undefined, isPublic: undefined, isDeleted: true } : task)) }, [])
  const handleFavorite = useCallback(async (mediaId: string) => { const result = await toggleFavorite(mediaId); if (result.success) setTasks(prev => prev.map(task => task.mediaId === mediaId ? { ...task, isFavorite: result.data.isFavorite } : task)) }, [])
  const handleTogglePublic = useCallback(async (mediaId: string, isPublic: boolean) => { const result = await togglePublic(mediaId, isPublic); if (result.success) setTasks(prev => prev.map(task => task.mediaId === mediaId ? { ...task, isPublic: result.data.is_public ?? isPublic } : task)) }, [])
  const resetTemplateSave = useCallback(() => { setShowSaveTemplate(false); setNewTemplateName('') }, [])
  const confirmSaveTemplate = useCallback(() => { console.log('Save template:', newTemplateName, stylePrompt); resetTemplateSave() }, [newTemplateName, stylePrompt, resetTemplateSave])

  return (
    <div className="space-y-6">
      <PageHeader icon={<Music className="w-5 h-5" />} title="音乐生成" description="AI 音乐创作与生成" gradient="violet-purple" actions={<WorkbenchActions helpTitle={t('musicGeneration.creationTipsTitle')} helpTips={<ul className="text-xs text-muted-foreground space-y-2">{Array.from({ length: 9 }, (_, i) => <li key={i} className="whitespace-normal">• {t(`musicGeneration.tip${i + 1}`)}</li>)}</ul>} generateCurl={generateApiCurl} onClear={clearAll} clearLabel={t('musicGeneration.clearBtn')} />} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {(!instrumental || !isInstrumentalAvailable) && !isCoverModel && <LyricsEditorCard title={t('musicGeneration.lyricsEditorTitle')} songTitle={songTitle} lyrics={lyrics} lyricsPlaceholder={t('musicGeneration.lyricsPlaceholder')} useTagsLabel={t('musicGeneration.useTags')} songTitlePlaceholder="可选，用于命名生成的音乐文件" structureTags={STRUCTURE_TAGS} lyricsMax={LYRICS_MAX} isLyricsOverLimit={isLyricsOverLimit} onSongTitleChange={value => updateForm('songTitle', value)} onLyricsChange={value => updateForm('lyrics', value)} onInsertTag={insertTag} />}
          {!isCoverModel && <StylePromptCard title={instrumental ? '风格描述 *' : t('musicGeneration.styleDescription')} stylePrompt={stylePrompt} stylePromptMax={STYLE_PROMPT_MAX} isStylePromptOverLimit={isStylePromptOverLimit} showSaveTemplate={showSaveTemplate} newTemplateName={newTemplateName} templates={MUSIC_TEMPLATES} placeholder={instrumental ? '纯音乐模式需填写风格描述，定义音乐风格和段落结构' : t('musicGeneration.stylePlaceholder')} saveTemplateTitle="保存为模板" saveTemplateLabel="模板名称" saveTemplatePlaceholder="输入模板名称..." cancelLabel="取消" confirmLabel="保存" templateSelectPlaceholder="选择风格模板..." onTemplateSelect={handleTemplateSelect} onToggleSaveTemplate={() => setShowSaveTemplate(prev => !prev)} onNewTemplateNameChange={setNewTemplateName} onStylePromptChange={value => updateForm('stylePrompt', value)} onCancelSaveTemplate={resetTemplateSave} onConfirmSaveTemplate={confirmSaveTemplate} />}
        </div>
        <div className="space-y-4">
          <MusicSettingsCard model={model} parallelCount={parallelCount} instrumental={instrumental} optimizeLyrics={optimizeLyrics} isGenerating={isGenerating} isInstrumentalAvailable={isInstrumentalAvailable} isOptimizeLyricsAvailable={isOptimizeLyricsAvailable} isCoverModel={isCoverModel} advancedOpen={advancedOpen} advancedRef={advancedRef} sampleRate={sampleRate} bitrate={bitrate} format={format} outputFormat={outputFormat} seed={seed} coverMode={coverMode} referenceAudioUrl={referenceAudioUrl} stylePrompt={stylePrompt} lyrics={lyrics} useOriginalLyrics={useOriginalLyrics} preprocessLoading={preprocessLoading} preprocessResult={preprocessResult} stylePromptMax={STYLE_PROMPT_MAX} lyricsMax={LYRICS_MAX} isStylePromptOverLimit={isStylePromptOverLimit} isLyricsOverLimit={isLyricsOverLimit} generateLabel={t('musicGeneration.generateMusic')} composingLabel={t('musicGeneration.composing')} paramsTitle={t('musicGeneration.paramsTitle')} modelLabel={t('musicGeneration.modelLabel')} onUpdateModel={value => updateForm('model', value)} onUpdateParallelCount={value => updateForm('parallelCount', value)} onUpdateInstrumental={value => updateForm('instrumental', value)} onUpdateOptimizeLyrics={value => updateForm('optimizeLyrics', value)} onToggleAdvanced={() => setAdvancedOpen(prev => !prev)} onUpdateSampleRate={value => updateForm('sampleRate', value)} onUpdateBitrate={value => updateForm('bitrate', value)} onUpdateFormat={value => updateForm('format', value)} onUpdateOutputFormat={value => updateForm('outputFormat', value)} onUpdateSeed={value => updateForm('seed', value)} onGenerate={handleGenerate} isSubmitDisabled={isSubmitDisabled()} onUpdateCoverMode={value => updateForm('coverMode', value)} onUpdateReferenceAudioUrl={value => updateForm('referenceAudioUrl', value)} onUpdateStylePrompt={value => updateForm('stylePrompt', value)} onUpdateUseOriginalLyrics={value => updateForm('useOriginalLyrics', value)} onUpdateLyrics={value => updateForm('lyrics', value)} onPreprocessFileChange={handlePreprocess} />
          {error && <Card className="border-destructive"><CardContent className="p-4 text-destructive">{error}</CardContent></Card>}
          <MusicCarousel tasks={tasks} currentIndex={currentIndex} onIndexChange={setCurrentIndex} onRetry={retryTask} onDownload={handleDownload} onDelete={handleDeleteMedia} onFavorite={handleFavorite} onTogglePublic={handleTogglePublic} />
        </div>
      </div>
    </div>
  )
}
