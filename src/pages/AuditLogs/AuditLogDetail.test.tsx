import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FORM_PERSISTENCE_KEYS } from '@/hooks/useFormPersistence'
import { AuditLogDetail } from './AuditLogDetail'
import type { AuditAction, AuditLog } from '@/lib/api/audit'

const navigateSpy = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

const actionConfig: Record<AuditAction, { color: string; label: string }> = {
  create: { color: 'text-green-500', label: '创建' },
  update: { color: 'text-blue-500', label: '更新' },
  delete: { color: 'text-red-500', label: '删除' },
  execute: { color: 'text-purple-500', label: '执行' },
}

const baseLog: AuditLog = {
  id: 'audit-1',
  action: 'execute',
  resource_type: 'external_api',
  resource_id: null,
  user_id: 'user-1',
  username: '测试用户',
  ip_address: '127.0.0.1',
  user_agent: 'vitest',
  request_method: 'POST',
  request_path: '/api/image/generate',
  request_body: {
    model: 'image-01',
    prompt: '雨夜城市',
    aspect_ratio: '16:9',
  },
  query_params: null,
  response_body: null,
  response_status: 200,
  error_message: null,
  duration_ms: 80,
  trace_id: 'trace-1',
  created_at: '2026-07-06T00:00:00',
}

function renderDetail(selectedLog: AuditLog) {
  const onClose = vi.fn()
  render(
    <MemoryRouter>
      <AuditLogDetail
        selectedLog={selectedLog}
        actionConfig={actionConfig}
        defaultActionConfig={{ color: 'text-muted-foreground', label: '其他' }}
        statusColors={{ '2': 'text-green-500' }}
        formatDuration={(ms) => `${ms ?? 0}ms`}
        onClose={onClose}
        t={(_key, fallback) => fallback ?? _key}
      />
    </MemoryRouter>
  )
  return { onClose }
}

describe('AuditLogDetail replay', () => {
  beforeEach(() => {
    navigateSpy.mockClear()
    window.localStorage.clear()
  })

  it('reuses allowlisted audit request parameters without resubmitting the request', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDetail(baseLog)

    await user.click(await screen.findByRole('button', { name: '复用参数' }))

    expect(window.localStorage.getItem(`form-persistence:${FORM_PERSISTENCE_KEYS.IMAGE_GENERATION}`)).toBe(JSON.stringify({
      prompt: '雨夜城市',
      model: 'image-01',
      aspectRatioState: { type: 'preset', preset: '16:9' },
      numImages: 1,
      referenceImageMode: 'upload',
      referenceImageUrl: '',
      promptOptimizer: false,
      aigcWatermark: false,
      imageTitle: '',
      parallelCount: 1,
    }))
    expect(navigateSpy).toHaveBeenCalledWith('/image')
    expect(window.localStorage.getItem('history-replay:auto-generate')).toBeNull()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('hides replay for logs with sensitive request fields', () => {
    renderDetail({
      ...baseLog,
      request_body: {
        prompt: '雨夜城市',
        model: 'image-01',
        api_key: 'sk-test',
      },
    })

    expect(screen.queryByRole('button', { name: '复用参数' })).not.toBeInTheDocument()
  })
})
