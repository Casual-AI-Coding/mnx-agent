import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { WorkflowTemplate, TemplateCategory } from '@/data/workflow-templates'
import { BUILTIN_TEMPLATES } from '@/data/workflow-templates'
import { MarketplaceHeader } from './MarketplaceHeader'
import { CategoryFilter } from './CategoryFilter'
import { TemplateGrid } from './TemplateGrid'
import { TemplatePreview } from './TemplatePreview'

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
    <div className="space-y-6">
      <MarketplaceHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateWorkflow={() => navigate('/workflow-builder')}
      />

      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <TemplateGrid
        templates={filteredTemplates}
        viewMode={viewMode}
        onPreview={handlePreview}
        onUse={handleUseTemplate}
        onCopy={handleCopyNodes}
        copiedId={copiedId}
      />

      <TemplatePreview
        template={selectedTemplate}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onUse={handleUseTemplate}
      />
    </div>
  )
}
