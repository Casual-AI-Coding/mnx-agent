# SP-6: CronScheduler Adaptation

> 本方案适配 CronScheduler 到新的数据模型。

## 1. 目标

- 适配新的 `cron_jobs` 表结构（使用 `workflow_id` 而非 `workflow_json`）
- 从 `workflow_templates` 加载流程定义
- 传递 `execution_log_id` 给 WorkflowEngine

## 2. 变更内容

### 2.1 数据模型变更

```typescript
// 旧的 cron_jobs 表
interface OldCronJob {
  id: string
  name: string
  workflow_json: string  // 直接存储流程 JSON
  // ...
}

// 新的 cron_jobs 表
interface NewCronJob {
  id: string
  name: string
  workflow_id: string    // 关联流程模板
  // ...
}
```

### 2.2 执行流程变更

```
旧流程:
CronScheduler → 直接读取 job.workflow_json → WorkflowEngine

新流程:
CronScheduler → 读取 job.workflow_id → 加载 workflow_template → WorkflowEngine
```

## 3. 实现代码

### 3.1 CronScheduler 更新

```typescript
// server/services/cron-scheduler.ts

import cron, { ScheduledTask } from 'node-cron'
import { CronExpressionParser } from 'cron-parser'
import type { DatabaseService } from '../database/service-async.js'
import type { WorkflowEngine } from './workflow-engine.js'
import { ExecutionStatus, TriggerType } from '../database/types.js'

export class CronScheduler {
  private jobs: Map<string, ScheduledTask> = new Map()
  private db: DatabaseService
  private workflowEngine: WorkflowEngine
  private timezone: string
  private maxConcurrent: number
  private defaultTimeoutMs: number
  private runningJobs: Set<string> = new Set()

  constructor(
    db: DatabaseService,
    workflowEngine: WorkflowEngine,
    options?: { timezone?: string; maxConcurrent?: number; defaultTimeoutMs?: number }
  ) {
    this.db = db
    this.workflowEngine = workflowEngine
    this.timezone = options?.timezone ?? 'Asia/Shanghai'
    this.maxConcurrent = options?.maxConcurrent ?? 5
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 300000
  }

  async init(): Promise<void> {
    // 加载所有活跃的定时任务
    const activeJobs = await this.db.getActiveCronJobs()
    
    for (const job of activeJobs) {
      try {
        await this.scheduleJob(job)
      } catch (error) {
        console.error(`[CronScheduler] Failed to schedule job ${job.id}:`, error)
      }
    }
  }

  async scheduleJob(job: CronJob): Promise<void> {
    // 验证 cron 表达式
    if (!cron.validate(job.cron_expression)) {
      throw new Error(`Invalid cron expression: ${job.cron_expression}`)
    }

    // 取消已存在的调度
    if (this.jobs.has(job.id)) {
      this.unscheduleJob(job.id)
    }

    // 计算下次执行时间
    const nextRun = this.calculateNextRun(job.cron_expression)
    if (nextRun) {
      await this.db.updateCronJob(job.id, { next_run_at: nextRun.toISOString() })
    }

    // 创建定时任务
    const task = cron.schedule(
      job.cron_expression,
      async () => {
        await this.executeJobTick(job)
        
        // 更新下次执行时间
        const nextRunAfter = this.calculateNextRun(job.cron_expression)
        if (nextRunAfter) {
          await this.db.updateCronJob(job.id, { next_run_at: nextRunAfter.toISOString() })
        }
      },
      { timezone: this.timezone }
    )

    this.jobs.set(job.id, task)
    console.log(`[CronScheduler] Scheduled job: ${job.name} (${job.id})`)
  }

  private async executeJobTick(job: CronJob): Promise<void> {
    // 并发控制
    if (this.runningJobs.size >= this.maxConcurrent) {
      console.warn(`[CronScheduler] Max concurrent reached, skipping job ${job.id}`)
      return
    }

    this.runningJobs.add(job.id)
    const startTime = Date.now()

    let executionLogId: string | null = null

    try {
      // 1. 加载流程模板
      const workflow = await this.db.getWorkflowTemplate(job.workflow_id)
      if (!workflow) {
        throw new Error(`Workflow ${job.workflow_id} not found`)
      }

      // 2. 创建执行日志
      executionLogId = await this.db.createExecutionLog({
        job_id: job.id,
        trigger_type: TriggerType.CRON,
        status: ExecutionStatus.RUNNING,
        tasks_executed: 0,
        tasks_succeeded: 0,
        tasks_failed: 0,
      })

      // 3. 构建 workflow JSON
      const workflowJson = JSON.stringify({
        nodes: JSON.parse(workflow.nodes_json),
        edges: JSON.parse(workflow.edges_json),
      })

      // 4. 执行工作流（传递 execution_log_id）
      const result = await this.executeWithTimeout(
        () => this.workflowEngine.executeWorkflow(workflowJson, executionLogId!),
        this.defaultTimeoutMs
      )

      // 5. 统计执行结果
      const tasksExecuted = result.nodeResults.size
      let tasksSucceeded = 0
      let tasksFailed = 0
      
      for (const nodeResult of result.nodeResults.values()) {
        if (nodeResult.success) tasksSucceeded++
        else tasksFailed++
      }

      // 6. 更新执行日志
      await this.db.updateExecutionLog(executionLogId, {
        status: result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        tasks_executed: tasksExecuted,
        tasks_succeeded: tasksSucceeded,
        tasks_failed: tasksFailed,
        error_summary: result.error || null,
      })

      // 7. 更新任务统计
      await this.db.updateCronJob(job.id, {
        last_run_at: new Date().toISOString(),
        total_runs: job.total_runs + 1,
        total_failures: result.success ? job.total_failures : job.total_failures + 1,
      })

      console.log(`[CronScheduler] Job ${job.name} completed: ${result.success ? 'success' : 'failed'}`)

    } catch (error) {
      console.error(`[CronScheduler] Job ${job.name} failed:`, error)

      // 更新执行日志
      if (executionLogId) {
        await this.db.updateExecutionLog(executionLogId, {
          status: ExecutionStatus.FAILED,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_summary: (error as Error).message,
        })
      }

      // 更新任务统计
      await this.db.updateCronJob(job.id, {
        last_run_at: new Date().toISOString(),
        total_runs: job.total_runs + 1,
        total_failures: job.total_failures + 1,
      })
    } finally {
      this.runningJobs.delete(job.id)
    }
  }

  private calculateNextRun(expression: string): Date | null {
    try {
      const interval = CronExpressionParser.parse(expression, { tz: this.timezone })
      return interval.next().toDate()
    } catch {
      return null
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ])
  }

  unscheduleJob(jobId: string): boolean {
    const task = this.jobs.get(jobId)
    if (!task) return false

    task.stop()
    this.jobs.delete(jobId)
    return true
  }

  async rescheduleJob(jobId: string): Promise<boolean> {
    this.unscheduleJob(jobId)

    const job = await this.db.getCronJobById(jobId)
    if (!job || !job.is_active) return false

    await this.scheduleJob(job)
    return true
  }

  stopAll(): void {
    for (const task of this.jobs.values()) {
      task.stop()
    }
    this.jobs.clear()
  }

  getRunningJobs(): Set<string> {
    return this.runningJobs
  }
}
```

### 3.2 DatabaseService 方法更新

```typescript
// server/database/service-async.ts

// 获取活跃的定时任务（包含 workflow_id）
async getActiveCronJobs(): Promise<CronJob[]> {
  return this.db.all(`
    SELECT * FROM cron_jobs 
    WHERE is_active = true
    ORDER BY created_at DESC
  `)
}

// 根据 ID 获取定时任务
async getCronJobById(id: string): Promise<CronJob | null> {
  return this.db.get(`
    SELECT * FROM cron_jobs WHERE id = ?
  `, [id])
}

// 创建定时任务
async createCronJob(data: {
  name: string
  description?: string
  cron_expression: string
  timezone?: string
  workflow_id: string
  owner_id?: string
}): Promise<CronJob> {
  const id = uuidv4()
  const now = new Date().toISOString()

  await this.db.run(`
    INSERT INTO cron_jobs 
    (id, name, description, cron_expression, timezone, workflow_id, owner_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.name, data.description || null, data.cron_expression, 
      data.timezone || 'Asia/Shanghai', data.workflow_id, data.owner_id || null, now, now])

  return this.getCronJobById(id) as Promise<CronJob>
}

// 更新定时任务
async updateCronJob(id: string, data: Partial<CronJob>): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []

  const allowedFields = [
    'name', 'description', 'cron_expression', 'timezone', 'is_active',
    'last_run_at', 'next_run_at', 'total_runs', 'total_failures', 'timeout_ms'
  ]

  for (const field of allowedFields) {
    if (data[field as keyof CronJob] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(data[field as keyof CronJob])
    }
  }

  if (updates.length === 0) return

  values.push(new Date().toISOString())  // updated_at
  values.push(id)

  await this.db.run(`
    UPDATE cron_jobs 
    SET ${updates.join(', ')}, updated_at = ?
    WHERE id = ?
  `, values)
}

// 创建执行日志
async createExecutionLog(data: {
  job_id: string
  trigger_type: string
  status: string
  tasks_executed?: number
  tasks_succeeded?: number
  tasks_failed?: number
}): Promise<string> {
  const id = uuidv4()
  await this.db.run(`
    INSERT INTO execution_logs 
    (id, job_id, trigger_type, status, started_at, tasks_executed, tasks_succeeded, tasks_failed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, data.job_id, data.trigger_type, data.status, new Date().toISOString(),
      data.tasks_executed || 0, data.tasks_succeeded || 0, data.tasks_failed || 0])
  return id
}

// 更新执行日志
async updateExecutionLog(id: string, data: Partial<ExecutionLog>): Promise<void> {
  const updates: string[] = []
  const values: unknown[] = []

  const allowedFields = [
    'status', 'completed_at', 'duration_ms', 
    'tasks_executed', 'tasks_succeeded', 'tasks_failed', 'error_summary'
  ]

  for (const field of allowedFields) {
    if (data[field as keyof ExecutionLog] !== undefined) {
      updates.push(`${field} = ?`)
      values.push(data[field as keyof ExecutionLog])
    }
  }

  if (updates.length === 0) return

  values.push(id)
  await this.db.run(`
    UPDATE execution_logs SET ${updates.join(', ')} WHERE id = ?
  `, values)
}
```

### 3.3 定时任务路由更新

```typescript
// server/routes/cron/jobs.ts

import { Router } from 'express'
import { asyncHandler } from '../../middleware/asyncHandler.js'
import { requireAuth } from '../../middleware/auth.js'

const router = Router()

// 获取定时任务列表
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id
  const userRole = req.user!.role

  let jobs
  if (userRole === 'super') {
    jobs = await db.getAllCronJobs()
  } else {
    jobs = await db.getCronJobsByOwner(userId)
  }

  // 补充 workflow 信息
  const jobsWithWorkflow = await Promise.all(
    jobs.map(async (job) => {
      const workflow = await db.getWorkflowTemplate(job.workflow_id)
      return {
        ...job,
        workflow_name: workflow?.name || 'Unknown',
      }
    })
  )

  res.json({ data: jobsWithWorkflow })
}))

// 创建定时任务
router.post('/', requireAuth, asyncHandler(async (req, res) => {
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
    return res.status(403).json({ error: 'No access to this workflow' })
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

// 手动执行任务
router.post('/:id/run', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params
  const job = await db.getCronJobById(id)

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  // 执行一次（不经过调度）
  await cronScheduler.executeJobTick(job)

  res.json({ success: true })
}))

// 启用/禁用任务
router.post('/:id/toggle', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params
  const job = await db.getCronJobById(id)

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  const newActive = !job.is_active
  await db.updateCronJob(id, { is_active: newActive })

  if (newActive) {
    await cronScheduler.scheduleJob({ ...job, is_active: true })
  } else {
    cronScheduler.unscheduleJob(id)
  }

  res.json({ success: true, data: { is_active: newActive } })
}))

export default router
```

## 4. 实施步骤

1. 更新 `CronScheduler` 类
   - 从 workflow_id 加载流程
   - 传递 execution_log_id
2. 更新 `DatabaseService` 方法
3. 更新定时任务路由
4. 测试功能

## 5. 验证检查清单

- [ ] CronScheduler 正确加载流程模板
- [ ] 执行日志正确创建和更新
- [ ] 任务统计正确更新
- [ ] 手动执行功能正常
- [ ] 启用/禁用功能正常
- [ ] 并发控制正常
- [ ] 测试通过