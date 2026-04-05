import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  Download,
  Clock,
  GitBranch,
  Play,
  Zap,
  Copy,
  Check,
  MessageSquare,
  Image,
  Mic,
  Video,
  Music,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { WorkflowPreviewWrapper } from '@/components/workflow/WorkflowPreview'
import {
  BUILTIN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type WorkflowTemplate,
  type TemplateCategory,
} from '@/data/workflow-templates'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import { toast } from 'sonner'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Image,
  Mic,
  Video,
  Music,
  BarChart3,
  Zap,
}

function getNodeCount(template: WorkflowTemplate): number {
  return template.nodes.length
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  }
  return labels[difficulty] || difficulty
}

function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    beginner: cn(status.success.bgSubtle, status.success.icon),
    intermediate: cn(status.warning.bgSubtle, status.warning.icon),
    advanced: cn(status.error.bgSubtle, status.error.icon),
  }
  return colors[difficulty] || cn(status.pending.bgSubtle, status.pending.icon)
}

function getCategoryIcon(category: TemplateCategory) {
  const iconName = TEMPLATE_CATEGORIES[category]?.icon || 'Zap'
  return ICON_MAP[iconName] || Zap
}

export default function WorkflowMarketplace() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredTemplates = useMemo(() => {
    let templates = BUILTIN_TEMPLATES

    if (selectedCategory) {
      templates = templates.filter((t) => t.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return templates
  }, [selectedCategory, searchQuery])

  const categories = useMemo(() => {
    return Object.entries(TEMPLATE_CATEGORIES).map(([id, info]) => {
      const IconComponent = ICON_MAP[info.icon] || Zap
      return {
        id: id as TemplateCategory,
        label: info.label,
        color: info.color,
        IconComponent,
        count: BUILTIN_TEMPLATES.filter((t) => t.category === id).length,
      }
    })
  }, [])

  const handleUseTemplate = (template: WorkflowTemplate) => {
    const params = new URLSearchParams({
      template: template.id,
      name: template.name,
    })
    navigate(`/workflow-builder?${params.toString()}`)
    toast.success(`已加载模板：${template.name}`)
  }

  const handlePreview = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setShowPreview(true)
  }

  const handleCopyNodes = async (template: WorkflowTemplate) => {
    try {
      const workflowData = {
        nodes: template.nodes,
        edges: template.edges,
      }
      await navigator.clipboard.writeText(JSON.stringify(workflowData, null, 2))
      setCopiedId(template.id)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('工作流配置已复制到剪贴板')
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <div className="min-h-full bg-background">
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">工作流模板市场</h1>
              <p className="text-sm text-muted-foreground/70 mt-1">
                发现和使用预定义的工作流模板，快速构建自动化任务
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/workflow-builder')}
              >
                <GitBranch className="w-4 h-4 mr-2" />
                创建工作流
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Filter className="w-4 h-4 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">分类：</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-colors',
                  selectedCategory === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                全部 ({BUILTIN_TEMPLATES.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm transition-colors flex items-center gap-1.5',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  <cat.IconComponent className={cn('w-3.5 h-3.5', cat.color)} />
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">未找到模板</h3>
            <p className="text-sm text-muted-foreground">
              尝试使用其他关键词搜索，或查看其他分类
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            )}
          >
            <AnimatePresence>
              {filteredTemplates.map((template) => (
                <motion.div key={template.id} variants={itemVariants}>
                  {viewMode === 'grid' ? (
                    <TemplateCard
                      template={template}
                      onPreview={handlePreview}
                      onUse={handleUseTemplate}
                      onCopy={handleCopyNodes}
                      copiedId={copiedId}
                    />
                  ) : (
                    <TemplateListItem
                      template={template}
                      onPreview={handlePreview}
                      onUse={handleUseTemplate}
                      onCopy={handleCopyNodes}
                      copiedId={copiedId}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title={selectedTemplate?.name || '模板预览'}
        size="lg"
      >
        {selectedTemplate && (
          <div className="py-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className={getDifficultyColor(selectedTemplate.difficulty)}>
                    {getDifficultyLabel(selectedTemplate.difficulty)}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {selectedTemplate.estimatedTime}
                  </Badge>
                  <Badge variant="outline">
                    <GitBranch className="w-3 h-3 mr-1" />
                    {getNodeCount(selectedTemplate)} 节点
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn('flex items-center gap-1', status.warning.icon)}>
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">{selectedTemplate.rating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({selectedTemplate.ratingCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <WorkflowPreviewWrapper
                nodesJson={JSON.stringify(selectedTemplate.nodes)}
                edgesJson={JSON.stringify(selectedTemplate.edges)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-xs text-muted-foreground">
                作者: {selectedTemplate.author} · 使用次数: {selectedTemplate.usageCount}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  关闭
                </Button>
                <Button onClick={() => handleUseTemplate(selectedTemplate)}>
                  <Play className="w-4 h-4 mr-2" />
                  使用模板
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

interface TemplateCardProps {
  template: WorkflowTemplate
  onPreview: (template: WorkflowTemplate) => void
  onUse: (template: WorkflowTemplate) => void
  onCopy: (template: WorkflowTemplate) => void
  copiedId: string | null
}

function TemplateCard({ template, onPreview, onUse, onCopy, copiedId }: TemplateCardProps) {
  const CategoryIcon = getCategoryIcon(template.category)
  const categoryInfo = TEMPLATE_CATEGORIES[template.category]

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden">
      <CardHeader className="p-0">
        <div className="relative h-32 bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <CategoryIcon className={cn('w-12 h-12 opacity-30', categoryInfo.color)} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={cn('text-xs', getDifficultyColor(template.difficulty))}
              >
                {getDifficultyLabel(template.difficulty)}
              </Badge>
              <div className={cn('flex items-center gap-1 text-xs', status.warning.icon)}>
                <Star className="w-3 h-3 fill-current" />
                {template.rating}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('p-2 rounded-lg bg-muted/50', categoryInfo.color)}>
            <CategoryIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{template.name}</h3>
            <p className="text-xs text-muted-foreground/70">{categoryInfo.label}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground/80 line-clamp-2 mb-3">
          {template.description}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mb-3">
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            {getNodeCount(template)} 节点
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {template.estimatedTime}
          </span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {template.usageCount}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground/70"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onPreview(template)}>
            预览
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onUse(template)}>
            <Zap className="w-3 h-3 mr-1" />
            使用
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(template)}
            title="复制工作流配置"
          >
            {copiedId === template.id ? (
              <Check className={cn('w-4 h-4', status.success.icon)} />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface TemplateListItemProps {
  template: WorkflowTemplate
  onPreview: (template: WorkflowTemplate) => void
  onUse: (template: WorkflowTemplate) => void
  onCopy: (template: WorkflowTemplate) => void
  copiedId: string | null
}

function TemplateListItem({ template, onPreview, onUse, onCopy, copiedId }: TemplateListItemProps) {
  const CategoryIcon = getCategoryIcon(template.category)
  const categoryInfo = TEMPLATE_CATEGORIES[template.category]

  return (
    <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg bg-muted/50', categoryInfo.color)}>
            <CategoryIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{template.name}</h3>
              <Badge
                variant="secondary"
                className={cn('text-xs', getDifficultyColor(template.difficulty))}
              >
                {getDifficultyLabel(template.difficulty)}
              </Badge>
              <div className={cn('flex items-center gap-1 text-xs', status.warning.icon)}>
                <Star className="w-3 h-3 fill-current" />
                {template.rating}
              </div>
            </div>
            <p className="text-sm text-muted-foreground/80">{template.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground/60 mt-2">
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {getNodeCount(template)} 节点
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {template.estimatedTime}
              </span>
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                {template.usageCount} 次使用
              </span>
              <span>{categoryInfo.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground/70"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreview(template)}>
              预览
            </Button>
            <Button size="sm" onClick={() => onUse(template)}>
              <Zap className="w-3 h-3 mr-1" />
              使用
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopy(template)}
              title="复制工作流配置"
            >
            {copiedId === template.id ? (
              <Check className={cn('w-4 h-4', status.success.icon)} />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
