# Workflow System UX Redesign - Design Specification

> 本文档定义工作流系统（服务执行节点-流程编排-定时调度）的用户体验优化设计规格。

## 1. 问题分析

### 1.1 用户动线现状

```
当前用户动线（发现 → 配置 → 执行 → 监控）:

[发现] ────→ [配置] ────→ [执行] ────→ [监控]
   │            │            │            │
   │            │            │            └── 手动刷新
   │            │            │                原始日志
   │            │            │                无实时状态
   │            │            │
   │            │            └── 需跳转CronManagement
   │            │                无"测试运行"按钮
   │            │                无即时反馈
   │            │
   │            └── 技术门槛高
   │                模板语法无说明
   │                JSON配置易出错
   │                无数据预览
   │
   └── 无模板市场
       无浏览发现
       需已知ID
```

### 1.2 核心痛点总结

| 阶段 | 痛点 | 严重程度 | 影响 |
|------|------|----------|------|
| **发现** | 无模板市场/浏览页面 | 🔴 高 | 用户无法发现现有工作流 |
| **发现** | TemplateSelectorModal需已知ID | 🔴 高 | 新用户门槛高 |
| **配置** | Action节点需技术知识(service/method/args) | 🔴 高 | 非技术用户无法使用 |
| **配置** | 模板语法`{{nodeId.output}}`无视觉说明 | 🔴 高 | 用户不理解数据流 |
| **配置** | Transform节点mapping是原始JSON | 🟡 中 | 复杂映射易出错 |
| **配置** | 无输入/输出预览 | 🔴 高 | 执行前无法验证 |
| **执行** | Builder工具栏无"运行"按钮 | 🔴 高 | 必须创建Cron Job才能运行 |
| **执行** | WebSocket存在但前端未使用 | 🔴 严重 | 无实时状态更新 |
| **执行** | 手动刷新才能看到状态变化 | 🔴 严重 | 体验割裂 |
| **监控** | 执行日志是原始JSON | 🟡 中 | 无视觉化回放 |
| **监控** | 节点输出未存储/显示 | 🟡 中 | 无法检查中间结果 |

### 1.3 关键发现：WebSocket基础设施存在但未集成

```
现状:
┌─────────────────────────────────────────────────────────────┐
│  Server                                                      │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │ QueueProcessor  │───▶│ WebSocketService.emitTaskXxx() │ │
│  └─────────────────┘    └──────────────┬──────────────────┘ │
│                                         │                    │
│                                         ▼                    │
│                          /ws/cron (broadcasts events)        │
└─────────────────────────────────────────┬───────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────┼───────────────────┐
│  Browser                                │                    │
│  ┌─────────────────┐    ┌──────────────▼──────────────────┐ │
│  │ useWebSocket    │◀───│ ReconnectingWebSocket client    │ │
│  └────────┬────────┘    └─────────────────────────────────┘ │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │ showEventToast  │ ◀── 仅显示Toast，不更新Store！         │
│  └─────────────────┘                                        │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ taskQueue Store │    │ executionLogs   │ ◀── 手动刷新    │
│  └─────────────────┘    └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘

问题: WebSocket事件 → Toast通知 ❌ Store更新
```

---

## 2. 设计目标

### 2.1 优化后的用户动线

```
优化后的用户动线:

[发现] ────→ [配置] ────→ [测试] ────→ [执行] ────→ [监控]
   │            │            │            │            │
   │            │            │            │            └── ✅ 实时状态
   │            │            │            │                ✅ 可视化回放
   │            │            │            │                ✅ 节点输出检查
   │            │            │            │
   │            │            │            └── ✅ 一键调度
   │            │            │                ✅ 即时反馈
   │            │            │
   │            │            └── ✅ 测试运行
   │            │                ✅ 示例数据注入
   │            │                ✅ 输出预览
   │            │
   │            └── ✅ 可视化数据流
   │                ✅ 表单化配置
   │                ✅ 实时验证
   │
   └── ✅ 模板市场
       ✅ 分类浏览
       ✅ 预览截图
```

### 2.2 设计原则

1. **低门槛**: 非技术用户也能配置工作流
2. **即时反馈**: 所有操作提供视觉反馈
3. **实时透明**: 执行状态实时可见
4. **可调试性**: 中间结果可检查
5. **引导式体验**: 从发现到运行全程引导

---

## 3. 核心设计方案

### 3.1 方案一：WebSocket实时集成

**目标**: 将现有WebSocket基础设施与Zustand Store连接

**实现**:
```typescript
// src/stores/taskQueue.ts 添加WebSocket事件处理
import { useWebSocket } from '@/hooks/useWebSocket'

// 在Store初始化时订阅WebSocket事件
const subscribeToWebSocket = () => {
  const { on } = useWebSocket.getState()
  
  on('task_created', (task) => {
    set(state => ({ tasks: [task, ...state.tasks] }))
  })
  
  on('task_completed', (task) => {
    set(state => ({
      tasks: state.tasks.map(t => t.id === task.id ? task : t)
    }))
  })
  
  on('task_failed', (task) => {
    set(state => ({
      tasks: state.tasks.map(t => t.id === task.id ? task : t)
    }))
  })
}
```

**影响范围**:
- `src/stores/taskQueue.ts` - 添加事件订阅
- `src/stores/executionLogs.ts` - 添加事件订阅
- `src/stores/cronJobs.ts` - 添加事件订阅
- `src/hooks/useWebSocket.ts` - 扩展事件类型

### 3.2 方案二：测试运行模式

**目标**: 在WorkflowBuilder中添加"测试运行"功能，无需创建Cron Job

**实现**:
1. 后端新增 `/workflows/:id/test-run` API
2. 支持注入测试数据（替代实际API调用）
3. 返回节点级别的执行结果
4. 前端显示测试输出预览

**API设计**:
```typescript
POST /workflows/:id/test-run
{
  "testData": {
    "node-1": { "mockResponse": {...} },
    "node-2": { "mockInput": {...} }
  },
  "dryRun": true // 不实际调用外部API
}

Response:
{
  "success": true,
  "execution": {
    "nodes": [
      { "id": "node-1", "status": "completed", "output": {...} },
      { "id": "node-2", "status": "completed", "output": {...} }
    ],
    "duration": 1234
  }
}
```

### 3.3 方案三：可视化数据流

**目标**: 用可视化方式展示节点间的数据传递

**实现**:
1. 边(edge)上显示数据类型图标
2. 点击节点显示输入/输出预览面板
3. 数据映射可视化（类似Tableau Prep）
4. 模板变量自动补全

**UI设计**:
```
┌──────────────────────────────────────────────────────────┐
│  [Action Node: 文本生成]          ───────▶  [输出预览]   │
│                                                           │
│  输入: { prompt: "{{input.topic}}" }                     │
│                          │                                │
│                          ▼                                │
│           ┌────────────────────────────┐                 │
│           │  数据来源: [Input Node]     │                 │
│           │  值: "AI技术发展趋势"       │                 │
│           └────────────────────────────┘                 │
│                                                           │
│  输出: { text: "根据最新研究..." }  ──▶ [复制] [作为输入] │
└──────────────────────────────────────────────────────────┘
```

### 3.4 方案四：模板市场

**目标**: 提供工作流模板浏览和发现功能

**实现**:
1. 新增 `/workflow-marketplace` 页面
2. 模板分类（文本处理、图像生成、视频制作、数据分析）
3. 预览截图/动画
4. 一键克隆到本地
5. 社区评分/评论（可选）

**页面结构**:
```
/workflow-marketplace
├── 搜索栏 + 分类筛选
├── 热门模板卡片网格
│   ├── 缩略图
│   ├── 名称 + 描述
│   ├── 节点数量
│   ├── 使用次数
│   └── [使用模板] 按钮
└── 模板详情弹窗
    ├── 流程预览(React Flow只读)
    ├── 节点说明
    └── [克隆到我的工作流]
```

### 3.5 方案五：Cron表达式可视化构建器

**目标**: 用可视化方式创建和编辑Cron表达式

**实现**:
1. 预设选项（每天、每周、每月、自定义）
2. 时间选择器
3. 日历预览（显示未来5次执行时间）
4. 自然语言描述

**UI设计**:
```
┌──────────────────────────────────────────────────────────┐
│  调度设置                                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ○ 每天   ○ 每周   ○ 每月   ● 自定义                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  自定义:                                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ 分钟│ │ 小时│ │ 日期│ │ 月份│ │ 周几│              │
│  │  0  │ │  9  │ │  *  │ │  *  │ │  *  │              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                           │
│  表达式: 0 9 * * *                                        │
│  含义: 每天 09:00 执行                                    │
│                                                           │
│  接下来执行时间:                                          │
│  • 2026-04-05 09:00 (周六)                               │
│  • 2026-04-06 09:00 (周日)                               │
│  • 2026-04-07 09:00 (周一)                               │
│  • 2026-04-08 09:00 (周二)                               │
│  • 2026-04-09 09:00 (周三)                               │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 数据模型变更

### 4.1 工作流模板扩展

```sql
-- 新增字段
ALTER TABLE workflow_templates ADD COLUMN thumbnail_url TEXT;
ALTER TABLE workflow_templates ADD COLUMN category VARCHAR(50);
ALTER TABLE workflow_templates ADD COLUMN tags_json TEXT DEFAULT '[]';
ALTER TABLE workflow_templates ADD COLUMN usage_count INTEGER DEFAULT 0;
ALTER TABLE workflow_templates ADD COLUMN rating_avg REAL DEFAULT 0;
ALTER TABLE workflow_templates ADD COLUMN rating_count INTEGER DEFAULT 0;
```

### 4.2 执行日志增强

```sql
-- 新增节点输出存储
CREATE TABLE execution_node_outputs (
  id VARCHAR(36) PRIMARY KEY,
  log_id VARCHAR(36) REFERENCES execution_logs(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL,
  input_json TEXT,
  output_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_node_outputs_log ON execution_node_outputs(log_id);
```

---

## 5. API扩展

### 5.1 新增端点

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/workflows/:id/test-run` | 测试运行工作流 |
| GET | `/workflows/marketplace` | 获取模板市场列表 |
| POST | `/workflows/:id/clone` | 克隆模板 |
| GET | `/workflows/:id/preview` | 获取流程预览图 |
| POST | `/cron/validate-expression` | 验证Cron表达式 |

### 5.2 WebSocket事件扩展

```typescript
// 新增事件类型
interface WorkflowEvents {
  'workflow_test_started': { workflowId: string }
  'workflow_test_completed': { workflowId: string, result: ExecutionResult }
  'workflow_node_output': { nodeId: string, output: unknown }
  'queue_capacity_warning': { remaining: number }
  'retry_scheduled': { taskId: string, retryAt: Date }
}
```

---

## 6. 实施优先级

### Phase 1: 实时性基础 (优先级最高)
1. WebSocket → Store 集成
2. 任务状态实时更新
3. Toast通知增强
4. 执行状态面板优化

### Phase 2: 配置体验优化
1. Cron表达式可视化构建器
2. 节点配置表单优化
3. 实时验证反馈
4. 错误提示改进

### Phase 3: 测试与调试
1. 测试运行模式
2. 节点输出预览
3. 数据流可视化
4. 示例数据注入

### Phase 4: 发现与共享
1. 模板市场页面
2. 模板预览功能
3. 克隆功能
4. 评分系统(可选)

---

## 7. 成功指标

| 指标 | 当前状态 | 目标 |
|------|----------|------|
| 工作流配置时间 | ~30分钟 | <10分钟 |
| 测试运行成功率 | 无测试功能 | >90% |
| 用户留存率 | 未测量 | +30% |
| 错误配置率 | ~40% | <10% |
| 实时状态可见性 | 0% (需刷新) | 100% |
| 模板使用率 | 0% (无市场) | >50% |

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| WebSocket连接不稳定 | 实时更新中断 | 自动重连 + 降级轮询 |
| 测试数据管理复杂 | 用户学习成本 | 预设示例数据模板 |
| 模板质量参差不齐 | 用户信任下降 | 审核机制 + 评分过滤 |
| 性能影响(节点输出存储) | 数据库膨胀 | 定期清理 + 压缩存储 |