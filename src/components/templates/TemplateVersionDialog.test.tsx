import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TemplateVersionDialog } from './TemplateVersionDialog'
import type { PromptTemplate, PromptTemplateVersion, PromptTemplateVersionDiff } from '@/lib/api/templates'

vi.mock('@/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

const template: PromptTemplate = {
  id: 'template-1',
  name: 'Greeting template',
  description: 'Greeting prompt',
  content: 'Hello {{name}}',
  category: 'text',
  variables: [{ name: 'name', required: true }],
  is_builtin: false,
  created_at: '2026-07-04T00:00:00',
  updated_at: '2026-07-04T00:00:00',
}

const versions: PromptTemplateVersion[] = [
  {
    id: 'ptv-2',
    template_id: 'template-1',
    version_number: 2,
    name: 'Greeting template v2',
    description: 'Greeting prompt v2',
    content: 'Hello {{name}}, welcome back',
    category: 'text',
    variables: [{ name: 'name', required: true }],
    change_summary: 'Updated greeting',
    created_by: 'owner-1',
    owner_id: 'owner-1',
    created_at: '2026-07-04T01:00:00',
    is_active: true,
  },
  {
    id: 'ptv-1',
    template_id: 'template-1',
    version_number: 1,
    name: 'Greeting template',
    description: 'Greeting prompt',
    content: 'Hello {{name}}',
    category: 'text',
    variables: [{ name: 'name', required: true }],
    change_summary: 'Initial version',
    created_by: 'owner-1',
    owner_id: 'owner-1',
    created_at: '2026-07-04T00:00:00',
    is_active: false,
  },
]

const diffs: PromptTemplateVersionDiff[] = [
  {
    field: 'content',
    from: 'Hello {{name}}',
    to: 'Hello {{name}}, welcome back',
  },
]

describe('TemplateVersionDialog', () => {
  const onClose = vi.fn()
  const onCreateVersion = vi.fn()
  const onCompareVersions = vi.fn()
  const onRollbackVersion = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    onCreateVersion.mockResolvedValue(true)
    onCompareVersions.mockResolvedValue(undefined)
    onRollbackVersion.mockResolvedValue(true)
  })

  it('创建版本时提交当前模板和变更摘要', async () => {
    const user = userEvent.setup()
    render(
      <TemplateVersionDialog
        open={true}
        template={template}
        versions={versions}
        diffs={[]}
        isLoading={false}
        onClose={onClose}
        onCreateVersion={onCreateVersion}
        onCompareVersions={onCompareVersions}
        onRollbackVersion={onRollbackVersion}
      />
    )

    await user.type(screen.getByLabelText('版本变更摘要'), 'UI 快照')
    await user.click(screen.getByRole('button', { name: '创建版本' }))

    await waitFor(() => {
      expect(onCreateVersion).toHaveBeenCalledWith('template-1', 'UI 快照')
    })
  })

  it('比较版本时按选择的版本号请求字段级差异', async () => {
    const user = userEvent.setup()
    render(
      <TemplateVersionDialog
        open={true}
        template={template}
        versions={versions}
        diffs={diffs}
        isLoading={false}
        onClose={onClose}
        onCreateVersion={onCreateVersion}
        onCompareVersions={onCompareVersions}
        onRollbackVersion={onRollbackVersion}
      />
    )

    await user.selectOptions(screen.getByLabelText('起始版本'), '1')
    await user.selectOptions(screen.getByLabelText('目标版本'), '2')
    await user.click(screen.getByRole('button', { name: '比较版本' }))

    await waitFor(() => {
      expect(onCompareVersions).toHaveBeenCalledWith('template-1', 1, 2)
    })
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByText('Hello {{name}}, welcome back')).toBeInTheDocument()
  })

  it('回滚版本时提交当前模板和目标版本 id', async () => {
    const user = userEvent.setup()
    render(
      <TemplateVersionDialog
        open={true}
        template={template}
        versions={versions}
        diffs={[]}
        isLoading={false}
        onClose={onClose}
        onCreateVersion={onCreateVersion}
        onCompareVersions={onCompareVersions}
        onRollbackVersion={onRollbackVersion}
      />
    )

    await user.click(screen.getByRole('button', { name: '回滚到 v1' }))

    await waitFor(() => {
      expect(onRollbackVersion).toHaveBeenCalledWith('template-1', 'ptv-1')
    })
  })
})
