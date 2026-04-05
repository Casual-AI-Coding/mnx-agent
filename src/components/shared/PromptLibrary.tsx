import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Search, Bookmark, Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { usePromptsStore, type PromptCategory, type PromptItem } from '@/stores/prompts'
import { toastSuccess, toastInfo } from '@/lib/toast'

interface PromptLibraryProps {
  isOpen: boolean
  onClose: () => void
  onSelectPrompt?: (content: string) => void
  defaultCategory?: PromptCategory
}

const categoryLabels: Record<PromptCategory | 'all', string> = {
  all: '全部',
  text: '文本',
  image: '图片',
  music: '音乐',
  video: '视频',
}

import { services } from '@/themes/tokens'

const categoryColors: Record<PromptCategory, string> = {
  text: `${services.text.bg} ${services.text.text} border-primary/30`,
  image: `${services.image.bg} ${services.image.text} border-accent/30`,
  music: `${services.music.bg} ${services.music.text} border-secondary/30`,
  video: `${services.video.bg} ${services.video.text} border-destructive/30`,
}

export function PromptLibrary({
  isOpen,
  onClose,
  onSelectPrompt,
  defaultCategory = 'text',
}: PromptLibraryProps) {
  const { prompts, deletePrompt } = usePromptsStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | 'all'>('all')

  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory
      const matchesSearch =
        searchQuery === '' ||
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [prompts, selectedCategory, searchQuery])

  const handleCopyPrompt = async (prompt: PromptItem) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      toastSuccess('提示词已复制到剪贴板')
      onSelectPrompt?.(prompt.content)
      onClose()
    } catch {
      toastInfo('复制失败，请手动复制')
    }
  }

  const handleDeletePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deletePrompt(id)
    toastSuccess('提示词已删除')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">提示词库</h2>
                <Badge variant="secondary" size="sm">
                  {prompts.length}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索提示词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as PromptCategory | 'all')}>
                <TabsList className="w-full grid grid-cols-5">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  <TabsTrigger value="text">文本</TabsTrigger>
                  <TabsTrigger value="image">图片</TabsTrigger>
                  <TabsTrigger value="music">音乐</TabsTrigger>
                  <TabsTrigger value="video">视频</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {filteredPrompts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Bookmark className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm">
                    {searchQuery ? '没有找到匹配的提示词' : '暂无保存的提示词'}
                  </p>
                  <p className="text-xs mt-1">
                    {searchQuery ? '尝试其他关键词' : '在生成页面点击"保存提示词"添加'}
                  </p>
                </div>
              ) : (
                filteredPrompts.map((prompt) => (
                  <motion.div
                    key={prompt.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card
                      className="group cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => handleCopyPrompt(prompt)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium truncate">{prompt.title}</h3>
                              <Badge
                                variant="outline"
                                size="sm"
                                className={categoryColors[prompt.category]}
                              >
                                {categoryLabels[prompt.category]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {prompt.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(prompt.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => handleDeletePrompt(prompt.id, e)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                          <Copy className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">点击复制并使用</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
