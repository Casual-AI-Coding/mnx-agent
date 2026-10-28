import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { OperationsCards } from '../OperationsCards'
import { ServiceDistribution } from '../ServiceDistribution'
import { RecentFailures } from '../RecentFailures'
import { SystemHealthStrip } from '../SystemHealthStrip'
import type {
  OperationsExecutionsStats,
  OperationsRecentFailure,
  OperationsDlqSummary,
  OperationsCapacity,
  OperationsHealth,
  OperationsSection,
} from '@/lib/api/stats'

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const stats: OperationsExecutionsStats = {
  totalExecutions: 42,
  successRate: 0.9,
  failureRate: 0.1,
  avgDuration: 3500,
  errorCount: 4,
}

const failures: OperationsRecentFailure[] = [
  {
    id: 'log-1',
    job_id: null,
    trigger_type: 'cron',
    status: 'failed',
    started_at: '2026-10-29T01:00:00',
    duration_ms: 1200,
    tasks_failed: 2,
    error_summary: '配额不足',
  },
]

const dlq: OperationsDlqSummary = {
  unresolvedCount: 3,
  recent: [{ id: 'dlq-1', task_type: 'image_generation', error_message: 'quota', failed_at: '2026-10-29T01:00:00' }],
}

const capacity: OperationsCapacity = {
  records: [
    { service_type: 'image', remaining_quota: 5, total_quota: 100, usage_ratio: 0.95, reset_at: null },
    { service_type: 'video', remaining_quota: 80, total_quota: 100, usage_ratio: 0.2, reset_at: null },
  ],
  atRisk: ['image'],
}

const health: OperationsHealth = {
  database: true,
  uptimeSeconds: 90061,
  pool: {
    pool: { totalCount: 10, idleCount: 8, waitingCount: 0 },
    status: 'healthy',
    warning: null,
    recommendation: null,
  },
}

describe('OperationsCards', () => {
  it('渲染四个运营指标卡', () => {
    renderWithRouter(<OperationsCards executions={stats} />)

    expect(screen.getByText('总执行次数')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('成功率')).toBeInTheDocument()
    expect(screen.getByText('90.0%')).toBeInTheDocument()
    expect(screen.getByText('失败率')).toBeInTheDocument()
    expect(screen.getByText('平均耗时')).toBeInTheDocument()
    expect(screen.getByText('3.5 秒')).toBeInTheDocument()
  })

  it('板块降级时展示错误提示', () => {
    const degraded: OperationsSection<OperationsExecutionsStats> = { error: 'stats down' }
    renderWithRouter(<OperationsCards executions={degraded} />)

    expect(screen.getByText(/运营指标暂不可用：stats down/)).toBeInTheDocument()
  })

  it('加载中展示占位文案', () => {
    renderWithRouter(<OperationsCards executions={null} loading />)

    expect(screen.getByText('正在加载运营指标...')).toBeInTheDocument()
  })
})

describe('ServiceDistribution', () => {
  it('按占比渲染服务分布条', () => {
    renderWithRouter(
      <ServiceDistribution distribution={[{ type: 'text', count: 7 }, { type: 'image', count: 3 }]} />
    )

    expect(screen.getByText('服务分布')).toBeInTheDocument()
    expect(screen.getByTestId('distribution-bar-text')).toBeInTheDocument()
    expect(screen.getByText(/7 · 70%/)).toBeInTheDocument()
  })

  it('空分布展示引导文案', () => {
    renderWithRouter(<ServiceDistribution distribution={[]} />)

    expect(screen.getByText(/还没有执行记录/)).toBeInTheDocument()
  })
})

describe('RecentFailures', () => {
  it('渲染失败任务明细', () => {
    renderWithRouter(<RecentFailures failures={failures} />)

    expect(screen.getByText('最近失败任务')).toBeInTheDocument()
    expect(screen.getByText('配额不足')).toBeInTheDocument()
    expect(screen.getByText(/定时 · 失败 2 个任务 · 耗时 1.2 秒/)).toBeInTheDocument()
  })

  it('无失败时展示正常提示', () => {
    renderWithRouter(<RecentFailures failures={[]} />)

    expect(screen.getByText(/最近没有失败任务/)).toBeInTheDocument()
  })
})

describe('SystemHealthStrip', () => {
  it('渲染健康状态、死信计数与容量风险', () => {
    renderWithRouter(<SystemHealthStrip health={health} dlq={dlq} capacity={capacity} />)

    expect(screen.getByText('系统健康')).toBeInTheDocument()
    expect(screen.getByText('连接正常')).toBeInTheDocument()
    expect(screen.getByText(/1 天 1 小时/)).toBeInTheDocument()
    expect(screen.getByText('8/10 空闲')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('条待处理死信任务')).toBeInTheDocument()
    expect(screen.getByText('image')).toBeInTheDocument()
  })

  it('容量充足时展示正常文案', () => {
    renderWithRouter(
      <SystemHealthStrip
        health={health}
        dlq={dlq}
        capacity={{ records: capacity.records, atRisk: [] }}
      />
    )

    expect(screen.getByText('各服务容量充足')).toBeInTheDocument()
  })

  it('板块降级时展示不可用提示', () => {
    renderWithRouter(
      <SystemHealthStrip
        health={{ error: 'health down' }}
        dlq={{ error: 'dlq down' }}
        capacity={{ error: 'capacity down' }}
      />
    )

    expect(screen.getByText('数据暂不可用：health down')).toBeInTheDocument()
    expect(screen.getByText('数据暂不可用：dlq down')).toBeInTheDocument()
    expect(screen.getByText('数据暂不可用：capacity down')).toBeInTheDocument()
  })
})
