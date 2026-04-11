import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Music, Download, Loader2, Wand2, RefreshCw, Lightbulb, Mic2, Music2, Upload, Link, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PageHeader } from '@/components/shared/PageHeader'
import { Switch } from '@/components/ui/Switch'
import { Checkbox } from '@/components/ui/Checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/Collapsible'
import { cn } from '@/lib/utils'
import { generateMusic, preprocessMusic } from '@/lib/api/music'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { MUSIC_MODELS, MUSIC_TEMPLATES, STRUCTURE_TAGS, type MusicModel, type MusicGenerationRequest } from '@/types'
import { DEFAULT_MODELS } from '@/models'

export default function MusicGeneration() {
  const { t } = useTranslation()
  const musicSettings = useSettingsStore(s => s.settings.generation.music)
  const [lyrics, setLyrics] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const validModel = MUSIC_MODELS.some(m => m.id === musicSettings.model)
  const [model, setModel] = useState<MusicModel>(validModel ? musicSettings.model as MusicModel : DEFAULT_MODELS.music)
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
  const [sampleRate, setSampleRate] = useState<16000 | 24000 | 32000 | 44100>(44100)
  const [bitrate, setBitrate] = useState<32000 | 64000 | 128000 | 256000>(256000)
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
    if (isSubmitDisabled()) return

    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)

    try {
      const request: MusicGenerationRequest = {
        model,
        output_format: 'url',
      }

      // 翻唱模式
      if (isCoverModel) {
        request.reference_audio_url = referenceAudioUrl
        if (!useOriginalLyrics && lyrics.trim()) {
          request.lyrics = lyrics.trim()
        }
        if (stylePrompt.trim()) {
          request.style_prompt = stylePrompt.trim()
        }
      } else {
        // 普通模式 / 纯音乐模式
        if (lyrics.trim()) {
          request.lyrics = lyrics.trim()
        }
        if (stylePrompt.trim()) {
          request.prompt = stylePrompt.trim()
        }
      }

      // 高级设置
      request.audio_setting = {
        sample_rate: sampleRate,
        bitrate: bitrate,
        format: format,
      }

      // AI 歌词优化
      if (optimizeLyrics && isOptimizeLyricsAvailable && !instrumental && !isCoverModel) {
        request.optimize_lyrics = true
      }

      // Seed (仅 music-2.6)
      if (isSeedAvailable && seed.trim()) {
        request.seed = parseInt(seed, 10)
      }

      const response = await generateMusic(request)

      const audioData = response.data.audio
      const mimeType = format === 'mp3' ? 'audio/mp3' 
        : format === 'wav' ? 'audio/wav' 
        : 'audio/flac'
      
      let blob: Blob
      if (audioData.startsWith('http')) {
        // URL 格式：直接使用
        blob = await fetch(audioData).then(r => r.blob())
      } else {
        // hex 格式：解码
        const byteArray = new Uint8Array(audioData.length / 2)
        for (let i = 0; i < audioData.length; i += 2) {
          byteArray[i / 2] = parseInt(audioData.substring(i, i + 2), 16)
        }
        blob = new Blob([byteArray], { type: mimeType })
      }
      
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      
      // Use extra_info for duration if available
      const duration = response.extra_info?.music_duration || response.data.duration
      setAudioDuration(duration)
      
      saveMusicToMedia(audioData.startsWith('http') ? audioData : url)

      addUsage('musicRequests', 1)
      addItem({
        type: 'music',
        input: isCoverModel ? referenceAudioUrl : lyrics.trim(),
        outputUrl: url,
        metadata: {
          model,
          stylePrompt,
          optimizeLyrics,
          duration,
          instrumental,
          seed: seed ? parseInt(seed, 10) : undefined,
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

  const isCoverModel = model === 'music-cover'

  const handlePreprocess = async (file: File) => {
    setPreprocessLoading(true)
    setError(null)
    setPreprocessResult(null)

    try {
      const result = await preprocessMusic(file)
      setPreprocessResult(result)
      setLyrics(result.lyrics)
      setReferenceAudioUrl(result.audio_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '预处理失败')
    } finally {
      setPreprocessLoading(false)
    }
  }

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
          {(!instrumental || !isInstrumentalAvailable) && !isCoverModel && (
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
                  className={cn(
                    "min-h-[300px] resize-none font-mono text-sm",
                    isLyricsOverLimit && "border-red-500"
                  )}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className={cn(
                    isLyricsOverLimit ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {lyrics.length} / {LYRICS_MAX}
                  </span>
                  <span className="text-muted-foreground">{t('musicGeneration.useTags')}</span>
                </div>
              </CardContent>
            </Card>
          )}

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
                {isInstrumentalAvailable && (
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="instrumental"
                      checked={instrumental}
                      onCheckedChange={(checked) => setInstrumental(checked as boolean)}
                    />
                    <label
                      htmlFor="instrumental"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      纯音乐模式（无歌词）
                    </label>
                  </div>
                )}
              </div>

              {isCoverModel && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      翻唱设置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Tabs value={coverMode} onValueChange={(v) => setCoverMode(v as 'one-step' | 'two-step')}>
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
                            onChange={(e) => setReferenceAudioUrl(e.target.value)}
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
                            onChange={(e) => setStylePrompt(e.target.value)}
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
                            onCheckedChange={(checked) => setUseOriginalLyrics(checked as boolean)}
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
                              onChange={(e) => setLyrics(e.target.value)}
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
                              onChange={(e) => setLyrics(e.target.value)}
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
                            onChange={(e) => setStylePrompt(e.target.value)}
                            placeholder="描述翻唱风格..."
                            className="min-h-[60px] resize-none"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {instrumental ? '风格描述 *' : t('musicGeneration.styleDescription')}
                </label>
                <Textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder={instrumental
                    ? '纯音乐模式需填写风格描述，定义音乐风格和段落结构'
                    : t('musicGeneration.stylePlaceholder')
                  }
                  className={cn(
                    "min-h-[80px] resize-none",
                    isStylePromptOverLimit && "border-red-500"
                  )}
                />
                <div className={cn(
                  "text-xs",
                  isStylePromptOverLimit ? "text-red-500" : "text-muted-foreground"
                )}>
                  {stylePrompt.length} / {STYLE_PROMPT_MAX}
                </div>
              </div>

              {isOptimizeLyricsAvailable && !isCoverModel && !instrumental && (
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

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <CollapsibleTrigger icon={<Settings2 className="w-4 h-4" />}>
                  高级设置
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        采样率
                      </label>
                      <Select
                        value={sampleRate.toString()}
                        onValueChange={(v) => setSampleRate(Number(v) as 16000 | 24000 | 32000 | 44100)}
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
                      <label className="text-xs font-medium text-muted-foreground">
                        比特率
                      </label>
                      <Select
                        value={bitrate.toString()}
                        onValueChange={(v) => setBitrate(Number(v) as 32000 | 64000 | 128000 | 256000)}
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
                      <label className="text-xs font-medium text-muted-foreground">
                        输出格式
                      </label>
                      <Select
                        value={format}
                        onValueChange={(v) => setFormat(v as 'mp3' | 'wav' | 'flac')}
                      >
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
                      <label className="text-xs font-medium text-muted-foreground">
                        Seed {isSeedAvailable ? '' : '(仅 music-2.6)'}
                      </label>
                      <Input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="留空则随机"
                        disabled={!isSeedAvailable}
                        className="h-8"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button
                onClick={handleGenerate}
                disabled={isSubmitDisabled()}
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
