import { describe, expect, it } from 'vitest'
import {
  buildResourceReference,
  buildResourceUsageMetadata,
  mergeResourceUsageMetadata,
  upsertResourceReference,
  type ResourceReference,
} from './resource-references'

describe('resource-references', () => {
  it('构建 Prompt 模板引用时保留来源、分类和名称', () => {
    const reference = buildResourceReference({
      source: 'prompt_template',
      id: 'tpl-1',
      name: '商业文案模板',
      category: 'text',
    })

    expect(reference).toEqual({
      source: 'prompt_template',
      id: 'tpl-1',
      name: '商业文案模板',
      category: 'text',
    })
  })

  it('生成资源使用追踪 metadata 时过滤未选择的引用', () => {
    const references: Array<ResourceReference | null> = [
      buildResourceReference({ source: 'material', id: 'material-1', name: '测试歌手' }),
      null,
      buildResourceReference({ source: 'workflow_template', id: 'workflow-1', name: '视频工作流' }),
    ]

    expect(buildResourceUsageMetadata(references)).toEqual({
      resourceRefs: [
        { source: 'material', id: 'material-1', name: '测试歌手' },
        { source: 'workflow_template', id: 'workflow-1', name: '视频工作流' },
      ],
    })
  })

  it('合并生成历史 metadata 时保留原有字段并追加资源引用', () => {
    const result = mergeResourceUsageMetadata(
      { model: 'music-2.6', duration: 120 },
      [buildResourceReference({ source: 'material_item', id: 'song-1', name: '副歌素材' })]
    )

    expect(result).toEqual({
      model: 'music-2.6',
      duration: 120,
      resourceRefs: [
        { source: 'material_item', id: 'song-1', name: '副歌素材' },
      ],
    })
  })

  it('没有资源引用时不污染原有 metadata', () => {
    const base = { model: 'image-01', seed: 42 }

    expect(mergeResourceUsageMetadata(base, [])).toEqual(base)
  })

  it('追加同一资源引用时替换旧引用并保留其他引用顺序', () => {
    const oldTemplate = buildResourceReference({ source: 'prompt_template', id: 'tpl-1', name: '旧模板' })
    const material = buildResourceReference({ source: 'material_item', id: 'song-1', name: '副歌素材' })
    const newTemplate = buildResourceReference({ source: 'prompt_template', id: 'tpl-1', name: '新模板' })

    expect(upsertResourceReference([oldTemplate, material], newTemplate)).toEqual([
      material,
      newTemplate,
    ])
  })
})
