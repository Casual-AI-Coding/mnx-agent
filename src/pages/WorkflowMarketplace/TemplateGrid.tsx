import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemplateCard } from './TemplateCard'
import { TemplateListItem } from './TemplateListItem'
import type { TemplateGridProps } from './types'
import { containerVariants, itemVariants } from './constants'

export function TemplateGrid({
  templates,
  viewMode,
  onPreview,
  onUse,
  onCopy,
  copiedId,
}: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <Search className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">未找到模板</h3>
        <p className="text-sm text-muted-foreground">
          尝试使用其他关键词搜索，或查看其他分类
        </p>
      </div>
    )
  }

  return (
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
        {templates.map((template) => (
          <motion.div key={template.id} variants={itemVariants}>
            {viewMode === 'grid' ? (
              <TemplateCard
                template={template}
                onPreview={onPreview}
                onUse={onUse}
                onCopy={onCopy}
                copiedId={copiedId}
              />
            ) : (
              <TemplateListItem
                template={template}
                onPreview={onPreview}
                onUse={onUse}
                onCopy={onCopy}
                copiedId={copiedId}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
