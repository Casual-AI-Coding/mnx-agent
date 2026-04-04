# SP-3: Permission Management

> 本方案实现权限管理系统，包括节点权限和流程授权。

## 1. 目标

- 实现服务节点权限管理（super 管理哪些角色可以使用哪些节点）
- 实现流程授权（super 授权流程给其他用户）
- 在配置阶段验证权限

## 2. 权限模型

### 2.1 服务节点权限

```
service_node_permissions 表定义了每个服务方法的最低角色要求：

┌─────────────────┬───────────────────┬──────────┐
│ service_name    │ method_name       │ min_role │
├─────────────────┼───────────────────┼──────────┤
│ minimaxClient   │ chatCompletion    │ pro      │
│ minimaxClient   │ imageGeneration   │ pro      │
│ db              │ getPendingTasks   │ admin    │
│ capacityChecker │ getRemainingCapacity │ pro   │
└─────────────────┴───────────────────┴──────────┘

用户角色层级：user < pro < admin < super
```

### 2.2 流程权限

```
流程访问权限检查：
1. owner_id == current_user_id  → 有权限
2. is_public == true            → 有权限
3. user_role == 'super'         → 有权限
4. workflow_permissions 中存在记录 → 有权限
否则 → 无权限
```

## 3. API 设计

### 3.1 服务节点权限 API（Super 专用）

```typescript
// GET /api/admin/service-nodes
// 获取所有服务节点权限列表
// 权限：super

// PATCH /api/admin/service-nodes/:id
// 更新服务节点权限
// 权限：super
// Body: { min_role?: string, is_enabled?: boolean }
```

### 3.2 可用节点 API

```typescript
// GET /api/workflows/available-actions
// 获取当前用户可用的 action 节点列表
// 权限：所有用户
// 响应：按角色过滤后的节点列表
```

### 3.3 流程授权 API（Super 专用）

```typescript
// POST /api/admin/workflows/:id/grant
// 授权流程给用户
// 权限：super
// Body: { userId: string }

// DELETE /api/admin/workflows/:id/revoke
// 撤销用户的流程权限
// 权限：super
// Body: { userId: string }

// PATCH /api/admin/workflows/:id/visibility
// 设置流程公开/私有
// 权限：super
// Body: { isPublic: boolean }
```

## 4. 实现代码

### 4.1 服务节点权限路由

```typescript
// server/routes/admin/service-nodes.ts

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireSuper } from '../../middleware/auth.js'

const router = Router()

// 获取所有服务节点权限
router.get('/', requireSuper, asyncHandler(async (req, res) => {
  const nodes = await db.getAllServiceNodePermissions()
  res.json({ data: nodes })
}))

// 更新服务节点权限
router.patch('/:id', requireSuper, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { min_role, is_enabled } = req.body

  // 验证 min_role
  const validRoles = ['user', 'pro', 'admin', 'super']
  if (min_role && !validRoles.includes(min_role)) {
    return res.status(400).json({ error: 'Invalid min_role' })
  }

  await db.updateServiceNodePermission(id, { min_role, is_enabled })
  const updated = await db.getServiceNodePermissionById(id)
  
  res.json({ success: true, data: updated })
}))

export default router
```

### 4.2 可用节点路由

```typescript
// server/routes/workflows/available-actions.ts

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'

const router = Router()

// 获取当前用户可用的 action 节点
router.get('/', asyncHandler(async (req, res) => {
  const userRole = req.user!.role
  const nodes = await serviceRegistry.getAvailableNodes(userRole)
  
  // 按分类分组
  const grouped = nodes.reduce((acc, node) => {
    const category = node.category
    if (!acc[category]) acc[category] = []
    acc[category].push({
      id: node.id,
      service: node.service_name,
      method: node.method_name,
      label: node.display_name,
      minRole: node.min_role,
    })
    return acc
  }, {} as Record<string, unknown[]>)
  
  res.json({ data: grouped })
}))

export default router
```

### 4.3 流程授权路由

```typescript
// server/routes/admin/workflows.ts

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireSuper } from '../../middleware/auth.js'

const router = Router()

// 授权流程给用户
router.post('/:id/grant', requireSuper, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  const grantedBy = req.user!.id

  // 检查流程是否存在
  const workflow = await db.getWorkflowTemplate(id)
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' })
  }

  // 检查用户是否存在
  const user = await db.getUserById(userId)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  // 创建授权记录
  await db.createWorkflowPermission({
    workflow_id: id,
    user_id: userId,
    granted_by: grantedBy,
  })

  res.json({ success: true })
}))

// 撤销用户流程权限
router.delete('/:id/revoke', requireSuper, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { userId } = req.body

  await db.deleteWorkflowPermission(id, userId)
  res.json({ success: true })
}))

// 设置流程公开/私有
router.patch('/:id/visibility', requireSuper, asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isPublic } = req.body

  await db.updateWorkflowTemplate(id, { is_public: isPublic })
  res.json({ success: true })
}))

// 获取流程的授权用户列表
router.get('/:id/permissions', requireSuper, asyncHandler(async (req, res) => {
  const { id } = req.params
  const permissions = await db.getWorkflowPermissions(id)
  res.json({ data: permissions })
}))

export default router
```

### 4.4 流程创建时验证权限

```typescript
// server/routes/workflows.ts

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'

const router = Router()

// 创建流程
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, nodes_json, edges_json } = req.body
  const userId = req.user!.id
  const userRole = req.user!.role

  // 解析节点
  const nodes = JSON.parse(nodes_json)
  const actionNodes = nodes.filter((n: WorkflowNode) => n.type === 'action')

  // 验证每个 action 节点的权限
  for (const node of actionNodes) {
    const config = node.data.config as ActionNodeConfig
    const { service, method } = config

    const permission = await db.getServiceNodePermission(service, method)
    
    if (!permission) {
      return res.status(400).json({
        error: `Unknown service method: ${service}.${method}`
      })
    }

    if (!permission.is_enabled) {
      return res.status(403).json({
        error: `Service method ${service}.${method} is disabled`
      })
    }

    const roleHierarchy = { user: 0, pro: 1, admin: 2, super: 3 }
    if (roleHierarchy[permission.min_role] > roleHierarchy[userRole]) {
      return res.status(403).json({
        error: `You don't have permission to use ${service}.${method}. Requires ${permission.min_role} role.`
      })
    }
  }

  // 创建流程
  const workflow = await db.createWorkflowTemplate({
    name,
    description,
    nodes_json,
    edges_json,
    owner_id: userId,
  })

  res.json({ success: true, data: workflow })
}))

export default router
```

### 4.5 定时任务创建时验证权限

```typescript
// server/routes/cron/jobs.ts

// 创建定时任务
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, cron_expression, workflow_id, timezone } = req.body
  const userId = req.user!.id
  const userRole = req.user!.role

  // 验证 cron 表达式
  if (!cron.validate(cron_expression)) {
    return res.status(400).json({ error: 'Invalid cron expression' })
  }

  // 验证流程存在
  const workflow = await db.getWorkflowTemplate(workflow_id)
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' })
  }

  // 验证流程权限
  const hasAccess = 
    workflow.owner_id === userId ||
    userRole === 'super' ||
    workflow.is_public ||
    await db.hasWorkflowPermission(workflow_id, userId)

  if (!hasAccess) {
    return res.status(403).json({ error: 'You do not have access to this workflow' })
  }

  // 创建定时任务
  const job = await db.createCronJob({
    name,
    description,
    cron_expression,
    timezone: timezone || 'Asia/Shanghai',
    workflow_id,
    owner_id: userId,
  })

  // 调度任务
  await cronScheduler.scheduleJob(job)

  res.json({ success: true, data: job })
}))
```

## 5. DatabaseService 方法

```typescript
// server/database/service-async.ts 新增方法

// Workflow Permissions
async createWorkflowPermission(data: {
  workflow_id: string
  user_id: string
  granted_by?: string
}): Promise<void> {
  await this.db.run(`
    INSERT INTO workflow_permissions (id, workflow_id, user_id, granted_by)
    VALUES (?, ?, ?, ?)
  `, [uuidv4(), data.workflow_id, data.user_id, data.granted_by || null])
}

async deleteWorkflowPermission(workflowId: string, userId: string): Promise<void> {
  await this.db.run(`
    DELETE FROM workflow_permissions 
    WHERE workflow_id = ? AND user_id = ?
  `, [workflowId, userId])
}

async hasWorkflowPermission(workflowId: string, userId: string): Promise<boolean> {
  const row = await this.db.get(`
    SELECT id FROM workflow_permissions 
    WHERE workflow_id = ? AND user_id = ?
  `, [workflowId, userId])
  return !!row
}

async getWorkflowPermissions(workflowId: string): Promise<WorkflowPermission[]> {
  return this.db.all(`
    SELECT wp.*, u.username, u.email
    FROM workflow_permissions wp
    JOIN users u ON wp.user_id = u.id
    WHERE wp.workflow_id = ?
  `, [workflowId])
}

// Workflow Templates
async getWorkflowTemplate(id: string): Promise<WorkflowTemplate | null> {
  return this.db.get(`
    SELECT * FROM workflow_templates WHERE id = ?
  `, [id])
}

async createWorkflowTemplate(data: {
  name: string
  description?: string
  nodes_json: string
  edges_json: string
  owner_id?: string
}): Promise<WorkflowTemplate> {
  const id = uuidv4()
  await this.db.run(`
    INSERT INTO workflow_templates (id, name, description, nodes_json, edges_json, owner_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, data.name, data.description || null, data.nodes_json, data.edges_json, data.owner_id || null])
  
  return this.getWorkflowTemplate(id) as Promise<WorkflowTemplate>
}

async updateWorkflowTemplate(id: string, data: Partial<WorkflowTemplate>): Promise<void> {
  // ... 实现更新逻辑
}

// 获取用户可访问的流程列表
async getAvailableWorkflows(userId: string): Promise<WorkflowTemplate[]> {
  return this.db.all(`
    SELECT DISTINCT wt.* 
    FROM workflow_templates wt
    LEFT JOIN workflow_permissions wp ON wt.id = wp.workflow_id
    WHERE wt.owner_id = ?
       OR wp.user_id = ?
       OR wt.is_public = true
    ORDER BY wt.created_at DESC
  `, [userId, userId])
}
```

## 6. 实施步骤

1. 创建路由文件
2. 在 DatabaseService 添加方法
3. 注册路由到 app
4. 编写单元测试
5. 测试权限验证逻辑

## 7. 验证检查清单

- [ ] 服务节点权限 API 实现
- [ ] 可用节点 API 实现
- [ ] 流程授权 API 实现
- [ ] 流程创建时权限验证
- [ ] 任务创建时权限验证
- [ ] DatabaseService 方法添加
- [ ] 单元测试通过