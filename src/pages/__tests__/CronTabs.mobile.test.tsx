import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CronManagement from '../CronManagement'

vi.mock('@/hooks/useCronJobsWebSocket', () => ({
  useCronJobsWebSocket: vi.fn(),
}))

vi.mock('@/hooks/useTaskQueueWebSocket', () => ({
  useTaskQueueWebSocket: vi.fn(),
}))

vi.mock('@/hooks/useExecutionLogsWebSocket', () => ({
  useExecutionLogsWebSocket: vi.fn(),
}))

vi.mock('@/components/cron/management', () => ({
  CronJobsTab: () => <div>jobs</div>,
  TaskQueueTab: () => <div>queue</div>,
  ExecutionLogsTab: () => <div>logs</div>,
}))

const findClassContaining = (container: HTMLElement, fragment: string): HTMLElement => {
  const element = Array.from(container.querySelectorAll<HTMLElement>('[class]')).find((node) =>
    node.getAttribute('class')?.includes(fragment)
  )
  if (!element) throw new Error(`未找到包含 ${fragment} 的元素`)
  return element
}

describe('CronManagement 移动端标签页', () => {
  it('标签页列表在窄屏限制宽度并允许横向滚动', () => {
    const { container } = render(<CronManagement />)

    const tabsViewport = findClassContaining(container, 'overflow-x-auto')

    expect(tabsViewport.className).toContain('max-w-full')
  })
})
