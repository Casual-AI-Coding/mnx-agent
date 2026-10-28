import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OperationsMetrics } from '../OperationsMetrics'
import { getOperationsOverview, getSuccessRateTrend } from '@/lib/api/stats'
import type { OperationsOverview, StatsTrendItem } from '@/lib/api/stats'

vi.mock('@/lib/api/stats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/stats')>()
  return {
    ...actual,
    getOperationsOverview: vi.fn(),
    getSuccessRateTrend: vi.fn(),
  }
})

function buildOverview(overrides: Partial<OperationsOverview> = {}): OperationsOverview {
  return {
    executions: { totalExecutions: 120, successRate: 0.95, failureRate: 0.05, avgDuration: 4200, errorCount: 6 },
    distribution: [{ type: 'text', count: 80 }, { type: 'image', count: 40 }],
    recentFailures: [],
    dlq: { unresolvedCount: 0, recent: [] },
    capacity: {
      records: [
        { service_type: 'image', remaining_quota: 15, total_quota: 100, usage_ratio: 0.85, reset_at: null },
        { service_type: 'video', remaining_quota: 70, total_quota: 100, usage_ratio: 0.3, reset_at: null },
      ],
      atRisk: ['image'],
    },
    health: { database: true, uptimeSeconds: 100, pool: null },
    ...overrides,
  }
}

const trend: StatsTrendItem[] = [
  { date: '2026-10-28', total: 10, success: 9, failed: 1 },
  { date: '2026-10-29', total: 20, success: 20, failed: 0 },
]

function renderMetrics() {
  return render(<MemoryRouter><OperationsMetrics /></MemoryRouter>)
}

describe('OperationsMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getOperationsOverview).mockResolvedValue({ success: true, data: buildOverview() })
    vi.mocked(getSuccessRateTrend).mockResolvedValue({ success: true, data: trend })
  })

  it('渲染后端执行统计四指标', async () => {
    renderMetrics()

    await waitFor(() => {
      expect(screen.getByText('120')).toBeInTheDocument()
    })
    expect(screen.getByText('95.0%')).toBeInTheDocument()
    expect(screen.getByText('5.0%')).toBeInTheDocument()
    expect(screen.getByText('4.2 秒')).toBeInTheDocument()
  })

  it('渲染配额快照与余量不足标记', async () => {
    renderMetrics()

    await waitFor(() => {
      expect(screen.getByTestId('capacity-image')).toBeInTheDocument()
    })
    expect(screen.getByTestId('capacity-video')).toBeInTheDocument()
    expect(screen.getByText('余量不足')).toBeInTheDocument()
    expect(screen.getByText('15 / 100')).toBeInTheDocument()
  })

  it('渲染服务占比与执行趋势', async () => {
    renderMetrics()

    await waitFor(() => {
      expect(screen.getByTestId('distribution-bar-text')).toBeInTheDocument()
    })
    expect(await screen.findByText('2026-10-29')).toBeInTheDocument()
    expect(screen.getByText(/20 次 · 成功 20 · 失败 0/)).toBeInTheDocument()
  })

  it('切换趋势周期重新拉取', async () => {
    renderMetrics()

    await screen.findByText('2026-10-29')
    fireEvent.click(screen.getByRole('tab', { name: '按周' }))

    await waitFor(() => {
      expect(getSuccessRateTrend).toHaveBeenCalledWith('week')
    })
  })

  it('后端统计降级时展示占位', async () => {
    vi.mocked(getOperationsOverview).mockResolvedValue({
      success: true,
      data: buildOverview({ executions: { error: 'stats down' }, capacity: { error: 'cap down' } }),
    })
    renderMetrics()

    expect(await screen.findByText('运营指标暂不可用（后端统计未返回数据）')).toBeInTheDocument()
    expect(screen.getByText('配额快照暂不可用')).toBeInTheDocument()
  })
})
