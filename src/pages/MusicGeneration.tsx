import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Music, Download, Loader2, Wand2, RefreshCw, Lightbulb, Mic2, Music2, Upload, Link, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Switch } from '@/components/ui/Switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible'
import { cn } from '@/lib/utils'
import { generateMusic, preprocessMusic } from '@/lib/api/music'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { MUSIC_MODELS, MUSIC_TEMPLATES, STRUCTURE_TAGS, type MusicModel } from '@/types'

export default function MusicGeneration() {
  const { t } = useTranslation()
  const musicSettings = useSettingsStore(s => s.settings.generation.music)
  const [lyrics, setLyrics] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const [model, setModel] = useState<MusicModel>(musicSettings.model as MusicModel)
  const [optimizeLyrics, setOptimizeLyrics] = useState(musicSettings.optimizeLyrics)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  // 纯音乐模式
  const [instrumental, setInstrumental] = useState(false)

  // 高级设置
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [sampleRate, setSampleRate] = useState<44100 | 48000>(44100)
  const [bitrate, setBitrate] = useState<'128k' | '192k' | '256k' | '320k'>('256k')
  const [format, setFormat] = useState<'mp3' | 'wav' | 'flac'>('mp3')
  const [seed, setSeed] = useState<string>('')

  // 翻唱模式
  const [coverMode, setCoverMode] = useState<'one-step' | 'two-step'>('one-step')
  const [referenceAudioUrl, setReferenceAudioUrl] = useState('')
  const [useOriginalLyrics, setUseOriginalLyrics] = useState(true)
  const [preprocessLoading, setPreprocessLoading] = useState(false)
  const [preprocessResult, setPreprocessResult] = useState<{ lyrics: string; audio_url: string } | null>(null)

  const handleTemplateSelect = (templateId: string) => {
    const template = MUSIC_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setLyrics(template.lyrics)
      setStylePrompt(template.style)
    }
  }

  const insertTag = (tag: string) => {
    const textarea = document.getElementById('lyrics-editor') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newLyrics = lyrics.substring(0, start) + tag + '\n' + lyrics.substring(end)
      setLyrics(newLyrics)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + tag.length + 1, start + tag.length + 1)
      }, 0)
    }
  }

  const saveMusicToMedia = async (audioUrl: string): Promise<void> => {
    try {
      await uploadMediaFromUrl(
        audioUrl,
        `music_${Date.now()}.mp3`,
        'music',
        'music_generation'
      )
    } catch (error) {
      console.error('Failed to save music:', error)
    }
  }

  const handleGenerate = async () => {
    if (!lyrics.trim()) return

    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)

    try {
      const response = await generateMusic({
        model,
        lyrics: lyrics.trim(),
        style_prompt: stylePrompt.trim() || undefined,
        optimize_lyrics: optimizeLyrics,
      })

      const audioData = response.data.audio
      let finalAudioUrl: string
      let finalDuration: number

      if (audioData.startsWith('http')) {
        finalAudioUrl = audioData
        finalDuration = response.extra_info?.music_duration 
          ? Math.floor(response.extra_info.music_duration / 1000)
          : response.data.duration
        saveMusicToMedia(audioData)
      } else {
        const byteArray = new Uint8Array(audioData.length / 2)
        for (let i = 0; i < audioData.length; i += 2) {
          byteArray[i / 2] = parseInt(audioData.substring(i, i + 2), 16)
        }
        const blob = new Blob([byteArray], { type: 'audio/mp3' })
        finalAudioUrl = URL.createObjectURL(blob)
        finalDuration = response.data.duration
      }

      setAudioUrl(finalAudioUrl)
      setAudioDuration(finalDuration)

      addUsage('musicRequests', 1)
      addItem({
        type: 'music',
        input: lyrics.trim(),
        outputUrl: finalAudioUrl,
        metadata: {
          model,
          stylePrompt,
          optimizeLyrics,
          duration: finalDuration,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('musicGeneration.musicGenFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = `music-${Date.now()}.mp3`
    a.click()
  }

  const clearAll = () => {
    setLyrics('')
    setStylePrompt('')
    setAudioUrl(null)
    setAudioDuration(null)
    setError(null)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 字符限制常量
  const STYLE_PROMPT_MAX = 2000
  const LYRICS_MAX = 3500

  // 验证函数
  const isStylePromptOverLimit = stylePrompt.length > STYLE_PROMPT_MAX
  const isLyricsOverLimit = lyrics.length > LYRICS_MAX

  // 纯音乐模式可用模型
  const instrumentalModels = ['music-2.6', 'music-2.5+']
  const isInstrumentalAvailable = instrumentalModels.includes(model)

  // Seed 可用模型
  const seedModels = ['music-2.6']
  const isSeedAvailable = seedModels.includes(model)

  // AI 歌词优化可用模型（修正为 2.5/2.5+/2.6）
  const optimizeLyricsModels = ['music-2.5', 'music-2.5+', 'music-2.6']
  const isOptimizeLyricsAvailable = optimizeLyricsModels.includes(model)

  // 是否为翻唱模式
  const isCoverModel = model === 'music-cover'

  // 提交按钮禁用逻辑
  const isSubmitDisabled = () => {
    if (isGenerating) return true
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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Music className="w-5 h-5" />}
        title="音乐生成"
        description="AI 音乐创作与生成"
        gradient="violet-purple"
      />
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={clearAll}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t('musicGeneration.clearBtn')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="w-5 h-5" />
                {t('musicGeneration.lyricsEditorTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {STRUCTURE_TAGS.map(tag => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => insertTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <Textarea
                id="lyrics-editor"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={t('musicGeneration.lyricsPlaceholder')}
                className="min-h-[300px] resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t('musicGeneration.charCount', { count: lyrics.length })}</span>
                <span>{t('musicGeneration.useTags')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                {t('musicGeneration.musicTemplatesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {MUSIC_TEMPLATES.map(template => (
                  <Button
                    key={template.id}
                    variant="outline"
                    onClick={() => handleTemplateSelect(template.id)}
                    className="justify-start"
                  >
                    <Music className="w-4 h-4 mr-2" />
                    {template.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('musicGeneration.paramsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('musicGeneration.modelLabel')}</label>
                <Select value={model} onValueChange={(v) => setModel(v as MusicModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSIC_MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex flex-col">
                          <span>{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('musicGeneration.styleDescription')}</label>
                <Textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder={t('musicGeneration.stylePlaceholder')}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {model === 'music-2.5+' && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-foreground">{t('musicGeneration.aiOptimizeLabel')}</label>
                    <p className="text-xs text-muted-foreground">{t('musicGeneration.autoOptimizeLyrics')}</p>
                  </div>
                  <Switch
                    checked={optimizeLyrics}
                    onCheckedChange={setOptimizeLyrics}
                  />
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={!lyrics.trim() || isGenerating}
                className="w-full"
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
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic2 className="w-5 h-5" />
                  {t('musicGeneration.resultTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <audio
                  src={audioUrl}
                  controls
                  className="w-full"
                />
                {audioDuration && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {t('musicGeneration.duration', { duration: formatDuration(audioDuration) })}
                  </div>
                )}
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  {t('musicGeneration.downloadMusic')}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('musicGeneration.creationTipsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• {t('musicGeneration.tip1')}</li>
                <li>• {t('musicGeneration.tip2')}</li>
                <li>• {t('musicGeneration.tip3')}</li>
                <li>• {t('musicGeneration.tip4')}</li>
                <li>• {t('musicGeneration.tip5')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Clock(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
