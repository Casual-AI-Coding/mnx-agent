import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BUILTIN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from '@/data/workflow-templates'
import {
  MessageSquare,
  Image,
  Mic,
  Video,
  Music,
  BarChart3,
  Zap,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Image,
  Mic,
  Video,
  Music,
  BarChart3,
  Zap,
}

interface CategoryFilterProps {
  selectedCategory: TemplateCategory | null
  onCategoryChange: (category: TemplateCategory | null) => void
}

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  const categories = Object.entries(TEMPLATE_CATEGORIES).map(([id, info]) => {
    const IconComponent = ICON_MAP[info.icon] || Zap
    return {
      id: id as TemplateCategory,
      label: info.label,
      color: info.color,
      IconComponent,
      count: BUILTIN_TEMPLATES.filter((t) => t.category === id).length,
    }
  })

  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-muted-foreground/50" />
      <span className="text-sm text-muted-foreground">分类：</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCategoryChange(null)}
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
            onClick={() => onCategoryChange(cat.id)}
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
  )
}
