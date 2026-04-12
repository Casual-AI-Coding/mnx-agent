import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { Image as LucideImage, Upload, Download, Sparkles, Loader2, X, RefreshCw, Wand2, Grid3x3, Zap, Settings2, Lightbulb, ArrowRight, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import WarningBanner from '@/components/shared/WarningBanner'
import { APIReference } from '@/components/shared/APIReference'
import { PageHeader } from '@/components/shared/PageHeader'
import { generateImage } from '@/lib/api/image'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useSettingsStore } from '@/settings/store'
import { IMAGE_MODELS, ASPECT_RATIOS, PROMPT_TEMPLATES, type ImageModel, type AspectRatio } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { services } from '@/themes/tokens'
import { type ImageTask, type ImageTaskStatus } from '@/components/image/ImageTaskCard'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

const imageVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

export default function ImageGeneration() {
  const { t } = useTranslation()
  const { settings } = useSettingsStore()
  const apiKey = settings.api.minimaxKey
  const imageSettings = useSettingsStore(s => s.settings.generation.image)
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<ImageModel>(imageSettings.model as ImageModel)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(imageSettings.aspectRatio as AspectRatio)
  const [numImages, setNumImages] = useState(imageSettings.numImages)
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [seed, setSeed] = useState<number | undefined>()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [tasks, setTasks] = useState<ImageTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [parallelCount, setParallelCount] = useState(1)
  const [imageTitle, setImageTitle] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addItem } = useHistoryStore()
  const { addUsage } = useUsageStore()

  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = PROMPT_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setPrompt(template.prompt)
      setActiveTemplate(templateId)
    }
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [])

  const removeReferenceImage = useCallback(() => {
    setReferenceImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const saveImageToMedia = async (imageUrl: string, title?: string, batchIndex?: number, imageIndex?: number): Promise<void> => {
    try {
      let filename: string
      if (title && title.trim()) {
        const sanitizedTitle = title.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')
        if (batchIndex !== undefined && imageIndex !== undefined) {
          filename = `${sanitizedTitle} (${batchIndex + 1}-${imageIndex + 1}).png`
        } else if (imageIndex !== undefined) {
          filename = `${sanitizedTitle} (${imageIndex + 1}).png`
        } else {
          filename = `${sanitizedTitle}.png`
        }
      } else {
        if (batchIndex !== undefined && imageIndex !== undefined) {
          filename = `image_${batchIndex + 1}-${imageIndex + 1}.png`
        } else if (imageIndex !== undefined) {
          filename = `image_${imageIndex + 1}.png`
        } else {
          filename = `image_${Date.now()}.png`
        }
      }
      await uploadMediaFromUrl(
        imageUrl,
        filename,
        'image',
        'image_generation'
      )
    } catch (error) {
      console.error('Failed to save image:', error)
    }
  }

  const updateTask = useCallback((index: number, updates: Partial<ImageTask>) => {
    setTasks(prev => {
      const newTasks = [...prev]
      newTasks[index] = { ...newTasks[index], ...updates }
      return newTasks
    })
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setError(null)

    if (parallelCount === 1) {
      setIsGenerating(true)
      setGeneratedImages([])

      try {
        const response = await generateImage({
          model,
          prompt: prompt.trim(),
          n: numImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
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

        if (urls.length > 0) {
          for (const [urlIndex, url] of urls.entries()) {
            await saveImageToMedia(url, imageTitle, undefined, urlIndex)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '生成失败')
      } finally {
        setIsGenerating(false)
      }
    } else {
      setIsGenerating(true)
      const requestParams = {
        model,
        prompt: prompt.trim(),
        n: numImages as number,
        aspect_ratio: aspectRatio,
        seed,
      }
      const newTasks: ImageTask[] = Array.from({ length: parallelCount }, (_, i) => ({
        id: `${Date.now()}-${i}`,
        status: 'idle' as const,
        progress: 0,
        retryCount: 0,
        requestParams,
      }))
      setTasks(newTasks)
      setCurrentIndex(0)

      const promises = newTasks.map(async (task, index) => {
        updateTask(index, { status: 'generating', progress: 25 })

        try {
          const response = await generateImage({
            model,
            prompt: prompt.trim(),
            n: numImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
            aspect_ratio: aspectRatio,
            seed,
          })

          const urls = response.data.map(d => d.url || '')
          updateTask(index, {
            status: 'completed',
            progress: 100,
            imageUrls: urls,
          })

          for (const [urlIndex, url] of urls.entries()) {
            await saveImageToMedia(url, imageTitle, index, urlIndex)
          }
          addUsage('imageRequests', numImages)
          addItem({
            type: 'image',
            input: prompt.trim(),
            outputUrl: urls[0],
            metadata: {
              model,
              aspectRatio,
              seed,
              index: index + 1,
              total: parallelCount,
              parallel: true,
              batchSize: numImages,
            },
          })

          return { success: true, index }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '生成失败'
          const errorData = err as { status_code?: number; status_msg?: string; raw?: unknown }
          updateTask(index, {
            status: 'failed',
            progress: 100,
            error: errorMsg,
            responseError: {
              status_code: errorData.status_code,
              status_msg: errorData.status_msg || errorMsg,
              raw: errorData.raw,
            },
          })
          return { success: false, index }
        }
      })

      await Promise.allSettled(promises)
      setIsGenerating(false)
    }
  }

  const retryTask = useCallback(async (index: number) => {
    const task = tasks[index]
    if (!task || task.status !== 'failed') return

    updateTask(index, { status: 'generating', progress: 25, error: undefined })

    try {
      const response = await generateImage({
        model,
        prompt: prompt.trim(),
        n: numImages as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        aspect_ratio: aspectRatio,
        seed,
      })

      const urls = response.data.map(d => d.url || '')
      updateTask(index, {
        status: 'completed',
        progress: 100,
        imageUrls: urls,
      })

      for (const [urlIndex, url] of urls.entries()) {
        await saveImageToMedia(url, imageTitle, index, urlIndex)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '生成失败'
      const errorData = err as { status_code?: number; status_msg?: string; raw?: unknown }
      updateTask(index, {
        status: 'failed',
        progress: 100,
        error: errorMsg,
        retryCount: task.retryCount + 1,
        responseError: {
          status_code: errorData.status_code,
          status_msg: errorData.status_msg || errorMsg,
          raw: errorData.raw,
        },
      })
    }
  }, [tasks, model, prompt, numImages, aspectRatio, seed, imageTitle, updateTask])

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleImagePreview = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
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

  const getGridCols = () => {
    if (generatedImages.length === 1) return 'grid-cols-1'
    if (generatedImages.length === 2) return 'grid-cols-2'
    return 'grid-cols-2'
  }

  const getGridColsForBatch = (count: number) => {
    if (count === 1) return 'grid-cols-1'
    if (count === 2) return 'grid-cols-2'
    return 'grid-cols-2'
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader
        icon={<LucideImage className="w-5 h-5" />}
        title="图像生成"
        description="AI 图像生成与编辑"
        gradient="rose-pink"
      />

      {!apiKey && (
        <motion.div variants={itemVariants}>
          <WarningBanner message="请先在右上角配置 API Key，否则无法使用图片生成功能。" />
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Controls */}
        <motion.div variants={itemVariants} className="xl:col-span-5 space-y-4">
          {/* Prompt Input Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Zap className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-medium text-foreground">{t('imageGeneration.prompt') || '提示词'}</span>
              </div>
              <div className="p-4 space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('imageGeneration.placeholder') || "描述你想要生成的图片，例如：一只戴着墨镜的猫在海滩上..."}
                  className="min-h-[120px] resize-none bg-background/50 border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                />
                
                {/* Template Buttons */}
                <div className="flex flex-wrap gap-2">
                  {PROMPT_TEMPLATES.slice(0, 6).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        activeTemplate === template.id
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25'
                          : 'bg-secondary/50 text-muted-foreground/70 hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>

                {/* 标题输入 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">图片标题（可选，用于保存文件命名）</label>
                  <Input
                    value={imageTitle}
                    onChange={(e) => setImageTitle(e.target.value)}
                    placeholder="输入标题名称..."
                    className="bg-background/50 border-border"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Reference Image Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-secondary-foreground" />
                  <span className="text-sm font-medium text-foreground">{t('imageGeneration.reference') || '参考图片'}</span>
                </div>
                <span className="text-xs text-muted-foreground">可选</span>
              </div>
              <div className="p-4">
                {referenceImage ? (
                  <div className="relative group/image">
                    <img
                      src={referenceImage}
                      alt="Reference"
                      className="w-full max-h-48 object-contain rounded-lg border border-border/50"
                    />
                    <button
                      onClick={removeReferenceImage}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/80 text-muted-foreground/70 hover:text-destructive hover:bg-card transition-colors opacity-0 group-hover/image:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group/upload"
                  >
                    <div className="relative mx-auto w-12 h-12 mb-3">
                      <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover/upload:blur-2xl transition-all" />
                      <Upload className="w-12 h-12 relative text-muted-foreground/50 group-hover/upload:text-accent-foreground transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/70 group-hover/upload:text-foreground transition-colors">
                      {t('imageGeneration.clickToUpload') || '点击上传参考图片'}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">JPG, PNG</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Parameters Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-secondary-foreground" />
                  <span className="text-sm font-medium text-foreground">{t('imageGeneration.settings') || '参数设置'}</span>
                </div>
              </div>
              <div className="p-4 space-y-5">
                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.model') || '模型'}</label>
                  <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
                    <SelectTrigger className="w-full bg-background/50 border-border text-foreground hover:border-primary/50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {IMAGE_MODELS.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-foreground focus:bg-secondary">
                          <div className="flex flex-col">
                            <span>{m.name}</span>
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.aspectRatio') || '宽高比'}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {ASPECT_RATIOS.slice(0, 4).map(ratio => (
                      <button
                        key={ratio.id}
                        onClick={() => setAspectRatio(ratio.id)}
                        className={`flex flex-col items-center justify-center py-2.5 rounded-lg transition-all duration-200 border ${
                          aspectRatio === ratio.id
                            ? 'bg-gradient-to-br from-primary/80 to-accent/80 border-primary/50 text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-background/50 border-border text-muted-foreground/70 hover:border-border hover:text-foreground'
                        }`}
                      >
                        <span className="text-lg leading-none mb-1">{ratio.icon}</span>
                        <span className="text-xs font-medium">{ratio.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Images */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.count') || '生成数量'}</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <button
                        key={n}
                        onClick={() => setNumImages(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          numImages === n
                            ? 'bg-gradient-to-r from-primary to-accent border-primary/50 text-primary-foreground shadow-lg shadow-primary/20'
                            : 'bg-background/50 border-border text-muted-foreground/70 hover:border-border hover:text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 并发生成数量 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">并发生成数量</label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          if (!isGenerating) {
                            setParallelCount(n)
                            if (tasks.length > 0) {
                              setTasks([])
                              setCurrentIndex(0)
                            }
                          }
                        }}
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
                  <p className="text-xs text-muted-foreground">
                    并发模式时每个请求生成1张图片，共 {parallelCount} 张
                  </p>
                </div>

                {/* Advanced Settings Toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  {t('imageGeneration.advanced') || '高级设置'}
                </button>

                {/* Seed Input */}
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.seed') || '随机种子'}</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={seed || ''}
                          onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder={t('imageGeneration.seedPlaceholder') || '留空则随机'}
                          className="flex-1 bg-background/50 border-border text-foreground focus:border-primary/50"
                        />
                        <button
                          onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                          className="px-3 py-2 rounded-lg bg-secondary text-muted-foreground/70 hover:text-foreground hover:bg-secondary/80 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground/50">{t('imageGeneration.seedTip') || '使用相同的种子可重现相似结果'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={`w-full relative group overflow-hidden rounded-xl transition-all duration-300 ${
              prompt.trim() && !isGenerating
                ? 'hover:shadow-2xl hover:shadow-primary/30'
                : 'cursor-not-allowed'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-300 ${
              prompt.trim() && !isGenerating ? 'group-hover:scale-105' : ''
            }`} />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-400/20 via-accent/20 to-secondary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2 py-4 text-primary-foreground font-semibold">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('imageGeneration.generating') || '生成中...'}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>{t('imageGeneration.generate') || '生成图片'}</span>
                  <ArrowRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Column - Results */}
        <motion.div variants={itemVariants} className="xl:col-span-7">
          <div className="relative h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-accent/20 via-primary/10 to-secondary/20 rounded-2xl blur opacity-50" />
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl h-full min-h-[500px] overflow-hidden">
              {/* Results Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 text-accent-foreground" />
                  <span className="text-sm font-medium text-foreground">{t('imageGeneration.results') || '生成结果'}</span>
                </div>
                {tasks.length > 0 ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                      disabled={currentIndex === 0}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        currentIndex === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1.5">
                      {tasks.map((task, idx) => (
                        <button
                          key={task.id}
                          onClick={() => setCurrentIndex(idx)}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all",
                            idx === currentIndex && task.status === 'generating' && "ring-[3px] ring-blue-500 bg-blue-500/20 text-blue-500 font-bold",
                            idx === currentIndex && task.status === 'completed' && "ring-[3px] ring-green-500 bg-green-500/20 text-green-600 font-bold",
                            idx === currentIndex && task.status === 'failed' && "ring-[3px] ring-red-500 bg-red-500/20 text-red-600 font-bold",
                            idx === currentIndex && task.status === 'idle' && "ring-[3px] ring-muted-foreground bg-muted text-muted-foreground font-bold",
                            idx !== currentIndex && task.status === 'idle' && "bg-muted text-muted-foreground font-medium",
                            idx !== currentIndex && task.status === 'generating' && "bg-blue-500/20 text-blue-500 animate-pulse font-medium",
                            idx !== currentIndex && task.status === 'completed' && "bg-green-500/20 text-green-600 font-medium",
                            idx !== currentIndex && task.status === 'failed' && "bg-red-500/20 text-red-600 font-medium"
                          )}
                        >
                          {task.status === 'generating' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : task.status === 'failed' ? (
                            <X className="w-3 h-3" />
                          ) : (
                            idx + 1
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentIndex(Math.min(tasks.length - 1, currentIndex + 1))}
                      disabled={currentIndex === tasks.length - 1}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        currentIndex === tasks.length - 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-muted"
                      )}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : generatedImages.length > 0 && (
                  <span className="text-xs text-muted-foreground">{generatedImages.length} 张图片</span>
                )}
              </div>

              {/* Results Content */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {tasks.length > 0 && tasks[currentIndex]?.status === 'generating' ? (
                    <motion.div
                      key={`loading-${currentIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-secondary/30 blur-3xl rounded-full animate-pulse" />
                        <div className="relative w-20 h-20">
                          <div className="absolute inset-0 border-2 border-accent/30 rounded-full animate-ping" />
                          <div className="absolute inset-2 border-2 border-primary/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                          <div className="absolute inset-4 border-2 border-secondary/50 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
                          <Loader2 className="absolute inset-0 w-full h-full text-accent-foreground animate-spin" />
                        </div>
                      </div>
                      <p className="mt-8 text-lg font-medium text-foreground">{t('imageGeneration.creating') || '正在创造...'}</p>
                      <p className="text-sm text-muted-foreground mt-2">Batch {currentIndex + 1} 正在生成...</p>
                    </motion.div>
                  ) : tasks.length > 0 && tasks[currentIndex]?.status === 'failed' ? (
                    <motion.div
                      key={`failed-${currentIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20"
                    >
                      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                        <X className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="text-lg font-medium text-destructive">Batch {currentIndex + 1} 生成失败</p>
                      <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30 max-w-md">
                        <p className="text-sm text-destructive/80 font-medium mb-2">错误信息：</p>
                        <p className="text-sm text-destructive">{tasks[currentIndex]?.error || '未知错误'}</p>
                      </div>
                      {tasks[currentIndex]?.requestParams && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50 max-w-lg w-full">
                          <p className="text-sm text-muted-foreground font-medium mb-3">请求参数：</p>
                          <div className="space-y-1 text-xs">
                            <p><span className="text-muted-foreground">model:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.model}</span></p>
                            <p><span className="text-muted-foreground">prompt:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.prompt.slice(0, 50)}{tasks[currentIndex].requestParams!.prompt.length > 50 ? '...' : ''}</span></p>
                            <p><span className="text-muted-foreground">n:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.n}</span></p>
                            <p><span className="text-muted-foreground">aspect_ratio:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.aspect_ratio}</span></p>
                            {tasks[currentIndex].requestParams!.seed && <p><span className="text-muted-foreground">seed:</span> <span className="text-foreground">{tasks[currentIndex].requestParams!.seed}</span></p>}
                          </div>
                        </div>
                      )}
                      {tasks[currentIndex]?.responseError && (
                        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 max-w-lg w-full">
                          <p className="text-sm text-red-500/80 font-medium mb-3">响应错误：</p>
                          <div className="space-y-1 text-xs">
                            {tasks[currentIndex].responseError!.status_code && (
                              <p><span className="text-red-500/70">status_code:</span> <span className="text-red-600">{tasks[currentIndex].responseError!.status_code}</span></p>
                            )}
                            {tasks[currentIndex].responseError!.status_msg && (
                              <p><span className="text-red-500/70">status_msg:</span> <span className="text-red-600">{tasks[currentIndex].responseError!.status_msg}</span></p>
                            )}
                            {tasks[currentIndex].responseError!.raw && (
                              <p className="text-xs text-red-500/60 mt-2">
                                <span className="font-medium">raw:</span> {JSON.stringify(tasks[currentIndex].responseError!.raw).slice(0, 100)}...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {tasks[currentIndex]?.retryCount >= 3 && (
                        <p className="mt-4 text-xs text-muted-foreground">已多次重试失败，建议检查参数或稍后再试</p>
                      )}
                      <button
                        onClick={() => retryTask(currentIndex)}
                        disabled={tasks[currentIndex]?.retryCount >= 3}
                        className={cn(
                          "mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                          tasks[currentIndex]?.retryCount >= 3
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        <RefreshCw className="w-4 h-4 mr-2 inline" />
                        重试生成
                      </button>
                    </motion.div>
                  ) : tasks.length > 0 && tasks[currentIndex]?.imageUrls ? (
                    <motion.div
                      key={`batch-${currentIndex}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`grid ${getGridColsForBatch(tasks[currentIndex].imageUrls.length)} gap-4`}
                    >
                      {tasks[currentIndex].imageUrls.map((url, index) => (
                        <motion.div
                          key={url}
                          variants={imageVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: index * 0.1 }}
                          className="relative group"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-secondary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
                          <div
                            className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50 cursor-pointer"
                            onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                          >
                            <img
                              src={url}
                              alt={`Generated ${index + 1}`}
                              className={`w-full ${getAspectRatioClass()} object-cover`}
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); setLightboxOpen(true); }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"
                                >
                                  <ZoomIn className="w-4 h-4" />
                                  预览
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation()
                                    handleDownload(url, imageTitle.trim() 
                                      ? `${imageTitle.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')} (${currentIndex + 1}-${index + 1}).png`
                                      : `image_${currentIndex + 1}-${index + 1}.png`)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  下载
                                </button>
                              </div>
                            </div>
                            {/* Image Number Badge */}
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-muted-foreground/70 border border-border/50">
                              {index + 1} / {tasks[currentIndex]?.imageUrls?.length ?? 0}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : generatedImages.length > 0 && parallelCount === 1 ? (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`grid ${getGridCols()} gap-4`}
                    >
                      {generatedImages.map((url, index) => (
                        <motion.div
                          key={url}
                          variants={imageVariants}
                          initial="hidden"
                          animate="visible"
                          transition={{ delay: index * 0.1 }}
                          className="relative group"
                        >
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/20 to-secondary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
                          <div
                            className="relative overflow-hidden rounded-xl border border-border/50 bg-background/50 cursor-pointer"
                            onClick={() => handleImagePreview(index)}
                          >
                            <img
                              src={url}
                              alt={`Generated ${index + 1}`}
                              className={`w-full ${getAspectRatioClass()} object-cover`}
                            />
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleImagePreview(index); }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"
                                >
                                  <ZoomIn className="w-4 h-4" />
                                  预览
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation()
                                    handleDownload(url, imageTitle.trim() 
                                      ? `${imageTitle.trim().replace(/[^\w\u4e00-\u9fa5\-]/g, '_')} (${index + 1}).png`
                                      : `image_${index + 1}.png`)
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground text-sm font-medium transition-colors backdrop-blur-sm"
                                >
                                  <Download className="w-4 h-4" />
                                  下载
                                </button>
                              </div>
                            </div>
                            {/* Image Number Badge */}
                            <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-muted-foreground/70 border border-border/50">
                              {index + 1} / {generatedImages.length}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-accent/10 blur-3xl rounded-full" />
                        <LucideImage className="w-16 h-16 relative text-muted-foreground/50" />
                      </div>
                      <p className="mt-6 text-lg font-medium text-muted-foreground/70">
                        {t('imageGeneration.ready') || '准备生成'}
                      </p>
                      <p className="text-sm text-muted-foreground/50 mt-2 max-w-sm text-center">
                        {t('imageGeneration.emptyTip') || '在左侧输入提示词并点击生成按钮，AI将为你创造精美图片'}
                      </p>
                      
                      {/* Tips Section */}
                      <div className="mt-8 flex flex-wrap gap-2 justify-center">
                        {['添加细节', '指定风格', '描述光线', '设置场景'].map((tip) => (
                          <span key={tip} className="px-3 py-1 rounded-full bg-secondary/50 text-xs text-muted-foreground border border-border">
                            <Lightbulb className="w-3 h-3 inline mr-1" />
                            {tip}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 并发结果轮播区 */}
      {/* API Reference */}
      <motion.div variants={itemVariants}>
        <APIReference
          endpoint="/v1/image_generation"
          method="POST"
          body={{
            model,
            prompt: prompt || '<YOUR_PROMPT>',
            response_format: 'url',
            n: numImages,
            prompt_optimizer: false,
            aspect_ratio: aspectRatio,
          }}
        />
      </motion.div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={
          tasks.length > 0 && tasks[currentIndex]?.imageUrls
            ? tasks[currentIndex].imageUrls.map(url => ({ src: url }))
            : generatedImages.map(url => ({ src: url }))
        }
      />
    </motion.div>
  )
}
