import { useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Image as ImageIcon, Upload, Download, Sparkles, Loader2, X, RefreshCw, Wand2, Grid3x3, Zap, Settings2, Lightbulb, ArrowRight, ZoomIn } from 'lucide-react'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import WarningBanner from '@/components/shared/WarningBanner'
import { APIReference } from '@/components/shared/APIReference'
import { generateImage } from '@/lib/api/image'
import { uploadMediaFromUrl } from '@/lib/api/media'
import { useHistoryStore } from '@/stores/history'
import { useUsageStore } from '@/stores/usage'
import { useAppStore } from '@/stores/app'
import { useSettingsStore } from '@/settings/store'
import { IMAGE_MODELS, ASPECT_RATIOS, PROMPT_TEMPLATES, type ImageModel, type AspectRatio } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

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
  const { apiKey } = useAppStore()
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

  const saveImageToMedia = async (imageUrl: string): Promise<void> => {
    try {
      await uploadMediaFromUrl(
        imageUrl,
        `image_${Date.now()}.png`,
        'image',
        'image_generation'
      )
    } catch (error) {
      console.error('Failed to save image:', error)
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
        for (const url of urls) {
          await saveImageToMedia(url)
        }
      }
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

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            {t('imageGeneration.title') || '图片生成'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('imageGeneration.subtitle') || '使用 AI 根据文本描述生成精美图片'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
            <Sparkles className="w-8 h-8 relative text-violet-400/60" />
          </div>
        </div>
      </motion.div>

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
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                <Zap className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-foreground">{t('imageGeneration.prompt') || '提示词'}</span>
              </div>
              <div className="p-4 space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('imageGeneration.placeholder') || "描述你想要生成的图片，例如：一只戴着墨镜的猫在海滩上..."}
                  className="min-h-[120px] resize-none bg-background/50 border-zinc-800 text-zinc-100 placeholder:text-muted-foreground/50 focus:border-violet-500/50 focus:ring-violet-500/20"
                />
                
                {/* Template Buttons */}
                <div className="flex flex-wrap gap-2">
                  {PROMPT_TEMPLATES.slice(0, 6).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        activeTemplate === template.id
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25'
                          : 'bg-secondary/50 text-muted-foreground/70 hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Reference Image Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-fuchsia-400" />
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
                    className="border-2 border-dashed border-zinc-800 rounded-lg p-6 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all duration-300 group/upload"
                  >
                    <div className="relative mx-auto w-12 h-12 mb-3">
                      <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full group-hover/upload:blur-2xl transition-all" />
                      <Upload className="w-12 h-12 relative text-muted-foreground/50 group-hover/upload:text-violet-400 transition-colors" />
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
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-medium text-foreground">{t('imageGeneration.settings') || '参数设置'}</span>
                </div>
              </div>
              <div className="p-4 space-y-5">
                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('imageGeneration.model') || '模型'}</label>
                  <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
                    <SelectTrigger className="w-full bg-background/50 border-zinc-800 text-foreground hover:border-violet-500/50 transition-colors">
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
                            ? 'bg-gradient-to-br from-violet-600/80 to-fuchsia-600/80 border-violet-500/50 text-white shadow-lg shadow-violet-500/20'
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
                            ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 border-violet-500/50 text-white shadow-lg shadow-violet-500/20'
                            : 'bg-background/50 border-border text-muted-foreground/70 hover:border-border hover:text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
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
                          className="flex-1 bg-background/50 border-zinc-800 text-foreground focus:border-violet-500/50"
                        />
                        <button
                          onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                          className="px-3 py-2 rounded-lg bg-zinc-800 text-muted-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
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
                ? 'hover:shadow-2xl hover:shadow-violet-500/30'
                : 'cursor-not-allowed'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 transition-all duration-300 ${
              prompt.trim() && !isGenerating ? 'group-hover:scale-105' : ''
            }`} />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 via-fuchsia-400/20 to-pink-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center justify-center gap-2 py-4 text-foreground font-semibold">
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
            <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-pink-500/20 rounded-2xl blur opacity-50" />
            <div className="relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl h-full min-h-[500px] overflow-hidden">
              {/* Results Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-medium text-foreground">{t('imageGeneration.results') || '生成结果'}</span>
                </div>
                {generatedImages.length > 0 && (
                  <span className="text-xs text-muted-foreground">{generatedImages.length} 张图片</span>
                )}
              </div>

              {/* Results Content */}
              <div className="p-4">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-20"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 blur-3xl rounded-full animate-pulse" />
                        <div className="relative w-20 h-20">
                          <div className="absolute inset-0 border-2 border-violet-500/30 rounded-full animate-ping" />
                          <div className="absolute inset-2 border-2 border-fuchsia-500/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
                          <div className="absolute inset-4 border-2 border-pink-500/50 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
                          <Loader2 className="absolute inset-0 w-full h-full text-violet-400 animate-spin" />
                        </div>
                      </div>
                      <p className="mt-8 text-lg font-medium text-foreground">{t('imageGeneration.creating') || '正在创造...'}</p>
                      <p className="text-sm text-muted-foreground mt-2">{t('imageGeneration.pleaseWait') || '请稍候，AI正在绘制'}</p>
                    </motion.div>
                  ) : generatedImages.length > 0 ? (
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
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-300" />
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
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleImagePreview(index); }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors backdrop-blur-sm"
                                >
                                  <ZoomIn className="w-4 h-4" />
                                  预览
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(url, index); }}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors backdrop-blur-sm"
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
                        <div className="absolute inset-0 bg-violet-500/10 blur-3xl rounded-full" />
                        <ImageIcon className="w-16 h-16 relative text-muted-foreground/50" />
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
        slides={generatedImages.map(url => ({ src: url }))}
      />
    </motion.div>
  )
}
