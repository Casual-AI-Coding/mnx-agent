import * as React from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CronJobsTab } from '../../components/cron/management/CronJobsTab'
import { TaskQueueTab } from '../../components/cron/management/TaskQueueTab'
import { ExecutionLogsTab } from '../../components/cron/management/ExecutionLogsTab'
import { DLQTable } from '../DeadLetterQueue/DLQTable'
import { TaskStatus, TriggerType } from '../../types/cron'

vi.mock('framer-motion', () => ({
  motion: { div: 'div' },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => (count > 0 ? [{ index: 0, start: 0, size: 56 }] : []),
    getTotalSize: () => count * 56,
    measureElement: vi.fn(),
  }),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <section className={className}>{children}</section>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/Input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/Select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button className={className}>{children}</button>
  ),
  SelectValue: () => <span />,
  SelectContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/shared/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}))

vi.mock('@/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}))

vi.mock('@/components/cron/management/CreateJobModal', () => ({
  CreateJobModal: () => null,
}))

vi.mock('@/components/cron/management/EditJobModal', () => ({
  EditJobModal: () => null,
}))

vi.mock('@/components/cron/management/ExecutionLogPanel', () => ({
  ExecutionLogPanel: () => null,
}))

vi.mock('@/components/shared/dateUtils', () => ({
  formatDate: () => 'date',
  formatDuration: () => '1s',
}))

vi.mock('@/lib/cron-utils', () => ({
  getCronDescription: () => 'every minute',
}))

vi.mock('@/themes/tokens', () => ({
  status: { success: { icon: 'text-success' } },
  taskStatus: {
    pending: { bg: 'bg-pending', text: 'text-pending' },
    running: { bg: 'bg-running', text: 'text-running' },
    completed: { bg: 'bg-completed', text: 'text-completed' },
  },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({ isHydrated: true }),
}))

vi.mock('@/stores/cronJobs', () => ({
  useCronJobsStore: () => ({
    jobs: [{
      id: 'job-1',
      name: 'Nightly job',
      description: 'A scheduled job',
      cronExpression: '* * * * *',
      timezone: 'UTC',
      isActive: true,
      workflowId: null,
      timeoutMs: null,
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
      lastRunAt: null,
      nextRunAt: null,
      totalRuns: 1,
      totalFailures: 0,
    }],
    loading: false,
    fetchJobs: vi.fn(),
    createJob: vi.fn(),
    updateJob: vi.fn(),
    deleteJob: vi.fn(),
    toggleJob: vi.fn(),
    runJobManually: vi.fn(),
  }),
}))

vi.mock('@/stores/taskQueue', () => ({
  useTaskQueueStore: () => ({
    tasks: [{
      id: 'task-1',
      jobId: 'job-1',
      taskType: 'text',
      payload: {},
      priority: 1,
      status: TaskStatus.Pending,
      retryCount: 0,
      maxRetries: 3,
      errorMessage: null,
      result: null,
      createdAt: '2026-07-15T00:00:00.000Z',
      startedAt: null,
      completedAt: null,
    }],
    loading: false,
    fetchTasks: vi.fn(),
    deleteTask: vi.fn(),
    updateTask: vi.fn(),
  }),
}))

vi.mock('@/stores/executionLogs', () => ({
  useExecutionLogsStore: () => ({
    logs: [{
      id: 'log-1',
      jobId: 'job-1',
      triggerType: TriggerType.Cron,
      status: TaskStatus.Completed,
      startedAt: '2026-07-15T00:00:00.000Z',
      completedAt: '2026-07-15T00:00:01.000Z',
      durationMs: 1000,
      tasksExecuted: 1,
      tasksSucceeded: 1,
      tasksFailed: 0,
      errorSummary: null,
      logDetail: null,
    }],
    logDetails: new Map(),
    loading: false,
    detailsLoading: new Set(),
    fetchLogs: vi.fn(),
    fetchLogDetails: vi.fn(),
  }),
}))

const findClassContaining = (container: HTMLElement, fragment: string): HTMLElement => {
  const element = Array.from(container.querySelectorAll<HTMLElement>('[class]')).find((node) =>
    node.getAttribute('class')?.includes(fragment)
  )
  if (!element) throw new Error(`未找到包含 ${fragment} 的元素`)
  return element
}

describe('Cron 管理移动端布局', () => {
  it('CronJobsTab 的固定列列表允许横向滚动且搜索区在小屏纵向排列', () => {
    const { container } = render(<CronJobsTab />)

    expect(findClassContaining(container, 'overflow-x-auto').className).toContain('overflow-x-auto')
    expect(findClassContaining(container, 'flex-col sm:flex-row').className).toContain('flex-col')
  })

  it('TaskQueueTab 的操作区允许在小屏换行', () => {
    const { container } = render(<TaskQueueTab />)

    expect(findClassContaining(container, 'flex-wrap items-center gap-3').className).toContain('flex-wrap')
  })

  it('ExecutionLogsTab 的操作区和日志摘要在小屏保持可收缩布局', () => {
    const { container } = render(<ExecutionLogsTab />)

    expect(findClassContaining(container, 'flex-wrap items-center gap-3').className).toContain('flex-wrap')
    expect(findClassContaining(container, 'flex-col sm:flex-row').className).toContain('flex-col')
  })
})

describe('DLQTable 移动端布局', () => {
  it('错误队列卡片的元数据与操作区允许换行', () => {
    const item = {
      id: 'dlq-1',
      originalTaskId: 'task-1',
      jobId: 'job-1',
      taskType: 'text',
      payload: { prompt: 'long prompt' },
      errorMessage: 'A long error message that remains readable on a narrow viewport',
      retryCount: 3,
      maxRetries: 3,
      failedAt: '2026-07-15T00:00:00.000Z',
      resolvedAt: null,
      resolution: null,
      createdAt: '2026-07-15T00:00:00.000Z',
    }
    const { container } = render(
      <DLQTable
        items={[item]}
        loading={false}
        selectedItems={new Set()}
        expandedItems={new Set()}
        filteredItems={[item]}
        onToggleSelection={vi.fn()}
        onToggleAllSelection={vi.fn()}
        onToggleExpansion={vi.fn()}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
        onViewDetails={vi.fn()}
      />
    )

    expect(findClassContaining(container, 'flex-wrap items-center gap-3').className).toContain('flex-wrap')
    expect(findClassContaining(container, 'flex-col sm:flex-row').className).toContain('flex-col')
  })
})
