import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Star,
  Download,
  Clock,
  GitBranch,
  Zap,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import {
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type WorkflowTemplate,
} from '@/data/workflow-templates'
import {
  MessageSquare,
  Image,
  Mic,
  Video,
  Music,
  BarChart3,
  Zap as ZapIcon,
} from 'lucide-react'
import type { TemplateCardProps } from './types'
import { getNodeCount, getDifficultyLabel, getDifficultyColor } from './utils'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Image,
  Mic,
  Video,
  Music,
  BarChart3,
  Zap: ZapIcon,
}

function getCategoryIcon(category: TemplateCategory) {
  const iconName = TEMPLATE_CATEGORIES[category]?.icon || 'Zap'
  return ICON_MAP[iconName] || ZapIcon
}

export function TemplateCard({
  template,
  onPreview,
  onUse,
  onCopy,
  copiedId,
}: TemplateCardProps) {
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
