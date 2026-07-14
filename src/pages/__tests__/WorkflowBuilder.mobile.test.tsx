import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkflowBuilderPage from '../WorkflowBuilder'

vi.mock('@/hooks/useBreakpoint', () => ({
  useIsMobile: vi.fn(),
}))

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ReactFlow: () => <div data-testid="react-flow" />,
  Controls: () => <div />,
  Background: () => <div />,
  MiniMap: () => <div />,
  Panel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  BackgroundVariant: { Dots: 'dots', Lines: 'lines', Cross: 'cross' },
  useNodesState: (initial: unknown) => [initial, vi.fn(), vi.fn()],
  useEdgesState: (initial: unknown) => [initial, vi.fn(), vi.fn()],
  useReactFlow: () => ({
    getNodes: () => [],
    setNodes: vi.fn(),
    getEdges: () => [],
    setEdges: vi.fn(),
    addNodes: vi.fn(),
    screenToFlowPosition: vi.fn(),
  }),
  addEdge: (edge: unknown) => edge,
  Handle: () => <div />,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    useSearchParams: () => [new URLSearchParams()],
  }
})

vi.mock('@/components/workflow/hooks/useWorkflowBuilder', () => ({
  useWorkflowBuilder: () => ({
    nodes: [],
    edges: [],
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeDoubleClick: vi.fn(),
    onPaneClick: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    executionId: null,
    executionStatus: null,
    nodeStatuses: new Map(),
    executionStartTime: null,
    isSubscribed: false,
    validationResult: null,
  }),
}))

import { useIsMobile } from '@/hooks/useBreakpoint'

describe('WorkflowBuilder — mobile fallback', () => {
  it('移动端（isMobile=true）渲染引导页，不加载 ReactFlow', () => {
    vi.mocked(useIsMobile).mockReturnValue(true)
    render(<WorkflowBuilderPage />)
    expect(screen.getByText('工作流构建器仅支持桌面端')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '前往定时任务' })).toHaveAttribute('href', '/cron')
    expect(screen.queryByText('react-flow')).toBeNull()
  })

  it('桌面端（isMobile=false）加载 ReactFlow 而非引导页', () => {
    vi.mocked(useIsMobile).mockReturnValue(false)
    render(<WorkflowBuilderPage />)
    expect(screen.queryByText('工作流构建器仅支持桌面端')).toBeNull()
  })
})