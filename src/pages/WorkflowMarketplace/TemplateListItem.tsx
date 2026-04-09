import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Star,
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
import type { TemplateListItemProps } from './types'
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

export function TemplateListItem({
  template,
  onPreview,
  onUse,
  onCopy,
  copiedId,
}: TemplateListItemProps) {
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
                <Star className="w-3 h-3" />
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
