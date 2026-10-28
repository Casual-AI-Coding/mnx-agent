/**
 * 投产验证（R-006）：定时任务 / 死信队列 / 工作流预检 全链路集成测试
 *
 * 在真实测试库上验证核心投产链路：
 * 1. 定时任务 → 任务队列 → 执行日志 → 运营统计 一致性
 * 2. 任务失败 → DLQ → 重试 → 解决 的完整流转与未解决计数
 * 3. 工作流模板 预检链（解析 → 校验 → 执行序；环拒绝）
 * 4. owner 数据隔离
 *
 * 本文件作为「生产环境验证 checklist」（docs/guides/production-validation-checklist.md）
 * 的自动化部分，手工验收项见该文档。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  setupTestDatabase,
  teardownTestDatabase,
  getConnection,
  getTestFileMarker,
} from '../__tests__/test-helpers.js'
import { getJobService, getTaskService, getLogService, getDashboardService } from '../service-registration.js'
import { buildExecutionOrder, parseWorkflowJson, validateWorkflow } from '../services/workflow/index.js'
import type { WorkflowGraph } from '../services/workflow/index.js'

const fileMarker = getTestFileMarker(import.meta.url)
const ownerA = `${fileMarker.slice(0, 24)}-a`
const ownerB = `${fileMarker.slice(0, 24)}-b`

async function seedUser(userId: string, username: string): Promise<void> {
  const conn = getConnection()
  const now = new Date().toISOString()
  await conn.execute(
    `INSERT INTO users (id, username, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, 'hash', 'user', true, $3, $3)
     ON CONFLICT (id) DO NOTHING`,
    [userId, username, now]
  )
}

const LINEAR_WORKFLOW = {
  nodes: [
    { id: 'start', type: 'transform', config: { value: 'hello' }, position: { x: 0, y: 0 } },
    { id: 'end', type: 'transform', config: { echo: '{{start.value}}' }, position: { x: 1, y: 0 } },
  ],
  edges: [{ id: 'e1', source: 'start', target: 'end' }],
}

describe('投产验证：定时任务 / DLQ / 工作流预检 全链路', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    await seedUser(ownerA, `pa-${ownerA.slice(0, 10)}`)
    await seedUser(ownerB, `pb-${ownerB.slice(0, 10)}`)
  }, 60_000)

  afterAll(() => {
    teardownTestDatabase()
  })

  it('链路一：定时任务 → 队列任务 → 执行日志 → 运营统计一致', async () => {
    const jobService = getJobService()
    const taskService = getTaskService()
    const logService = getLogService()
    const dashboardService = getDashboardService()

    // 基线
    const before = await dashboardService.getOperationsOverview(ownerA)
    const baselineTotal = before.executions && !('error' in before.executions) ? before.executions.totalExecutions : 0

    // 1. 创建定时任务
    const job = await jobService.create({
      name: `prod-check-${fileMarker.slice(0, 18)}`,
      description: '投产验证链路一',
      cron_expression: '0 3 * * *',
      is_active: false,
    }, ownerA)
    expect(job.id).toBeTruthy()

    // 2. 生成队列任务并标记完成
    const task = await taskService.create({
      job_id: job.id,
      task_type: 'image_generation',
      payload: JSON.stringify({ prompt: 'production readiness probe' }),
      priority: 0,
      max_retries: 3,
    }, ownerA)
    await taskService.update(task.id, { status: 'completed' }, ownerA)

    // 3. 写执行日志（调度器完成一次执行的真实产物）
    const log = await logService.create({
      owner_id: ownerA,
      job_id: job.id,
      trigger_type: 'cron',
      status: 'completed',
      duration_ms: 1234,
      tasks_executed: 1,
      tasks_succeeded: 1,
      tasks_failed: 0,
    }, ownerA)
    expect(log.id).toBeTruthy()

    // 4. 运营统计反映该次执行
    const after = await dashboardService.getOperationsOverview(ownerA)
    if (after.executions && !('error' in after.executions)) {
      expect(after.executions.totalExecutions).toBe(baselineTotal + 1)
    }
    // 分布按执行明细的节点类型聚合；本次执行未产生节点明细时应返回空数组而非报错
    const distribution = after.distribution && !('error' in after.distribution) ? after.distribution : null
    expect(Array.isArray(distribution)).toBe(true)
  })

  it('链路二：失败 → DLQ → 重试 → 解决 全流转', async () => {
    const taskService = getTaskService()

    const task = await taskService.create({
      task_type: 'music_generation',
      payload: JSON.stringify({ prompt: 'doomed probe' }),
      priority: 0,
      max_retries: 1,
    }, ownerA)

    // 重试耗尽 → 入死信队列
    await taskService.moveToDeadLetter(task.id, 'upstream 500 persistent', ownerA)
    expect(await taskService.getById(task.id, ownerA)).toBeNull()

    const dlqBefore = await taskService.getDeadLetterQueue(ownerA, 50)
    const item = dlqBefore.find((i) => i.task_type === 'music_generation' && i.error_message === 'upstream 500 persistent')
    expect(item).toBeTruthy()
    const unresolvedBefore = await taskService.countUnresolvedDeadLetters(ownerA)
    expect(unresolvedBefore).toBeGreaterThanOrEqual(1)

    // 重试：旧条目解决，新任务回队列
    const retried = await taskService.retryFromDeadLetter(item!.id, ownerA)
    expect(retried.id).not.toBe(task.id)
    expect(retried.task_type).toBe('music_generation')

    const unresolvedAfterRetry = await taskService.countUnresolvedDeadLetters(ownerA)
    expect(unresolvedAfterRetry).toBe(unresolvedBefore - 1)

    // 人工解决剩余条目
    const another = await taskService.create({
      task_type: 'text_generation',
      payload: JSON.stringify({ prompt: 'second doomed probe' }),
      priority: 0,
      max_retries: 1,
    }, ownerA)
    await taskService.moveToDeadLetter(another.id, 'quota exceeded', ownerA)
    await taskService.resolveDeadLetterItem(
      (await taskService.getDeadLetterQueue(ownerA, 50)).find((i) => i.error_message === 'quota exceeded')!.id,
      'deleted',
      ownerA
    )
    expect(await taskService.countUnresolvedDeadLetters(ownerA)).toBe(unresolvedAfterRetry)
  })

  it('链路三：工作流模板预检（解析/校验/执行序/环拒绝）', () => {
    const parsed = parseWorkflowJson(JSON.stringify(LINEAR_WORKFLOW)) as WorkflowGraph
    expect(() => validateWorkflow(parsed)).not.toThrow()
    expect(buildExecutionOrder(parsed)).toEqual(['start', 'end'])

    const cyclic = parseWorkflowJson(JSON.stringify({
      nodes: LINEAR_WORKFLOW.nodes,
      edges: [
        { id: 'e1', source: 'start', target: 'end' },
        { id: 'e2', source: 'end', target: 'start' },
      ],
    })) as WorkflowGraph
    // 环检测在执行序构建阶段拒绝（validateWorkflow 只做结构校验）
    expect(() => buildExecutionOrder(cyclic)).toThrow()
  })

  it('链路四：owner 数据隔离（任务/DLQ/统计互不可见）', async () => {
    const taskService = getTaskService()

    const markerTask = await taskService.create({
      task_type: 'video_generation',
      payload: JSON.stringify({ probe: ownerA }),
      priority: 0,
      max_retries: 1,
    }, ownerA)
    await taskService.moveToDeadLetter(markerTask.id, `isolated-${ownerA.slice(0, 8)}`, ownerA)

    // ownerB 看不到 ownerA 的 DLQ 条目
    const dlqB = await taskService.getDeadLetterQueue(ownerB, 50)
    expect(dlqB.some((i) => i.error_message === `isolated-${ownerA.slice(0, 8)}`)).toBe(false)

    // ownerA 统计不含 ownerB 的执行
    const overviewA = await getDashboardService().getOperationsOverview(ownerA)
    const overviewB = await getDashboardService().getOperationsOverview(ownerB)
    if (overviewA.executions && !('error' in overviewA.executions) && overviewB.executions && !('error' in overviewB.executions)) {
      expect(overviewA.executions.totalExecutions).toBeGreaterThanOrEqual(1)
      // ownerB 在本测试套件中未产生执行日志
      expect(overviewB.executions.totalExecutions).toBe(0)
    }
  })
})
