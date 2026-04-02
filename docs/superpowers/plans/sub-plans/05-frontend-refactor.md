# SP-5: Frontend Refactor

> 本方案重构前端组件，适配新的工作流系统。

## 1. 目标

- 删除 trigger 节点类型
- 统一 ActionNode 组件
- 实现动态 Node Palette
- 实现权限管理 UI
- 适配新的 API

## 2. 变更内容

### 2.1 删除的组件/代码

| 文件/组件 | 说明 |
|-----------|------|
| `TriggerNode` | 删除 trigger 节点组件 |
| `TextGenNode` | 删除，统一用 ActionNode |
| `ImageGenNode` | 删除，统一用 ActionNode |
| `VideoGenNode` | 删除，统一用 ActionNode |
| `VoiceSyncNode` | 删除，统一用 ActionNode |
| `VoiceAsyncNode` | 删除，统一用 ActionNode |
| `MusicGenNode` | 删除，统一用 ActionNode |

### 2.2 新增/修改的组件

| 组件 | 说明 |
|------|------|
| `ActionNode` | 统一的动作节点组件 |
| `ActionConfigPanel` | Action 节点配置面板 |
| `NodePalette` | 动态加载可用节点 |
| `WorkflowPermissionManager` | 流程授权管理（Super） |
| `ServiceNodePermissionManager` | 节点权限管理（Super） |

## 3. 类型定义更新

```typescript
// src/types/workflow.ts

export enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
}

export interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

export interface ActionNodeConfig {
  service: string
  method: string
  args?: unknown[]
}

// API 响应类型
export interface AvailableActionNode {
  id: string
  service: string
  method: string
  label: string
  minRole: string
}

export interface GroupedActionNodes {
  [category: string]: AvailableActionNode[]
}
```

## 4. 核心组件实现

### 4.1 ActionNode 组件

```tsx
// src/components/workflow/nodes/ActionNode.tsx

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActionNodeData {
  label: string
  config: {
    service: string
    method: string
    args?: unknown[]
  }
}

function ActionNodeComponent({ data, selected }: NodeProps<ActionNodeData>) {
  const { label, config } = data
  
  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 bg-white shadow-sm',
        selected ? 'border-primary' : 'border-gray-300'
      )}
    >
      {/* 输入连接点 */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      
      {/* 节点内容 */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-sm">{label}</span>
        </div>
        
        {/* 服务/方法信息 */}
        <div className="mt-2 text-xs text-gray-500">
          <div>{config.service}</div>
          <div className="text-gray-400">{config.method}</div>
        </div>
      </div>
      
      {/* 输出连接点 */}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  )
}

export const ActionNode = memo(ActionNodeComponent)
```

### 4.2 ActionConfigPanel 配置面板

```tsx
// src/components/workflow/config-panels/ActionConfigPanel.tsx

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActionNodeConfig, GroupedActionNodes } from '@/types/workflow'

interface ActionConfigPanelProps {
  config: ActionNodeConfig
  onChange: (config: ActionNodeConfig) => void
}

export function ActionConfigPanel({ config, onChange }: ActionConfigPanelProps) {
  const [availableNodes, setAvailableNodes] = useState<GroupedActionNodes>({})
  const [loading, setLoading] = useState(true)

  // 加载可用节点
  useEffect(() => {
    fetch('/api/workflows/available-actions')
      .then(r => r.json())
      .then(data => {
        setAvailableNodes(data.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load available actions:', err)
        setLoading(false)
      })
  }, [])

  // 获取当前选中的服务的方法列表
  const availableMethods = config.service 
    ? availableNodes[config.service]?.map(n => n.method) || []
    : []

  // 获取方法签名（用于动态渲染参数输入）
  // TODO: 从后端获取方法签名信息

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="space-y-4">
      {/* 服务选择 */}
      <div>
        <Label>Service</Label>
        <Select
          value={config.service}
          onValueChange={(service) => onChange({ ...config, service, method: '', args: [] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service" />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(availableNodes).map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 方法选择 */}
      {config.service && (
        <div>
          <Label>Method</Label>
          <Select
            value={config.method}
            onValueChange={(method) => onChange({ ...config, method, args: [] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {availableNodes[config.service]?.map(node => (
                <SelectItem key={node.method} value={node.method}>
                  {node.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 参数配置 */}
      {/* TODO: 根据方法签名动态渲染参数输入 */}
    </div>
  )
}
```

### 4.3 NodePalette 动态加载

```tsx
// src/components/workflow/NodePalette.tsx

import { useState, useEffect } from 'react'
import { DragEvent } from 'react'
import { 
  MessageSquare, 
  Image, 
  Video, 
  Mic, 
  Music,
  Database,
  Gauge,
  Save,
  GitBranch,
  Repeat,
  ArrowLeftRight,
  Wrench,
} from 'lucide-react'
import { GroupedActionNodes } from '@/types/workflow'

const categoryIcons: Record<string, typeof MessageSquare> = {
  'MiniMax API': MessageSquare,
  'Database': Database,
  'Capacity': Gauge,
  'Media Storage': Save,
  'Logic': GitBranch,
}

export function NodePalette() {
  const [availableNodes, setAvailableNodes] = useState<GroupedActionNodes>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workflows/available-actions')
      .then(r => r.json())
      .then(data => {
        setAvailableNodes(data.data)
        setLoading(false)
      })
  }, [])

  const onDragStart = (event: DragEvent, nodeType: string, config: Record<string, unknown>) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: nodeType,
      config,
    }))
    event.dataTransfer.effectAllowed = 'move'
  }

  if (loading) {
    return <div className="p-4 text-sm">Loading nodes...</div>
  }

  return (
    <div className="p-4 space-y-6">
      {/* 逻辑节点（固定） */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-gray-600">Logic</h3>
        <div className="space-y-2">
          {/* Condition */}
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'condition', {})}
            className="flex items-center gap-2 p-2 rounded border bg-white cursor-grab hover:bg-gray-50"
          >
            <GitBranch className="h-4 w-4" />
            <span className="text-sm">Condition</span>
          </div>
          
          {/* Loop */}
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'loop', {})}
            className="flex items-center gap-2 p-2 rounded border bg-white cursor-grab hover:bg-gray-50"
          >
            <Repeat className="h-4 w-4" />
            <span className="text-sm">Loop</span>
          </div>
          
          {/* Transform */}
          <div
            draggable
            onDragStart={(e) => onDragStart(e, 'transform', {})}
            className="flex items-center gap-2 p-2 rounded border bg-white cursor-grab hover:bg-gray-50"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="text-sm">Transform</span>
          </div>
        </div>
      </div>

      {/* 动态加载的 Action 节点 */}
      {Object.entries(availableNodes).map(([category, nodes]) => {
        const Icon = categoryIcons[category] || Wrench
        return (
          <div key={category}>
            <h3 className="text-sm font-semibold mb-2 text-gray-600">{category}</h3>
            <div className="space-y-2">
              {nodes.map(node => (
                <div
                  key={`${node.service}.${node.method}`}
                  draggable
                  onDragStart={(e) => onDragStart(e, 'action', {
                    service: node.service,
                    method: node.method,
                    args: [],
                  })}
                  className="flex items-center gap-2 p-2 rounded border bg-white cursor-grab hover:bg-gray-50"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

### 4.4 WorkflowBuilder 更新

```tsx
// src/pages/WorkflowBuilder.tsx

import { useCallback } from 'react'
import ReactFlow, { 
  NodeTypes, 
  OnNodesChange, 
  OnEdgesChange,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { ActionNode } from '@/components/workflow/nodes/ActionNode'
import { ConditionNode } from '@/components/workflow/nodes/ConditionNode'
import { LoopNode } from '@/components/workflow/nodes/LoopNode'
import { TransformNode } from '@/components/workflow/nodes/TransformNode'
import { NodePalette } from '@/components/workflow/NodePalette'
import { ConfigPanel } from '@/components/workflow/ConfigPanel'

const nodeTypes: NodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  loop: LoopNode,
  transform: TransformNode,
}

export function WorkflowBuilder() {
  const { nodes, edges, addNode, updateNode } = useWorkflowStore()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    
    const data = JSON.parse(event.dataTransfer.getData('application/reactflow'))
    const position = {
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    }
    
    const newNode = {
      id: `node-${Date.now()}`,
      type: data.type,
      position,
      data: {
        label: data.config.label || data.type,
        config: data.config,
      },
    }
    
    addNode(newNode)
  }, [addNode])

  return (
    <div className="flex h-full">
      {/* 左侧节点面板 */}
      <div className="w-64 border-r bg-gray-50">
        <NodePalette />
      </div>

      {/* 中间画布 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
        >
          {/* ... */}
        </ReactFlow>
      </div>

      {/* 右侧配置面板 */}
      {selectedNode && (
        <div className="w-80 border-l bg-white">
          <ConfigPanel 
            node={nodes.find(n => n.id === selectedNode)!}
            onChange={(config) => updateNode(selectedNode, { data: { ...nodes.find(n => n.id === selectedNode)!.data, config } })}
          />
        </div>
      )}
    </div>
  )
}
```

## 5. 流程管理页面更新

### 5.1 流程列表页

```tsx
// src/pages/WorkflowList.tsx

export function WorkflowList() {
  const [workflows, setWorkflows] = useState([])

  useEffect(() => {
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => setWorkflows(data.data))
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <Link to="/workflows/new">
          <Button>Create Workflow</Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {workflows.map(workflow => (
          <WorkflowCard key={workflow.id} workflow={workflow} />
        ))}
      </div>
    </div>
  )
}
```

### 5.2 定时任务创建页

```tsx
// src/pages/CronJobCreate.tsx

export function CronJobCreate() {
  const [workflows, setWorkflows] = useState([])
  const [selectedWorkflow, setSelectedWorkflow] = useState('')
  const [cronExpression, setCronExpression] = useState('')

  useEffect(() => {
    // 获取可用的流程列表
    fetch('/api/workflows')
      .then(r => r.json())
      .then(data => setWorkflows(data.data))
  }, [])

  const handleSubmit = async () => {
    const res = await fetch('/api/cron/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Job',
        cron_expression: cronExpression,
        workflow_id: selectedWorkflow,
      }),
    })

    if (res.ok) {
      // 跳转到任务列表
    }
  }

  return (
    <div>
      <h1>Create Cron Job</h1>
      
      <div>
        <Label>Select Workflow</Label>
        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a workflow" />
          </SelectTrigger>
          <SelectContent>
            {workflows.map(w => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Cron Expression</Label>
        <Input 
          value={cronExpression}
          onChange={(e) => setCronExpression(e.target.value)}
          placeholder="0 30 23 * * *"
        />
      </div>

      <Button onClick={handleSubmit}>Create Job</Button>
    </div>
  )
}
```

## 6. 实施步骤

1. 更新类型定义 `src/types/workflow.ts`
2. 创建 `ActionNode` 组件
3. 创建 `ActionConfigPanel` 组件
4. 更新 `NodePalette` 组件
5. 更新 `WorkflowBuilder` 页面
6. 删除旧的节点组件
7. 更新流程管理页面
8. 测试功能

## 7. 验证检查清单

- [ ] 类型定义更新完成
- [ ] ActionNode 组件实现
- [ ] ActionConfigPanel 实现
- [ ] NodePalette 动态加载
- [ ] 旧节点组件已删除
- [ ] WorkflowBuilder 更新
- [ ] 流程管理页面更新
- [ ] 功能测试通过