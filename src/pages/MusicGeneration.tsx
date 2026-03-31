import { useState } from 'react'
import { Music, Download, Loader2, Wand2, RefreshCw, Lightbulb, Mic2, Music2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { generateMusic } from '@/lib/api/music'
import { createMedia } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { MUSIC_MODELS, MUSIC_TEMPLATES, STRUCTURE_TAGS, type MusicModel } from '@/types'

export default function MusicGeneration() {
  const [lyrics, setLyrics] = useState('')
  const [stylePrompt, setStylePrompt] = useState('')
  const [model, setModel] = useState<MusicModel>('music-2.5')
  const [optimizeLyrics, setOptimizeLyrics] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

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
      const response = await fetch(audioUrl)
      const blob = await response.blob()

      await createMedia({
        filename: `music_${Date.now()}.mp3`,
        filepath: `/media/music_${Date.now()}.mp3`,
        type: 'music',
        mime_type: blob.type || 'audio/mpeg',
        size_bytes: blob.size,
        source: 'music_generation',
      })

      console.log('Music saved to media')
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
      const byteArray = new Uint8Array(audioData.length / 2)
      for (let i = 0; i < audioData.length; i += 2) {
        byteArray[i / 2] = parseInt(audioData.substring(i, i + 2), 16)
      }
      const blob = new Blob([byteArray], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setAudioDuration(response.data.duration)
      saveMusicToMedia(url)

      addUsage('musicRequests', 1)
      addItem({
        type: 'music',
        input: lyrics.trim(),
        outputUrl: url,
        metadata: {
          model,
          stylePrompt,
          optimizeLyrics,
          duration: response.data.duration,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">音乐生成</h1>
          <p className="text-muted-foreground text-sm">
            输入歌词和风格描述，AI 为你创作专属音乐
          </p>
        </div>
        <Button variant="outline" onClick={clearAll}>
          <RefreshCw className="w-4 h-4 mr-2" />
          清空
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music2 className="w-5 h-5" />
                歌词编辑器
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
                placeholder={`[Verse]\n输入歌词内容...\n\n[Chorus]\n副歌部分...`}
                className="min-h-[300px] resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{lyrics.length} 字符</span>
                <span>使用上方标签组织歌曲结构</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                音乐模板
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
              <CardTitle>参数设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">模型</label>
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
                <label className="text-sm font-medium">风格描述</label>
                <Textarea
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  placeholder="描述你想要的音乐风格，如：流行音乐, 励志, 青春..."
                  className="min-h-[80px] resize-none"
                />
              </div>

              {model === 'music-2.5+' && (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">AI 歌词优化</label>
                    <p className="text-xs text-muted-foreground">自动优化歌词以匹配音乐风格</p>
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
                    创作中...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成音乐
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
                  生成结果
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
                    时长: {formatDuration(audioDuration)}
                  </div>
                )}
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  下载音乐
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>创作提示</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 使用结构标签组织歌曲段落</li>
                <li>• [Verse] 主歌，[Chorus] 副歌</li>
                <li>• [Intro]/[Outro] 用于开头结尾</li>
                <li>• 风格描述帮助 AI 理解音乐氛围</li>
                <li>• music-2.5+ 支持歌词优化功能</li>
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
