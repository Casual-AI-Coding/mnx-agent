import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourceReferenceCard } from './ResourceReferenceCard'
import { listMaterials, getMaterialDetail } from '@/lib/api/materials'
import { listTemplates } from '@/lib/api/templates'
import { listWorkflows } from '@/lib/api/workflows'
import type { Material, MaterialDetailResult } from '@/types/material'
import type { PromptTemplate } from '@/lib/api/templates'
import type { WorkflowTemplate } from '@/lib/api/workflows'

vi.mock('@/lib/api/materials', () => ({
  listMaterials: vi.fn(),
  getMaterialDetail: vi.fn(),
}))

vi.mock('@/lib/api/templates', () => ({
  listTemplates: vi.fn(),
}))

vi.mock('@/lib/api/workflows', () => ({
  listWorkflows: vi.fn(),
}))

const textTemplate: PromptTemplate = {
  id: 'tpl-text-1',
  name: '短视频脚本模板',
  description: '用于脚本生成',
  content: '请生成一个短视频脚本',
  category: 'text',
  variables: null,
  is_builtin: false,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
}

const artistMaterial: Material = {
  id: 'material-1',
  material_type: 'artist',
  name: '测试歌手',
  description: '素材描述',
  metadata: null,
  owner_id: 'user-1',
  sort_order: 0,
  is_deleted: false,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
  deleted_at: null,
}

const materialDetail: MaterialDetailResult = {
  material: artistMaterial,
  materialPrompts: [],
  items: [
    {
      id: 'song-1',
      material_id: 'material-1',
      item_type: 'song',
      name: '测试歌曲',
      lyrics: '这是一段歌词',
      remark: null,
      metadata: null,
      sort_order: 0,
      is_deleted: false,
      created_at: '2026-01-01T00:00:00',
      updated_at: '2026-01-01T00:00:00',
      deleted_at: null,
      prompts: [],
    },
  ],
}

const workflowTemplate: WorkflowTemplate = {
  id: 'workflow-1',
  name: '视频生成工作流',
  description: '用于视频任务',
  nodes_json: '{"nodes":[]}',
  edges_json: '{"edges":[]}',
  created_at: '2026-01-01T00:00:00',
  is_template: true,
}

describe('ResourceReferenceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listTemplates).mockResolvedValue({ success: true, data: { templates: [textTemplate] } })
    vi.mocked(listMaterials).mockResolvedValue({
      success: true,
      data: { records: [artistMaterial], pagination: { page: 1, limit: 8, total: 1, totalPages: 1 } },
    })
    vi.mocked(getMaterialDetail).mockResolvedValue({ success: true, data: materialDetail })
    vi.mocked(listWorkflows).mockResolvedValue({
      success: true,
      data: { workflows: [workflowTemplate], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    })
  })

  it('按生成类型加载 Prompt 模板、素材和工作流模板', async () => {
    render(<ResourceReferenceCard generationType="text" onApplyTemplate={vi.fn()} />)

    await waitFor(() => expect(listTemplates).toHaveBeenCalledWith({ category: 'text' }))
    expect(listMaterials).toHaveBeenCalledWith({ limit: 8, offset: 0 })
    expect(listWorkflows).toHaveBeenCalledWith({ is_template: true, page: 1, limit: 20 })
    expect(await screen.findByText('资源引用')).toBeInTheDocument()
    expect(screen.getByText('短视频脚本模板')).toBeInTheDocument()
  })

  it('应用 Prompt 模板时回传模板内容和资源引用', async () => {
    const user = userEvent.setup()
    const onApplyTemplate = vi.fn()
    render(<ResourceReferenceCard generationType="text" onApplyTemplate={onApplyTemplate} />)

    await user.click(await screen.findByRole('button', { name: '应用短视频脚本模板' }))

    expect(onApplyTemplate).toHaveBeenCalledWith({
      content: '请生成一个短视频脚本',
      reference: {
        source: 'prompt_template',
        id: 'tpl-text-1',
        name: '短视频脚本模板',
        category: 'text',
      },
    })
  })

  it('应用素材歌曲时回传歌词和素材项引用', async () => {
    const user = userEvent.setup()
    const onApplyMaterialItem = vi.fn()
    render(<ResourceReferenceCard generationType="music" onApplyMaterialItem={onApplyMaterialItem} />)

    await user.click(await screen.findByRole('button', { name: '展开测试歌手' }))
    await user.click(await screen.findByRole('button', { name: '应用测试歌曲' }))

    expect(getMaterialDetail).toHaveBeenCalledWith('material-1')
    expect(onApplyMaterialItem).toHaveBeenCalledWith({
      lyrics: '这是一段歌词',
      reference: {
        source: 'material_item',
        id: 'song-1',
        name: '测试歌曲',
      },
    })
  })

  it('应用工作流模板时回传工作流引用', async () => {
    const user = userEvent.setup()
    const onApplyWorkflow = vi.fn()
    render(<ResourceReferenceCard generationType="video" onApplyWorkflow={onApplyWorkflow} />)

    await user.click(await screen.findByRole('button', { name: '应用视频生成工作流' }))

    expect(onApplyWorkflow).toHaveBeenCalledWith({
      workflow: workflowTemplate,
      reference: {
        source: 'workflow_template',
        id: 'workflow-1',
        name: '视频生成工作流',
      },
    })
  })

  it('没有资源时显示空状态并保留手动输入流程', async () => {
    vi.mocked(listTemplates).mockResolvedValue({ success: true, data: { templates: [] } })
    vi.mocked(listMaterials).mockResolvedValue({
      success: true,
      data: { records: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } },
    })
    vi.mocked(listWorkflows).mockResolvedValue({
      success: true,
      data: { workflows: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    })

    render(<ResourceReferenceCard generationType="image" onApplyTemplate={vi.fn()} />)

    expect(await screen.findByText('暂无可用资源，可继续手动填写生成参数。')).toBeInTheDocument()
  })
})
