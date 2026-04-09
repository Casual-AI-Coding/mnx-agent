import { Dialog } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { WorkflowPreviewWrapper } from '@/components/workflow/WorkflowPreview'
import {
  Star,
  Clock,
  GitBranch,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { status } from '@/themes/tokens'
import type { TemplatePreviewProps } from './types'
import { getNodeCount, getDifficultyLabel, getDifficultyColor } from './utils'

export function TemplatePreview({
  template,
  isOpen,
  onClose,
  onUse,
}: TemplatePreviewProps) {
  if (!template) return null

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={template.name}
      size="lg"
    >
      <div className="py-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              {template.description}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={getDifficultyColor(template.difficulty)}>
                {getDifficultyLabel(template.difficulty)}
              </Badge>
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {template.estimatedTime}
              </Badge>
              <Badge variant="outline">
                <GitBranch className="w-3 h-3 mr-1" />
                {getNodeCount(template)} 节点
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.map((tag) => (
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
              <span className="font-medium">{template.rating}</span>
              <span className="text-xs text-muted-foreground">
                ({template.ratingCount})
              </span>
            </div>
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden" style={{ height: '400px' }}>
          <WorkflowPreviewWrapper
            nodesJson={JSON.stringify(template.nodes)}
            edgesJson={JSON.stringify(template.edges)}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            作者: {template.author} · 使用次数: {template.usageCount}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={() => onUse(template)}>
              <Play className="w-4 h-4 mr-2" />
              使用模板
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
