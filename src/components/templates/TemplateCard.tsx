import { motion } from 'framer-motion'
import { Copy, Edit3, FileText, FolderOpen, History, Image, Music, Trash2, Video } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { PromptTemplate, TemplateCategory } from '@/lib/api/templates'
import { cn } from '@/lib/utils'
import { services } from '@/themes/tokens'

const CATEGORY_ICONS: Record<TemplateCategory, typeof FileText> = {
  text: FileText,
  image: Image,
  music: Music,
  video: Video,
  general: FolderOpen,
}

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  text: cn(services.text.bg, services.text.text),
  image: cn(services.image.bg, services.image.text),
  music: cn(services.music.bg, services.music.text),
  video: cn(services.video.bg, services.video.text),
  general: 'bg-muted/10 text-muted-foreground',
}

interface TemplateCardProps {
  template: PromptTemplate
  onCopy: (content: string) => void
  onManageVersions: (template: PromptTemplate) => void
  openDeleteConfirm: (id: string, name: string) => void
}

export function TemplateCard({ template, onCopy, onManageVersions, openDeleteConfirm }: TemplateCardProps) {
  const Icon = CATEGORY_ICONS[template.category] || FileText

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="border-border hover:border-border transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-lg', CATEGORY_COLORS[template.category])}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.is_builtin && <Badge variant="secondary" className="text-xs mt-1">内置</Badge>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onCopy(template.content)}>
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onManageVersions(template)}>
                <History className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Edit3 className="w-4 h-4" />
              </Button>
              {!template.is_builtin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => openDeleteConfirm(template.id, template.name)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground/70 text-sm line-clamp-2">
            {template.description || template.content.slice(0, 100)}
          </p>
          {template.variables && template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {template.variables.map((variable) => (
                <Badge key={variable.name} variant="outline" className="text-xs">
                  {`{{${variable.name}}}`}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
