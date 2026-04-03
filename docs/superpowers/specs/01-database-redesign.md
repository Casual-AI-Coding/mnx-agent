# SP-1: Database Redesign

> 本方案定义数据库表结构重构，删除旧表并创建新表。

## 1. 目标

- 删除不再需要的表
- 创建符合新设计的表
- 初始化必要的基础数据
- 更新 TypeScript 类型定义

## 2. 变更清单

### 2.1 删除的表

| 表名 | 原因 |
|------|------|
| `workflow_templates` (旧) | 结构不符合新设计，需重建 |
| `job_tags` | 当前未使用 |
| `job_dependencies` | 当前未使用 |
| `webhook_configs` | 当前未使用 |
| `webhook_deliveries` | 当前未使用 |
| `dead_letter_queue` | 当前未使用 |

### 2.2 修改的表

| 表名 | 变更内容 |
|------|----------|
| `cron_jobs` | 添加 `workflow_id` 外键，移除 `workflow_json` |

### 2.3 新增的表

| 表名 | 用途 |
|------|------|
| `workflow_templates` (新) | 流程模板 |
| `workflow_permissions` | 流程授权 |
| `service_node_permissions` | 服务节点权限 |

---

## 3. 迁移脚本

### 3.1 Down Migration（删除旧表）

```sql
-- 删除不再使用的表
DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhook_configs;
DROP TABLE IF EXISTS dead_letter_queue;
DROP TABLE IF EXISTS job_dependencies;
DROP TABLE IF EXISTS job_tags;

-- 删除旧的 workflow_templates
DROP TABLE IF EXISTS workflow_templates;

-- 删除 cron_jobs 表（后续重建）
DROP TABLE IF EXISTS execution_log_details;
DROP TABLE IF EXISTS execution_logs;
DROP TABLE IF EXISTS cron_jobs;
```

### 3.2 Up Migration（创建新表）

```sql
-- ============================================
-- Workflow Templates
-- ============================================
CREATE TABLE workflow_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  nodes_json JSONB NOT NULL,
  edges_json JSONB NOT NULL,
  owner_id VARCHAR(36) REFERENCES users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflow_templates_owner ON workflow_templates(owner_id);
CREATE INDEX idx_workflow_templates_is_public ON workflow_templates(is_public);

-- ============================================
-- Workflow Permissions
-- ============================================
CREATE TABLE workflow_permissions (
  id VARCHAR(36) PRIMARY KEY,
  workflow_id VARCHAR(36) NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, user_id)
);

CREATE INDEX idx_workflow_permissions_workflow ON workflow_permissions(workflow_id);
CREATE INDEX idx_workflow_permissions_user ON workflow_permissions(user_id);

-- ============================================
-- Service Node Permissions
-- ============================================
CREATE TABLE service_node_permissions (
  id VARCHAR(36) PRIMARY KEY,
  service_name VARCHAR(100) NOT NULL,
  method_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  min_role VARCHAR(20) NOT NULL DEFAULT 'pro',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_name, method_name)
);

CREATE INDEX idx_service_node_permissions_service ON service_node_permissions(service_name);
CREATE INDEX idx_service_node_permissions_category ON service_node_permissions(category);

-- ============================================
-- Cron Jobs
-- ============================================
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
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cron_jobs_owner ON cron_jobs(owner_id);
CREATE INDEX idx_cron_jobs_workflow ON cron_jobs(workflow_id);
CREATE INDEX idx_cron_jobs_active ON cron_jobs(is_active);
CREATE INDEX idx_cron_jobs_next_run ON cron_jobs(next_run_at);

-- ============================================
-- Execution Logs
-- ============================================
CREATE TABLE execution_logs (
  id VARCHAR(36) PRIMARY KEY,
  job_id VARCHAR(36) REFERENCES cron_jobs(id) ON DELETE CASCADE,
  trigger_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  duration_ms INTEGER,
  tasks_executed INTEGER DEFAULT 0,
  tasks_succeeded INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,
  error_summary TEXT
);

CREATE INDEX idx_execution_logs_job ON execution_logs(job_id);
CREATE INDEX idx_execution_logs_status ON execution_logs(status);
CREATE INDEX idx_execution_logs_started_at ON execution_logs(started_at DESC);

-- ============================================
-- Execution Log Details
-- ============================================
CREATE TABLE execution_log_details (
  id VARCHAR(36) PRIMARY KEY,
  log_id VARCHAR(36) NOT NULL REFERENCES execution_logs(id) ON DELETE CASCADE,
  node_id VARCHAR(50),
  node_type VARCHAR(50),
  service_name VARCHAR(100),
  method_name VARCHAR(100),
  input_payload JSONB,
  output_result JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_ms INTEGER
);

CREATE INDEX idx_execution_log_details_log ON execution_log_details(log_id);
CREATE INDEX idx_execution_log_details_node ON execution_log_details(node_id);
```

### 3.3 初始化数据

```sql
-- 初始化服务节点权限
INSERT INTO service_node_permissions (id, service_name, method_name, display_name, category, min_role, is_enabled) VALUES
  -- MiniMax API
  ('snp-001', 'minimaxClient', 'chatCompletion', 'Text Generation', 'MiniMax API', 'pro', true),
  ('snp-002', 'minimaxClient', 'imageGeneration', 'Image Generation', 'MiniMax API', 'pro', true),
  ('snp-003', 'minimaxClient', 'videoGeneration', 'Video Generation', 'MiniMax API', 'pro', true),
  ('snp-004', 'minimaxClient', 'textToAudioSync', 'Voice Sync', 'MiniMax API', 'pro', true),
  ('snp-005', 'minimaxClient', 'textToAudioAsync', 'Voice Async', 'MiniMax API', 'pro', true),
  ('snp-006', 'minimaxClient', 'musicGeneration', 'Music Generation', 'MiniMax API', 'pro', true),
  
  -- Database
  ('snp-010', 'db', 'getPendingTasks', 'Get Pending Tasks', 'Database', 'admin', true),
  ('snp-011', 'db', 'createMediaRecord', 'Create Media Record', 'Database', 'admin', true),
  ('snp-012', 'db', 'updateTask', 'Update Task', 'Database', 'admin', true),
  ('snp-013', 'db', 'getTaskById', 'Get Task By ID', 'Database', 'admin', true),
  
  -- Capacity
  ('snp-020', 'capacityChecker', 'getRemainingCapacity', 'Get Remaining Capacity', 'Capacity', 'pro', true),
  ('snp-021', 'capacityChecker', 'hasCapacity', 'Check Has Capacity', 'Capacity', 'pro', true),
  ('snp-022', 'capacityChecker', 'getSafeExecutionLimit', 'Get Safe Execution Limit', 'Capacity', 'pro', true),
  
  -- Media Storage
  ('snp-030', 'mediaStorage', 'saveMediaFile', 'Save Media File', 'Media Storage', 'pro', true),
  ('snp-031', 'mediaStorage', 'saveFromUrl', 'Save From URL', 'Media Storage', 'pro', true);
```

---

## 4. TypeScript 类型更新

### 4.1 更新 `server/database/types.ts`

```typescript
// 新增类型

export interface WorkflowTemplate {
  id: string
  name: string
  description: string | null
  nodes_json: string
  edges_json: string
  owner_id: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowPermission {
  id: string
  workflow_id: string
  user_id: string
  granted_by: string | null
  created_at: string
}

export interface ServiceNodePermission {
  id: string
  service_name: string
  method_name: string
  display_name: string
  category: string
  min_role: string
  is_enabled: boolean
  created_at: string
}

// 修改类型

export interface CronJob {
  id: string
  name: string
  description: string | null
  cron_expression: string
  timezone: string
  workflow_id: string | null  // 新增：关联流程模板
  owner_id: string | null     // 新增：归属者
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_failures: number
  timeout_ms: number
  created_at: string
  updated_at: string
}

export interface ExecutionLogDetail {
  id: string
  log_id: string
  node_id: string | null
  node_type: string | null
  service_name: string | null   // 新增
  method_name: string | null    // 新增
  input_payload: string | null
  output_result: string | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
}

// 删除类型

// 移除: JobTag, JobDependency, WebhookConfig, WebhookDelivery, DeadLetterItem
```

### 4.2 新增 workflow types

```typescript
// server/types/workflow.ts

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

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

// Action 节点配置
export interface ActionNodeConfig {
  service: string
  method: string
  args?: unknown[]
}

// Condition 节点配置
export interface ConditionNodeConfig {
  condition: string
}

// Loop 节点配置
export interface LoopNodeConfig {
  items?: string
  maxIterations?: number
  condition?: string
}

// Transform 节点配置
export interface TransformNodeConfig {
  transformType: 'extract' | 'map' | 'filter' | 'format'
  inputPath?: string
  outputFormat?: string
}
```

---

## 5. 实施步骤

1. **备份数据库**（可选，当前数据可删除）
   ```bash
   pg_dump minimax > backup_$(date +%Y%m%d).sql
   ```

2. **执行 Down Migration**
   - 删除旧表

3. **执行 Up Migration**
   - 创建新表

4. **初始化数据**
   - 插入 service_node_permissions 初始数据

5. **更新 TypeScript 类型**
   - 更新 `server/database/types.ts`
   - 创建 `server/types/workflow.ts`

6. **验证**
   - 检查表结构
   - 检查索引
   - 检查初始数据

---

## 6. 验证检查清单

- [ ] 所有旧表已删除
- [ ] 新表结构正确
- [ ] 索引已创建
- [ ] 初始数据已插入
- [ ] TypeScript 类型已更新
- [ ] 无类型错误