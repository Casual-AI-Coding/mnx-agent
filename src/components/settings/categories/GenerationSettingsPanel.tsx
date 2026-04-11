import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Slider } from '@/components/ui/Slider'
import { useSettingsStore } from '@/settings/store'
import { Sparkles } from 'lucide-react'
import { TEXT_MODELS, SPEECH_MODELS, EMOTIONS, IMAGE_MODELS, ASPECT_RATIOS, MUSIC_MODELS, VIDEO_MODELS } from '@/models'

const videoQualityOptions = [
  { value: 'standard', label: '标准' },
  { value: 'high', label: '高清' },
]

interface FieldRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

function FieldRow({ label, description, children }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="w-48">{children}</div>
    </div>
  )
}

function TextSettings() {
  const settings = useSettingsStore(s => s.settings.generation.text)
  const setCategory = useSettingsStore(s => s.setCategory)
  
  const update = (key: string, value: unknown) => {
    setCategory('generation', { text: { ...settings, [key]: value } })
  }

  return (
    <div className="space-y-4">
      <FieldRow label="模型" description="文本生成模型">
        <Select value={settings.model} onValueChange={(v: string) => update('model', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TEXT_MODELS.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="温度" description="随机性 (0-2)">
        <div className="flex items-center gap-2">
          <Slider value={[settings.temperature]} onValueChange={(v: number[]) => update('temperature', v[0])} min={0} max={2} step={0.1} className="w-32" />
          <span className="w-8 text-sm">{settings.temperature}</span>
        </div>
      </FieldRow>
      <FieldRow label="Top P" description="核采样 (0-1)">
        <div className="flex items-center gap-2">
          <Slider value={[settings.topP]} onValueChange={(v: number[]) => update('topP', v[0])} min={0} max={1} step={0.05} className="w-32" />
          <span className="w-8 text-sm">{settings.topP}</span>
        </div>
      </FieldRow>
      <FieldRow label="最大 Token" description="输出长度">
        <Input type="number" value={settings.maxTokens} onChange={(e) => update('maxTokens', parseInt(e.target.value) || 2048)} className="w-full" />
      </FieldRow>
      <FieldRow label="提示缓存" description="加速生成">
        <Switch checked={settings.promptCaching} onCheckedChange={(v: boolean) => update('promptCaching', v)} />
      </FieldRow>
      <FieldRow label="流式输出" description="实时输出">
        <Switch checked={settings.streamOutput} onCheckedChange={(v: boolean) => update('streamOutput', v)} />
      </FieldRow>
    </div>
  )
}

function VoiceSettings() {
  const settings = useSettingsStore(s => s.settings.generation.voice)
  const setCategory = useSettingsStore(s => s.setCategory)
  
  const update = (key: string, value: unknown) => {
    setCategory('generation', { voice: { ...settings, [key]: value } })
  }

  return (
    <div className="space-y-4">
      <FieldRow label="模型" description="语音合成模型">
        <Select value={settings.model} onValueChange={(v: string) => update('model', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SPEECH_MODELS.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="音色 ID" description="发音人">
        <Input value={settings.voiceId} onChange={(e) => update('voiceId', e.target.value)} className="w-full" />
      </FieldRow>
      <FieldRow label="情感" description="语音情感">
        <Select value={settings.emotion} onValueChange={(v: string) => update('emotion', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EMOTIONS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="语速" description="速度 (0.5-2)">
        <div className="flex items-center gap-2">
          <Slider value={[settings.speed]} onValueChange={(v: number[]) => update('speed', v[0])} min={0.5} max={2} step={0.1} className="w-32" />
          <span className="w-8 text-sm">{settings.speed}</span>
        </div>
      </FieldRow>
      <FieldRow label="音调" description="音调 (-10 到 10)">
        <div className="flex items-center gap-2">
          <Slider value={[settings.pitch]} onValueChange={(v: number[]) => update('pitch', v[0])} min={-10} max={10} step={1} className="w-32" />
          <span className="w-8 text-sm">{settings.pitch}</span>
        </div>
      </FieldRow>
      <FieldRow label="音量" description="音量 (0-2)">
        <div className="flex items-center gap-2">
          <Slider value={[settings.volume]} onValueChange={(v: number[]) => update('volume', v[0])} min={0} max={2} step={0.1} className="w-32" />
          <span className="w-8 text-sm">{settings.volume}</span>
        </div>
      </FieldRow>
    </div>
  )
}

function ImageSettings() {
  const settings = useSettingsStore(s => s.settings.generation.image)
  const setCategory = useSettingsStore(s => s.setCategory)
  
  const update = (key: string, value: unknown) => {
    setCategory('generation', { image: { ...settings, [key]: value } })
  }

  return (
    <div className="space-y-4">
      <FieldRow label="模型" description="图像生成模型">
        <Select value={settings.model} onValueChange={(v: string) => update('model', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {IMAGE_MODELS.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="宽高比" description="图像比例">
        <Select value={settings.aspectRatio} onValueChange={(v: string) => update('aspectRatio', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASPECT_RATIOS.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="生成数量" description="图片数量 (1-4)">
        <Input type="number" value={settings.numImages} onChange={(e) => update('numImages', parseInt(e.target.value) || 1)} min={1} max={4} className="w-full" />
      </FieldRow>
      <FieldRow label="提示优化" description="优化提示词">
        <Switch checked={settings.promptOptimizer} onCheckedChange={(v: boolean) => update('promptOptimizer', v)} />
      </FieldRow>
      <FieldRow label="风格" description="图像风格">
        <Input value={settings.style} onChange={(e) => update('style', e.target.value)} placeholder="可选" className="w-full" />
      </FieldRow>
    </div>
  )
}

function MusicSettings() {
  const settings = useSettingsStore(s => s.settings.generation.music)
  const setCategory = useSettingsStore(s => s.setCategory)
  
  const update = (key: string, value: unknown) => {
    setCategory('generation', { music: { ...settings, [key]: value } })
  }

  return (
    <div className="space-y-4">
      <FieldRow label="模型" description="音乐生成模型">
        <Select value={settings.model} onValueChange={(v: string) => update('model', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MUSIC_MODELS.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="歌词优化" description="优化歌词">
        <Switch checked={settings.optimizeLyrics} onCheckedChange={(v: boolean) => update('optimizeLyrics', v)} />
      </FieldRow>
      <FieldRow label="时长" description="时长（秒）">
        <Input type="number" value={settings.duration} onChange={(e) => update('duration', parseInt(e.target.value) || 30)} min={5} max={300} className="w-full" />
      </FieldRow>
    </div>
  )
}

function VideoSettings() {
  const settings = useSettingsStore(s => s.settings.generation.video)
  const setCategory = useSettingsStore(s => s.setCategory)
  
  const update = (key: string, value: unknown) => {
    setCategory('generation', { video: { ...settings, [key]: value } })
  }

  return (
    <div className="space-y-4">
      <FieldRow label="模型" description="视频生成模型">
        <Select value={settings.model} onValueChange={(v: string) => update('model', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {VIDEO_MODELS.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="质量" description="视频质量">
        <Select value={settings.quality} onValueChange={(v: string) => update('quality', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {videoQualityOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="时长" description="时长（秒）">
        <Input type="number" value={settings.duration} onChange={(e) => update('duration', parseInt(e.target.value) || 5)} min={3} max={10} className="w-full" />
      </FieldRow>
    </div>
  )
}

export function GenerationSettingsPanel() {
  const [activeTab, setActiveTab] = useState('text')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>生成设置</CardTitle>
          </div>
          <CardDescription>配置 AI 生成内容的默认参数</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="text">文本</TabsTrigger>
              <TabsTrigger value="voice">语音</TabsTrigger>
              <TabsTrigger value="image">图像</TabsTrigger>
              <TabsTrigger value="music">音乐</TabsTrigger>
              <TabsTrigger value="video">视频</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-6"><TextSettings /></TabsContent>
            <TabsContent value="voice" className="mt-6"><VoiceSettings /></TabsContent>
            <TabsContent value="image" className="mt-6"><ImageSettings /></TabsContent>
            <TabsContent value="music" className="mt-6"><MusicSettings /></TabsContent>
            <TabsContent value="video" className="mt-6"><VideoSettings /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}