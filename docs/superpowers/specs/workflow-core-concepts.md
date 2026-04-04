# Workflow System Core Concepts

> 本文档定义工作流系统的核心概念、数据模型和术语。

## 1. 核心概念

### 1.1 Workflow Template（流程模板）

**定义**：可复用的业务逻辑单元，由节点和边组成的有向无环图（DAG）。

**特点**：
- 不包含触发器，纯业务逻辑
- 可被多个定时任务复用
- 有明确的归属者（owner_id）
- 可设置为公开或授权给特定用户

**生命周期**：
```
创建 → 配置节点 → 保存 → 关联定时任务 → 执行
```

### 1.2 Cron Job（定时任务）

**定义**：带有时间触发器的工作流执行单元，关联一个流程模板。

**特点**：
- 包含 cron 表达式（触发时间）
- 关联一个 workflow_template
- 记录执行历史（last_run_at, total_runs）
- 有明确的归属者

**与 Workflow Template 的关系**：
```
┌─────────────────┐         ┌─────────────────┐
│  Workflow       │ 1     * │   Cron Job      │
│  Template       │◄────────│                 │
│  (业务逻辑)      │         │  (触发器+关联)   │
└─────────────────┘         └─────────────────┘
```

一个流程模板可以被多个定时任务使用，不同任务可以有不同的触发频率。

### 1.3 Action Node（动作节点）

**定义**：执行具体操作的节点，统一调用内部服务方法。

**结构**：
```json
{
  "id": "node-1",
  "type": "action",
  "position": { "x": 100, "y": 100 },
  "data": {
    "label": "Image Generation",
    "config": {
      "service": "minimaxClient",
      "method": "imageGeneration",
      "args": [
        { "prompt": "a cat", "model": "image-01" }
      ]
    }
  }
}
```

**特点**：
- 统一的 `action` 类型，不再区分 text-generation、image-generation 等
- 通过 `service` + `method` 指定调用的服务方法
- `args` 支持模板变量引用其他节点输出

### 1.4 Logic Node（逻辑节点）

**定义**：控制流程执行逻辑的节点。

**类型**：

| 类型 | 作用 | 配置示例 |
|------|------|----------|
| `condition` | 条件判断 | `{"condition": "{{node1.output}} > 0"}` |
| `loop` | 循环执行 | `{"items": "{{node1.output}}", "maxIterations": 10}` |
| `transform` | 数据转换 | `{"transformType": "extract", "inputPath": "data.items"}` |

### 1.5 Service Node Registry（服务节点注册表）

**定义**：运行时管理所有可调用服务的注册中心。

**职责**：
- 注册服务实例（minimaxClient、db、capacityChecker 等）
- 提供服务方法调用接口
- 与权限系统配合，验证用户是否有权调用

**注册示例**：
```typescript
serviceRegistry.register({
  serviceName: 'minimaxClient',
  instance: minimaxClient,
  methods: [
    { name: 'chatCompletion', displayName: 'Text Generation', category: 'MiniMax API' },
    { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
  ]
})
```

---

## 2. 数据模型

### 2.1 实体关系图

```
┌───────────────────────┐
│    workflow_templates │
├───────────────────────┤      ┌───────────────────────┐
│ id                    │      │    workflow_permissions │
│ name                  │      ├───────────────────────┤
│ description           │      │ workflow_id (FK)      │
│ nodes_json (JSONB)    │──┐   │ user_id (FK)          │
│ edges_json (JSONB)    │  │   │ granted_by (FK)       │
│ owner_id (FK)         │  │   └───────────────────────┘
│ is_public             │  │
│ created_at            │  │   ┌───────────────────────┐
│ updated_at            │  │   │  service_node_permissions │
└───────────────────────┘  │   ├───────────────────────┤
                           │   │ service_name          │
                           │   │ method_name           │
                           │   │ display_name          │
                           │   │ category              │
                           │   │ min_role              │
                           │   │ is_enabled            │
                           │   └───────────────────────┘
                           │
                           │   ┌───────────────────────┐
                           └───│      cron_jobs        │
                               ├───────────────────────┤
                               │ id                    │
                               │ name                  │
                               │ cron_expression       │
                               │ workflow_id (FK)      │
                               │ owner_id (FK)         │
                               │ is_active             │
                               │ last_run_at           │
                               │ next_run_at           │
                               │ total_runs            │
                               │ total_failures        │
                               └───────────────────────┘
                                         │
                                         │
                               ┌───────────────────────┐
                               │   execution_logs      │
                               ├───────────────────────┤
                               │ id                    │
                               │ job_id (FK)           │
                               │ trigger_type          │
                               │ status                │
                               │ started_at            │
                               │ completed_at          │
                               │ duration_ms           │
                               │ tasks_executed        │
                               │ tasks_succeeded       │
                               │ tasks_failed          │
                               │ error_summary         │
                               └───────────────────────┘
                                         │
                                         │
                               ┌───────────────────────┐
                               │ execution_log_details │
                               ├───────────────────────┤
                               │ id                    │
                               │ log_id (FK)           │
                               │ node_id               │
                               │ node_type             │
                               │ service_name          │
                               │ method_name           │
                               │ input_payload (JSONB) │
                               │ output_result (JSONB) │
                               │ error_message         │
                               │ started_at            │
                               │ completed_at          │
                               │ duration_ms           │
                               └───────────────────────┘
```

### 2.2 表结构定义

#### workflow_templates

```sql
CREATE TABLE workflow_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes_json JSONB NOT NULL,       -- 节点数组
  edges_json JSONB NOT NULL,       -- 边数组
  owner_id VARCHAR(36) REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### cron_jobs

```sql
CREATE TABLE cron_jobs (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  workflow_id VARCHAR(36) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  owner_id VARCHAR(36) REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  total_failures INTEGER DEFAULT 0,
  timeout_ms INTEGER DEFAULT 300000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### service_node_permissions

```sql
CREATE TABLE service_node_permissions (
  id VARCHAR(36) PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  method_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  min_role VARCHAR(20) DEFAULT 'pro',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_name, method_name)
);
```

#### workflow_permissions

```sql
CREATE TABLE workflow_permissions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
  granted_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, user_id)
);
```

---

## 3. 节点类型定义

### 3.1 TypeScript 接口

```typescript
// 节点类型枚举
enum WorkflowNodeType {
  Action = 'action',
  Condition = 'condition',
  Loop = 'loop',
  Transform = 'transform',
}

// 基础节点接口
interface WorkflowNode {
  id: string
  type: WorkflowNodeType
  position: { x: number; y: number }
  data: {
    label: string
    config: Record<string, unknown>
  }
}

// 边接口
interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
}

// 工作流图
interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
```

### 3.2 各节点配置结构

#### Action Node

```typescript
interface ActionNodeConfig {
  service: string    // 服务名，如 'minimaxClient'
  method: string     // 方法名，如 'imageGeneration'
  args?: unknown[]   // 参数数组，支持模板变量
}
```

#### Condition Node

```typescript
interface ConditionNodeConfig {
  condition: string  // 条件表达式
  // 示例: "{{node1.output}} > 0"
  // 示例: "{{node1.output.status}} == success"
}
```

#### Loop Node

```typescript
interface LoopNodeConfig {
  items?: string           // 循环项来源
  maxIterations?: number   // 最大迭代次数
  condition?: string       // 终止条件（可选）
  subNodes?: WorkflowNode[] // 子节点定义（每次迭代执行）
  subEdges?: WorkflowEdge[] // 子节点间的边定义
  // 示例: items = "{{fetchTasks.output}}"
  // 示例: subNodes = [{ id: 'sub-1', type: 'action', data: { label: 'process', config: { service: 'svc', method: 'm', args: ['{{item}}'] } } }]
}
```

**Loop 节点执行行为**：
- 每次迭代时，`item` 变量被设置为当前循环项
- 子节点可通过 `{{item}}` 或 `{{item.field}}` 访问当前项
- 子节点按拓扑顺序执行
- `condition` 在每次迭代前评估，为 false 时终止循环
- 返回 `{ iterations: number, results: unknown[] }`

#### Transform Node

```typescript
interface TransformNodeConfig {
  transformType: 'extract' | 'map' | 'filter' | 'format'
  inputPath?: string       // 输入路径
  outputFormat?: string    // 输出格式
}
```

---

## 4. 执行流程

### 4.1 执行时序

```
Cron 触发
    │
    ▼
CronScheduler.executeJobTick()
    ├── 创建 execution_log (status=RUNNING)
    │
    ▼
WorkflowEngine.executeWorkflow(workflow_json, log_id)
    ├── 解析 workflow JSON
    ├── 拓扑排序确定执行顺序
    │
    ├── Node 1: action
    │   ├── 解析参数模板
    │   ├── 创建 execution_log_detail
    │   ├── ServiceNodeRegistry.call(service, method, args)
    │   └── 更新 execution_log_detail
    │
    ├── Node 2: condition
    │   └── 评估条件表达式
    │
    ├── Node 3: loop
    │   └── 迭代执行循环体
    │
    └── 返回 WorkflowResult
    │
    ▼
更新 execution_log (status=COMPLETED/FAILED)
更新 cron_job (last_run_at, total_runs)
WebSocket 推送执行结果
```

### 4.2 模板变量解析

节点配置支持引用其他节点的输出：

```json
{
  "service": "db",
  "method": "getPendingTasks",
  "args": [null, "{{checkQuota.output}}"]
}
```

解析规则：
- `{{nodeId}}` - 引用整个节点输出
- `{{nodeId.output}}` - 同上
- `{{nodeId.output.path.to.value}}` - 引用输出中的特定路径
- `{{nodeId.output.array[0]}}` - 引用数组元素

---

## 5. 权限模型

### 5.1 权限层级

```
┌─────────────────────────────────────────────────────────────┐
│                        Super Admin                          │
│  - 管理所有流程                                              │
│  - 管理服务节点权限                                          │
│  - 授权流程给其他用户                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Admin                                │
│  - 使用 admin 级别的服务节点                                 │
│  - 创建和管理自己的流程                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          Pro                                │
│  - 使用 pro 级别的服务节点                                   │
│  - 创建和管理自己的流程                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          User                               │
│  - 使用 user 级别的服务节点                                  │
│  - 创建和管理自己的流程                                      │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 权限检查点

| 操作 | 权限检查 |
|------|----------|
| 获取可用节点列表 | 按 min_role 过滤 |
| 创建/保存流程 | 验证每个 action 节点的 min_role |
| 获取流程列表 | 自己创建 + 被授权 + 公开 |
| 创建定时任务 | 验证是否有权使用该流程 |
| 执行流程 | 无权限检查（在配置阶段已验证） |

### 5.3 流程共享

**流程归属**：
- 创建者自动成为 owner
- owner 可以删除流程

**流程共享**：
- Super 可以将流程授权给其他用户
- Super 可以设置流程为公开（is_public=true）
- 被授权用户可以查看和使用流程
- 只有 owner 和 super 可以编辑流程

---

## 6. 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 流程模板 | Workflow Template | 可复用的业务逻辑单元（DAG） |
| 定时任务 | Cron Job | 带触发器的工作流执行单元 |
| 动作节点 | Action Node | 执行具体操作的节点 |
| 逻辑节点 | Logic Node | 控制流程逻辑的节点（condition/loop/transform） |
| 服务注册表 | Service Node Registry | 管理可调用服务的注册中心 |
| 节点权限 | Service Node Permission | 控制哪些角色可以使用某个服务方法 |
| 流程权限 | Workflow Permission | 控制用户对流程的访问权限 |
| 执行日志 | Execution Log | 记录一次工作流执行的完整信息 |
| 节点详情 | Execution Log Detail | 记录单个节点的执行详情 |