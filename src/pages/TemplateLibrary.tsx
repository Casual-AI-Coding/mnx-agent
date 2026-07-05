import { useEffect, useState, useRef } from 'react'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { CreateTemplateModal } from '@/components/templates/CreateTemplateModal'
import { TemplateVersionDialog } from '@/components/templates/TemplateVersionDialog'
import { useTranslation } from 'react-i18next'
import { Plus, Search, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/shared/PageHeader'
import { useTemplatesStore } from '@/stores/templates'
import { useAuthStore } from '@/stores/auth'
import type { PromptTemplate, TemplateCategory } from '@/lib/api/templates'
import { toastSuccess, toastError } from '@/lib/toast'

export default function TemplateLibrary() {
  const { t } = useTranslation()
  const {
    templates,
    versions,
    versionDiffs,
    isLoading,
    isVersionLoading,
    fetchTemplates,
    fetchTemplateVersions,
    createTemplateVersion,
    compareTemplateVersions,
    rollbackTemplateVersion,
    removeTemplate,
  } = useTemplatesStore()
  const { isHydrated } = useAuthStore()
  const hasInitializedRef = useRef(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [versionTemplate, setVersionTemplate] = useState<PromptTemplate | null>(null)

  useEffect(() => {
    if (!isHydrated || hasInitializedRef.current) return
    hasInitializedRef.current = true
    fetchTemplates(selectedCategory === 'all' ? undefined : { category: selectedCategory })
  }, [isHydrated, selectedCategory, fetchTemplates])

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

  const openVersionDialog = (template: PromptTemplate) => {
    setVersionTemplate(template)
    fetchTemplateVersions(template.id)
  }

  const handleCreateVersion = async (templateId: string, changeSummary: string | null) => {
    const success = await createTemplateVersion(templateId, changeSummary)
    if (success) {
      await fetchTemplateVersions(templateId)
    }
    return success
  }

  const handleRollbackVersion = async (templateId: string, versionId: string) => {
    const success = await rollbackTemplateVersion(templateId, versionId)
    if (success) {
      await fetchTemplateVersions(templateId)
    }
    return success
  }

  const categories: (TemplateCategory | 'all')[] = ['all', 'text', 'image', 'music', 'video', 'general']

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileText className="w-5 h-5" />}
        title={t('templates.title', '模板库')}
        description={t('templates.subtitle', '管理和使用提示词模板')}
        gradient="green-emerald"
        actions={
          <Button className="flex items-center gap-2" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4" />
            {t('templates.create', '创建模板')}
          </Button>
        }
      />

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
              onManageVersions={openVersionDialog}
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

      <TemplateVersionDialog
        open={versionTemplate !== null}
        template={versionTemplate}
        versions={versions}
        diffs={versionDiffs}
        isLoading={isVersionLoading}
        onClose={() => setVersionTemplate(null)}
        onCreateVersion={handleCreateVersion}
        onCompareVersions={compareTemplateVersions}
        onRollbackVersion={handleRollbackVersion}
      />
    </div>
  )
}
