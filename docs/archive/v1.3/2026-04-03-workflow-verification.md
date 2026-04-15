# Workflow Engine 渐进式验证方案

> 生成日期: 2026-04-03
> 目标: 验证 workflow engine 核心执行流程、action 节点调用、跨服务协作

## 一、验证目标

验证 workflow engine 是否能真正运行，包括：

1. **核心流程验证**：拓扑排序、依赖解析、模板变量替换
2. **Action 节点验证**：调用注册的 service 方法（MiniMax API、Database、Capacity 等）
3. **节点类型验证**：action、condition、loop、transform 各类型正确执行
4. **数据流验证**：节点间数据传递、输出变量引用

---

## 二、渐进式验证策略

从简单到复杂，分三阶段验证：

### 阶段 A：最小验证集（3 个示例）

**目标**：验证核心引擎逻辑，不连接真实 API

| 编号 | 示例名称 | 验证点 | 数据源 |
|------|----------|--------|--------|
| A-1 | 单节点 action | 拓扑排序、action 节点执行、serviceRegistry.call | Mock MiniMax API |
| A-2 | action + transform | 数据传递、模板变量替换 `{{node.output}}` | Mock MiniMax API |
| A-3 | action + db | 跨服务调用、数据库 CRUD 操作 | Mock DB + Mock API |

**验证方法**：
- 编写单元测试，使用 mock service registry
- 验证 execution order、node results、output data

### 阶段 B：完整验证集（6 个示例）

**目标**：验证所有节点类型和真实 API 调用

| 编号 | 示例名称 | 验证点 | 数据源 |
|------|----------|--------|--------|
| B-1 | action + condition | 条件分支、条件表达式解析 | 真实 MiniMax API（可选） |
| B-2 | action + loop | 循环执行、maxIterations 限制 | Mock 数据 |
| B-3 | 多节点 DAG | 复杂拓扑、并行依赖 | Mock services |
| B-4 | text → media | MiniMax API 真实调用、异步任务 | 真实 MiniMax API |
| B-5 | text → db save | API调用 → 数据库保存链路 | 真实 MiniMax API + 真实 DB |
| B-6 | capacity check → action | 容量检查前置、条件控制流程 | 真实 CapacityChecker |

**验证方法**：
- 编写集成测试，启动真实服务
- 验证 API 返回数据结构、数据库记录创建

### 阶段 C：端到端验证（2 个业务场景）

**目标**：验证真实业务流程

| 编号 | 示例名称 | 验证点 | 触发方式 |
|------|----------|--------|----------|
| C-1 | 定时图片生成 + 保存 | CronScheduler → WorkflowEngine → MiniMax API → mediaStorage → DB | Cron 定时触发 |
| C-2 | 文本生成 + 日志记录 + 容量检查 | 完整链路：容量检查 → API 调用 → 日志记录 → 通知 | 手动触发 + Webhook |

**验证方法**：
- 创建真实 cron job，等待定时触发
- 查看 execution_logs、execution_log_details 表确认执行链路
- 检查生成的媒体文件、数据库记录

---

## 三、测试环境准备

### 3.1 Mock 环境配置（阶段 A）

创建 mock service registry 和 mock database：

```typescript
// server/__tests__/workflow-integration-mock.test.ts
import { WorkflowEngine } from '../services/workflow-engine'
import { ServiceNodeRegistry } from '../services/service-node-registry'

function createMockRegistry(): ServiceNodeRegistry {
  const registry = new ServiceNodeRegistry(mockDb)
  
  // 注册 mock minimaxClient
  registry.register({
    serviceName: 'minimaxClient',
    instance: {
      chatCompletion: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Mock AI response' } }]
      }),
      imageGeneration: vi.fn().mockResolvedValue({
        data: { image_url: 'https://mock-url/image.png' }
      }),
    },
    methods: [
      { name: 'chatCompletion', displayName: 'Mock Text', category: 'Mock' },
      { name: 'imageGeneration', displayName: 'Mock Image', category: 'Mock' },
    ],
  })
  
  // 注册 mock db
  registry.register({
    serviceName: 'db',
    instance: {
      createMediaRecord: vi.fn().mockResolvedValue({ id: 'mock-media-id' }),
      getTaskById: vi.fn().mockResolvedValue({ id: 'mock-task' }),
    },
    methods: [
      { name: 'createMediaRecord', displayName: 'Mock Create', category: 'Mock' },
    ],
  })
  
  return registry
}
```

### 3.2 真实环境配置（阶段 B/C）

使用真实服务：

```bash
# 启动开发服务器
npm run dev:full

# 或使用后台 CLI
node scripts/dev.js start
node scripts/dev.js log  # 查看日志
```

---

## 四、验证执行步骤

### 阶段 A 执行步骤

#### A-1: 单节点 action

**Workflow JSON**:
```json
{
  "nodes": [
    {
      "id": "text-node",
      "type": "action",
      "data": {
        "label": "Generate Text",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [
            {
              "model": "abab6.5s-chat",
              "messages": [{"role": "user", "content": "Hello"}]
            }
          ]
        }
      }
    }
  ],
  "edges": []
}
```

**验证脚本**:
```typescript
const engine = new WorkflowEngine(mockDb, mockRegistry)
const result = await engine.executeWorkflow(JSON.stringify(workflow))

// 验证点
expect(result.success).toBe(true)
expect(result.nodeResults.has('text-node')).toBe(true)
expect(result.nodeResults.get('text-node')?.data).toMatchObject({
  choices: [{ message: { content: 'Mock AI response' } }]
})
```

#### A-2: action + transform

**Workflow JSON**:
```json
{
  "nodes": [
    {
      "id": "text-node",
      "type": "action",
      "data": {
        "label": "Generate Text",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [{"model": "abab6.5s-chat", "messages": [{"role": "user", "content": "Hello"}]}]
        }
      }
    },
    {
      "id": "extract-node",
      "type": "transform",
      "data": {
        "label": "Extract Content",
        "config": {
          "transformType": "extract",
          "inputNode": "text-node",
          "inputPath": "choices[0].message.content"
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "text-node", "target": "extract-node"}
  ]
}
```

**验证脚本**:
```typescript
const result = await engine.executeWorkflow(JSON.stringify(workflow))

// 验证点
expect(result.success).toBe(true)
expect(result.nodeResults.get('extract-node')?.data).toBe('Mock AI response')
```

#### A-3: action + db

**Workflow JSON**:
```json
{
  "nodes": [
    {
      "id": "image-node",
      "type": "action",
      "data": {
        "label": "Generate Image",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [{"prompt": "A beautiful sunset"}]
        }
      }
    },
    {
      "id": "save-node",
      "type": "action",
      "data": {
        "label": "Save to DB",
        "config": {
          "service": "db",
          "method": "createMediaRecord",
          "args": [
            {
              "filename": "{{image-node.output.data.image_url}}",
              "type": "image",
              "source": "image_generation"
            }
          ]
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "image-node", "target": "save-node"}
  ]
}
```

---

### 阶段 B 执行步骤

#### B-1: action + condition

**Workflow JSON**:
```json
{
  "nodes": [
    {
      "id": "capacity-node",
      "type": "action",
      "data": {
        "label": "Check Capacity",
        "config": {
          "service": "capacityChecker",
          "method": "hasCapacity",
          "args": ["image"]
        }
      }
    },
    {
      "id": "condition-node",
      "type": "condition",
      "data": {
        "label": "Has Capacity?",
        "config": {
          "condition": "{{capacity-node.output}} == true"
        }
      }
    },
    {
      "id": "image-node",
      "type": "action",
      "data": {
        "label": "Generate Image",
        "config": {
          "service": "minimaxClient",
          "method": "imageGeneration",
          "args": [{"prompt": "A sunset"}]
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "capacity-node", "target": "condition-node"},
    {"id": "e2", "source": "condition-node", "target": "image-node"}
  ]
}
```

**注意**：condition 节点当前实现返回 boolean，不会阻止后续节点执行。需要验证 edge 的 sourceHandle/targetHandle 分支逻辑是否实现。

#### B-2: action + loop

**Workflow JSON**:
```json
{
  "nodes": [
    {
      "id": "loop-node",
      "type": "loop",
      "data": {
        "label": "Loop 3 Times",
        "config": {
          "items": "[\"item1\", \"item2\", \"item3\"]",
          "maxIterations": 3
        }
      }
    },
    {
      "id": "text-node",
      "type": "action",
      "data": {
        "label": "Generate Text for Item",
        "config": {
          "service": "minimaxClient",
          "method": "chatCompletion",
          "args": [{"messages": [{"role": "user", "content": "{{item}}"}]}]
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "loop-node", "target": "text-node"}
  ]
}
```

---

### 阶段 C 执行步骤

#### C-1: 定时图片生成 + 保存

**步骤**：

1. 创建 workflow template：
```sql
INSERT INTO workflow_templates (id, name, nodes_json, edges_json)
VALUES (
  'wf-001',
  'Daily Image Generation',
  '[{"id":"capacity","type":"action","data":{"label":"Check","config":{"service":"capacityChecker","method":"hasCapacity","args":["image"]}}},{"id":"image","type":"action","data":{"label":"Gen","config":{"service":"minimaxClient","method":"imageGeneration","args":[{"prompt":"Daily sunset"}]}}},{"id":"save","type":"action","data":{"label":"Save","config":{"service":"mediaStorage","method":"saveFromUrl","args":["{{image.output.data.image_url}}","daily-image.png","image"]}}}]',
  '[{"id":"e1","source":"capacity","target":"image"},{"id":"e2","source":"image","target":"save"}]'
);
```

2. 创建 cron job：
```bash
curl -X POST http://localhost:3000/api/cron/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Image Workflow",
    "cron_expression": "0 9 * * *",
    "workflow_id": "wf-001",
    "is_active": true
  }'
```

3. 手动触发验证：
```bash
curl -X POST http://localhost:3000/api/cron/jobs/<job-id>/run \
  -H "Authorization: Bearer <token>"
```

4. 检查结果：
```bash
# 查看执行日志
curl http://localhost:3000/api/cron/logs?job_id=<job-id> \
  -H "Authorization: Bearer <token>"

# 查看生成的媒体
curl http://localhost:3000/api/media?type=image \
  -H "Authorization: Bearer <token>"
```

---

## 五、验证检查清单

### 每个 workflow 验证后检查：

| 检查项 | 验证方法 | 期望结果 |
|--------|----------|----------|
| 执行成功 | `result.success === true` | true |
| 所有节点执行 | `result.nodeResults.size === workflow.nodes.length` | 数量匹配 |
| 执行顺序正确 | 检查 execution_log_details 表中节点顺序 | 依赖节点先执行 |
| 数据传递正确 | 检查后续节点输入是否包含前置节点输出 | 模板变量替换正确 |
| 数据库记录创建 | 查询相关表（media_records, execution_logs） | 记录存在 |
| 媒体文件保存 | 检查 data/media/ 目录 | 文件存在 |

---

## 六、问题记录与修复流程

### 验证中发现问题时：

1. **记录问题**：在 `docs/workflow-issues.md` 中记录
2. **定位原因**：查看 execution_log_details.error_message
3. **修复代码**：针对性修复 workflow-engine.ts 或 service 方法
4. **回归验证**：重新运行验证脚本
5. **更新文档**：在本文档中补充修复说明

### 常见问题预设：

| 问题 | 可能原因 | 修复方案 |
|------|----------|----------|
| service not registered | ServiceNodeRegistry 未注册该服务 | 补充注册 |
| method not found | 服务实例缺少该方法 | 检查方法签名 |
| template variable not resolved | `{{node.output}}` 路径错误 | 检查节点输出结构 |
| condition evaluation failed | 条件表达式语法错误 | 简化条件表达式 |
| database write failed | ownerId 数据隔离问题 | 确认 ownerId 传递 |

---

## 七、时间规划

| 阶段 | 预计时间 | 输出 |
|------|----------|------|
| 阶段 A | 2 小时 | 单元测试 + Mock 验证脚本 |
| 阶段 B | 3 小时 | 集成测试 + 真实 API 验证 |
| 阶段 C | 2 小时 | 端到端测试 + Cron 触发验证 |
| 文档整理 | 1 小时 | 完整验证报告 |

**总计**：8 小时（1 个工作日）

---

## 八、后续优化建议

1. **自动化验证**：将验证脚本集成到 CI/CD
2. **监控面板**：添加 workflow 执行成功率监控
3. **错误恢复**：实现 workflow 执行失败后的部分重试
4. **性能优化**：对复杂 DAG 进行并行执行优化