import { useState, useRef } from 'react'
import { Image as ImageIcon, Upload, Download, Sparkles, Loader2, X, RefreshCw, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { generateImage } from '@/lib/api/image'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { IMAGE_MODELS, ASPECT_RATIOS, PROMPT_TEMPLATES, type ImageModel, type AspectRatio } from '@/types'

export default function ImageGeneration() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<ImageModel>('image-01')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [numImages, setNumImages] = useState(1)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [seed, setSeed] = useState<number | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const handleTemplateSelect = (templateId: string) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setPrompt(template.prompt)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeReferenceImage = () => {
    setReferenceImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setGeneratedImages([])

    try {
      const response = await generateImage({
        model,
        prompt: prompt.trim(),
        n: numImages as 1 | 2 | 3 | 4,
        aspect_ratio: aspectRatio,
        seed,
      })

      const urls = response.data.map(d => d.url || '')
      setGeneratedImages(urls)

      addUsage('imageRequests', numImages)
      urls.forEach((url, index) => {
        addItem({
          type: 'image',
          input: prompt.trim(),
          outputUrl: url,
          metadata: {
            model,
            aspectRatio,
            seed,
            index: index + 1,
            total: urls.length,
          },
        })
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `image-${Date.now()}-${index + 1}.png`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square'
      case '16:9':
      case '21:9':
        return 'aspect-video'
      case '4:3':
      case '3:2':
        return 'aspect-[4/3]'
      case '2:3':
      case '3:4':
      case '9:16':
        return 'aspect-[3/4]'
      default:
        return 'aspect-square'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">图片生成</h1>
          <p className="text-muted-foreground text-sm">
            使用 AI 根据文本描述或参考图片生成高质量图片
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                提示词
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要生成的图片..."
                className="min-h-[120px] resize-none"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">提示词模板:</span>
                <div className="flex gap-2">
                  {PROMPT_TEMPLATES.map(template => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTemplateSelect(template.id)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>参考图片（可选）</CardTitle>
            </CardHeader>
            <CardContent>
              {referenceImage ? (
                <div className="relative">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-full max-h-48 object-contain rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeReferenceImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">点击上传参考图片</p>
                  <p className="text-xs text-muted-foreground">支持 JPG、PNG 格式</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive">
              <CardContent className="p-4 text-destructive">
                {error}
              </CardContent>
            </Card>
          )}

          {generatedImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  生成结果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid gap-4 ${generatedImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {generatedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Generated ${index + 1}`}
                        className={`w-full ${getAspectRatioClass()} object-cover rounded-lg border`}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="secondary"
                          onClick={() => handleDownload(url, index)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          下载
                        </Button>
                      </div>
                      <Badge className="absolute top-2 left-2">
                        {index + 1}/{generatedImages.length}
                      </Badge>
                    </div>
                  ))}
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
                <label className="text-sm font-medium">模型</label>
                <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_MODELS.map(m => (
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
                <label className="text-sm font-medium">宽高比</label>
                <div className="grid grid-cols-4 gap-2">
                  {ASPECT_RATIOS.map(ratio => (
                    <Button
                      key={ratio.id}
                      variant={aspectRatio === ratio.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAspectRatio(ratio.id)}
                      className="flex flex-col items-center py-2"
                    >
                      <span className="text-lg">{ratio.icon}</span>
                      <span className="text-xs">{ratio.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">生成数量</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <Button
                      key={n}
                      variant={numImages === n ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNumImages(n)}
                      className="flex-1"
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">随机种子（可选）</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={seed || ''}
                    onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="留空则随机"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
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
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成图片
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>使用提示</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• 详细描述你想要的场景、风格、光线等</li>
                <li>• 可以使用提示词模板快速开始</li>
                <li>• 设置随机种子可重现相同结果</li>
                <li>• 上传参考图片可实现风格迁移</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
