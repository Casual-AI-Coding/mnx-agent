import { useEffect, useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { getMaterialDetail, listMaterials } from '@/lib/api/materials'
import { listTemplates, type PromptTemplate, type TemplateCategory } from '@/lib/api/templates'
import { listWorkflows, type WorkflowTemplate } from '@/lib/api/workflows'
import { buildResourceReference, type ResourceReference } from '@/lib/resource-references'
import type { Material, MaterialDetailResult } from '@/types/material'

export type GenerationResourceType = TemplateCategory | 'voice' | 'lyrics' | 'video-agent'

const TEMPLATE_CATEGORY_BY_GENERATION_TYPE: Record<GenerationResourceType, TemplateCategory> = {
  text: 'text',
  image: 'image',
  music: 'music',
  video: 'video',
  general: 'general',
  voice: 'general',
  lyrics: 'music',
  'video-agent': 'video',
}

export interface ApplyTemplatePayload {
  readonly content: string
  readonly reference: ResourceReference
}

export interface ApplyMaterialItemPayload {
  readonly lyrics: string
  readonly reference: ResourceReference
}

export interface ApplyWorkflowPayload {
  readonly workflow: WorkflowTemplate
  readonly reference: ResourceReference
}

interface ResourceReferenceCardProps {
  readonly generationType: GenerationResourceType
  readonly onApplyTemplate?: (payload: ApplyTemplatePayload) => void
  readonly onApplyMaterialItem?: (payload: ApplyMaterialItemPayload) => void
  readonly onApplyWorkflow?: (payload: ApplyWorkflowPayload) => void
}

export function ResourceReferenceCard({
  generationType,
  onApplyTemplate,
  onApplyMaterialItem,
  onApplyWorkflow,
}: ResourceReferenceCardProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialDetails, setMaterialDetails] = useState<Record<string, MaterialDetailResult>>({})
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadResources() {
      setIsLoading(true)
      const templateCategory = TEMPLATE_CATEGORY_BY_GENERATION_TYPE[generationType]
      const [templateResult, materialResult, workflowResult] = await Promise.all([
        listTemplates({ category: templateCategory }),
        listMaterials({ limit: 8, offset: 0 }),
        listWorkflows({ is_template: true, page: 1, limit: 20 }),
      ])

      if (!isMounted) return

      setTemplates(templateResult.success ? templateResult.data?.templates ?? [] : [])
      setMaterials(materialResult.success ? materialResult.data?.records ?? [] : [])
      setWorkflows(workflowResult.success ? workflowResult.data?.workflows ?? [] : [])
      setIsLoading(false)
    }

    void loadResources()
    return () => {
      isMounted = false
    }
  }, [generationType])

  const expandMaterial = async (material: Material) => {
    if (materialDetails[material.id]) return

    const result = await getMaterialDetail(material.id)
    if (!result.success || result.data === undefined) return

    const detail: MaterialDetailResult = result.data
    setMaterialDetails((current) => ({ ...current, [material.id]: detail }))
  }

  const hasResources =
    (onApplyTemplate !== undefined && templates.length > 0)
    || (onApplyMaterialItem !== undefined && materials.length > 0)
    || (onApplyWorkflow !== undefined && workflows.length > 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-primary" />
          资源引用
        </CardTitle>
        <CardDescription>快速引用已有 Prompt 模板、素材和工作流模板</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在加载资源...
          </p>
        )}

        {!isLoading && !hasResources && (
          <p className="text-sm text-muted-foreground">暂无可用资源，可继续手动填写生成参数。</p>
        )}

        {!isLoading && onApplyTemplate !== undefined && templates.length > 0 && (
          <ResourceSection title="Prompt 模板">
            {templates.map((template) => (
              <ResourceRow
                key={template.id}
                name={template.name}
                description={template.description ?? template.content}
                actionLabel={`应用${template.name}`}
                onApply={() => onApplyTemplate?.({
                  content: template.content,
                  reference: buildResourceReference({
                    source: 'prompt_template',
                    id: template.id,
                    name: template.name,
                    category: template.category,
                  }),
                })}
              />
            ))}
          </ResourceSection>
        )}

        {!isLoading && onApplyMaterialItem !== undefined && materials.length > 0 && (
          <ResourceSection title="素材">
            {materials.map((material) => (
              <div key={material.id} className="space-y-2 rounded-lg border border-border/50 p-3">
                <ResourceRow
                  name={material.name}
                  description={material.description ?? '素材集'}
                  actionLabel={`展开${material.name}`}
                  onApply={() => void expandMaterial(material)}
                />
                {materialDetails[material.id]?.items.map((item) => (
                  <ResourceRow
                    key={item.id}
                    name={item.name}
                    description={item.remark ?? item.lyrics ?? '歌曲素材'}
                    actionLabel={`应用${item.name}`}
                    onApply={() => onApplyMaterialItem?.({
                      lyrics: item.lyrics ?? '',
                      reference: buildResourceReference({
                        source: 'material_item',
                        id: item.id,
                        name: item.name,
                      }),
                    })}
                  />
                ))}
              </div>
            ))}
          </ResourceSection>
        )}

        {!isLoading && onApplyWorkflow !== undefined && workflows.length > 0 && (
          <ResourceSection title="工作流模板">
            {workflows.map((workflow) => (
              <ResourceRow
                key={workflow.id}
                name={workflow.name}
                description={workflow.description ?? '工作流模板'}
                actionLabel={`应用${workflow.name}`}
                onApply={() => onApplyWorkflow?.({
                  workflow,
                  reference: buildResourceReference({
                    source: 'workflow_template',
                    id: workflow.id,
                    name: workflow.name,
                  }),
                })}
              />
            ))}
          </ResourceSection>
        )}
      </CardContent>
    </Card>
  )
}

interface ResourceSectionProps {
  readonly title: string
  readonly children: React.ReactNode
}

function ResourceSection({ title, children }: ResourceSectionProps) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

interface ResourceRowProps {
  readonly name: string
  readonly description: string
  readonly actionLabel: string
  readonly onApply: () => void
}

function ResourceRow({ name, description, actionLabel, onApply }: ResourceRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onApply} aria-label={actionLabel}>
        应用
      </Button>
    </div>
  )
}
