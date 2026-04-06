import { useEffect, useState } from 'react'
import { CreateTemplateModal } from '@/components/templates/CreateTemplateModal'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Search, FileText, Image, Music, Video, FolderOpen, Edit3, Trash2, Copy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useTemplatesStore } from '@/stores/templates'
import type { PromptTemplate, TemplateCategory } from '@/lib/api/templates'
import { toastSuccess, toastError } from '@/lib/toast'
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

export default function TemplateLibrary() {
  const { t } = useTranslation()
  const { templates, isLoading, fetchTemplates, removeTemplate } = useTemplatesStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchTemplates(selectedCategory === 'all' ? undefined : selectedCategory)
  }, [selectedCategory, fetchTemplates])

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deleteConfirm) return
    
    const success = await removeTemplate(deleteConfirm.id)
    if (success) {
      toastSuccess('删除成功', `模板 "${deleteConfirm.name}" 已删除`)
    } else {
      toastError('删除失败', '请稍后重试')
    }
    setDeleteConfirm(null)
  }

  const openDeleteConfirm = (id: string, name: string) => {
    setDeleteConfirm({ id, name })
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    toastSuccess('已复制', '模板内容已复制到剪贴板')
  }

  const categories: (TemplateCategory | 'all')[] = ['all', 'text', 'image', 'music', 'video', 'general']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('templates.create', '创建模板')}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input
            placeholder={t('templates.searchPlaceholder', '搜索模板...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/secondary border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {t(`templates.category.${category}`, category)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground/70">{t('templates.empty', '暂无模板')}</p>
            <p className="text-muted-foreground/50 text-sm mt-1">{t('templates.emptyHint', '创建您的第一个提示词模板')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onCopy={handleCopy}
              onDelete={handleDelete}
              openDeleteConfirm={openDeleteConfirm}
            />
          ))}
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="确认删除"
        description={`确定要删除模板 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            删除
          </Button>
        </div>
      </Dialog>

      <CreateTemplateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}

function TemplateCard({
  template,
  onCopy,
  onDelete,
  openDeleteConfirm,
}: {
  template: PromptTemplate
  onCopy: (content: string) => void
  onDelete: () => void
  openDeleteConfirm: (id: string, name: string) => void
}) {
  const Icon = CATEGORY_ICONS[template.category] || FileText

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-border hover:border-border transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn('p-2 rounded-lg', CATEGORY_COLORS[template.category])}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.is_builtin && (
                  <Badge variant="secondary" className="text-xs mt-1">内置</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => onCopy(template.content)}>
                <Copy className="w-4 h-4" />
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
          <p className="text-muted-foreground/70 text-sm line-clamp-2">{template.description || template.content.slice(0, 100)}</p>
          {template.variables && template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {template.variables.map((v) => (
                <Badge key={v.name} variant="outline" className="text-xs">
                  {`{{${v.name}}}`}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}