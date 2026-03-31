import { useState, useRef } from 'react'
import { Volume2, Play, Download, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Slider } from '@/components/ui/Slider'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { createSyncVoice } from '@/lib/api/voice'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { SPEECH_MODELS, VOICE_OPTIONS, EMOTIONS, type SpeechModel, type Emotion } from '@/types'

const MAX_CHARS = 10000

export default function VoiceSync() {
  const [text, setText] = useState('')
  const [model, setModel] = useState<SpeechModel>('speech-2.6-hd')
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id)
  const [emotion, setEmotion] = useState<Emotion>('auto')
  const [speed, setSpeed] = useState(1.0)
  const [volume, setVolume] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS

  const handleGenerate = async () => {
    if (!text.trim() || isOverLimit) return

    setIsGenerating(true)
    setError(null)
    setAudioUrl(null)

    try {
      const response = await createSyncVoice({
        model,
        text: text.trim(),
        voice_setting: {
          voice_id: voiceId,
          speed,
          vol: volume,
          pitch,
          emotion,
        },
        audio_setting: {
          sample_rate: 24000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      })

      const hexData = response.data
      const byteArray = new Uint8Array(hexData.length / 2)
      for (let i = 0; i < hexData.length; i += 2) {
        byteArray[i / 2] = parseInt(hexData.substring(i, i + 2), 16)
      }
      const blob = new Blob([byteArray], { type: 'audio/mp3' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      addUsage('voiceCharacters', charCount)
      addItem({
        type: 'voice',
        input: text.trim(),
        outputUrl: url,
        metadata: {
          model,
          voiceId,
          emotion,
          speed,
          volume,
          pitch,
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
    a.download = `voice-${Date.now()}.mp3`
    a.click()
  }

  const selectedVoice = VOICE_OPTIONS.find(v => v.id === voiceId)
  const selectedModel = SPEECH_MODELS.find(m => m.id === model)
  const selectedEmotion = EMOTIONS.find(e => e.id === emotion)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">同步语音生成</h1>
          <p className="text-muted-foreground text-sm">
            实时生成语音，最大支持 {MAX_CHARS.toLocaleString()} 字符
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                文本输入
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="输入要转换为语音的文本..."
                className="min-h-[200px] resize-none"
              />
              <div className="flex items-center justify-between text-sm">
                <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} 字符
                </span>
                {isOverLimit && (
                  <Badge variant="destructive">超出限制</Badge>
                )}
              </div>
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
                  <Volume2 className="w-5 h-5" />
                  生成结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  controls
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    下载音频
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>参数设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>模型</Label>
                <Select value={model} onValueChange={(v) => setModel(v as SpeechModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPEECH_MODELS.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span>{m.name}</span>
                          <Badge variant={m.tier === 'latest' ? 'default' : 'secondary'}>
                            {m.tier === 'latest' ? '最新' : m.tier === 'recommended' ? '推荐' : m.tier === 'fast' ? '快速' : '稳定'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{m.description}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>音色</Label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map(voice => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex items-center gap-2">
                          <span>{voice.name}</span>
                          <Badge variant="outline">
                            {voice.gender === 'male' ? '男' : '女'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>情绪</Label>
                <Select value={emotion} onValueChange={(v) => setEmotion(v as Emotion)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="mr-2">{e.emoji}</span>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>语速</Label>
                    <span className="text-sm text-muted-foreground">{speed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[speed]}
                    onValueChange={(v) => setSpeed(v[0])}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>音量</Label>
                    <span className="text-sm text-muted-foreground">{Math.round(volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[volume]}
                    onValueChange={(v) => setVolume(v[0])}
                    min={0}
                    max={2.0}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>音调</Label>
                    <span className="text-sm text-muted-foreground">{pitch > 0 ? `+${pitch}` : pitch}</span>
                  </div>
                  <Slider
                    value={[pitch]}
                    onValueChange={(v) => setPitch(v[0])}
                    min={-10}
                    max={10}
                    step={1}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!text.trim() || isOverLimit || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    生成语音
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>当前配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">模型</span>
                  <span>{selectedModel?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">音色</span>
                  <span>{selectedVoice?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">情绪</span>
                  <span>{selectedEmotion?.emoji} {selectedEmotion?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">语速</span>
                  <span>{speed.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">音量</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">音调</span>
                  <span>{pitch}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
