import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { getDatabase } from '../database/service-async'
import { getServiceNodeRegistry } from '../services/service-node-registry'
import { WorkflowEngine } from '../services/workflow-engine'
import { CronScheduler } from '../services/cron-scheduler'
import type { WorkflowTemplate } from '../database/types'

/**
 * 阶段 B：完整验证集 - 集成测试
 * 
 * 目标：验证所有节点类型和真实 API 调用
 * 
 * 运行条件：
 * - PostgreSQL 数据库运行中
 * - MINIMAX_API_KEY 已配置
 * - 测试账户已创建
 * 
 * 运行命令：
 * ```bash
 * vitest run server/__tests__/workflow-integration.test.ts
 * ```
 */

describe('Workflow Engine - Phase B Integration Tests', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>
  let registry: ReturnType<typeof getServiceNodeRegistry>
  let engine: WorkflowEngine

  const testWorkflows: WorkflowTemplate[] = []
  const testJobIds: string[] = []

  beforeAll(async () => {
    db = await getDatabase()
    registry = getServiceNodeRegistry(db)
    engine = new WorkflowEngine(db, registry)
  })

  afterAll(async () => {
    
    for (const workflow of testWorkflows) {
      try {
        await db.deleteWorkflowTemplate(workflow.id, null)
      } catch {}
    }
  })

  describe('B-1: Action + Condition', () => {
    it('should evaluate condition and control flow', async () => {
      const workflow = {
        nodes: [
          {
            id: 'capacity-node',
            type: 'action',
            data: {
              label: 'Check Capacity',
              config: {
                service: 'capacityChecker',
                method: 'hasCapacity',
                args: ['text'],
              },
            },
          },
          {
            id: 'condition-node',
            type: 'condition',
            data: {
              label: 'Has Capacity?',
              config: {
                condition: '{{capacity-node.output}} == true',
              },
            },
          },
          {
            id: 'text-node',
            type: 'action',
            data: {
              label: 'Generate Text',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{
                  model: 'abab6.5s-chat',
                  messages: [{ role: 'user', content: 'Test' }],
                }],
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'capacity-node', target: 'condition-node' },
          { id: 'e2', source: 'condition-node', target: 'text-node' },
        ],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('capacity-node')).toBe(true)
      
      const capacityResult = result.nodeResults.get('capacity-node')
      expect(typeof capacityResult?.data).toBe('boolean')
    })
  })

  describe('B-2: Action + Loop', () => {
    it('should iterate over items in loop', async () => {
      const workflow = {
        nodes: [
          {
            id: 'loop-node',
            type: 'loop',
            data: {
              label: 'Loop Items',
              config: {
                items: JSON.stringify(['item1', 'item2', 'item3']),
                maxIterations: 3,
              },
            },
          },
          {
            id: 'text-node',
            type: 'action',
            data: {
              label: 'Process Item',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{
                  model: 'abab6.5s-chat',
                  messages: [{ role: 'user', content: 'Process: {{item}}' }],
                }],
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'loop-node', target: 'text-node' }],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBeGreaterThan(0)
    })
  })

  describe('B-4: Text → Media (Real API)', () => {
    it('should call MiniMax image generation API', async () => {
      const workflow = {
        nodes: [
          {
            id: 'image-node',
            type: 'action',
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{
                  model: 'image-01',
                  prompt: 'A beautiful sunset over mountains',
                }],
              },
            },
          },
        ],
        edges: [],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      
      const imageResult = result.nodeResults.get('image-node')
      expect(imageResult?.success).toBe(true)
      
      
      const data = imageResult?.data as { data?: { image_urls?: string[] } }
      expect(data?.data?.image_urls).toBeDefined()
      expect(data?.data?.image_urls?.length).toBeGreaterThan(0)
      expect(data?.data?.image_urls?.[0]).toMatch(/^https:\/\//)
    }, 30000)
  })

  describe('B-5: Text → DB Save', () => {
    it('should save workflow result to database', async () => {
      const workflow = {
        nodes: [
          {
            id: 'image-node',
            type: 'action',
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{
                  model: 'image-01',
                  prompt: 'A test image for workflow verification',
                }],
              },
            },
          },
          {
            id: 'save-node',
            type: 'action',
            data: {
              label: 'Save to DB',
              config: {
                service: 'db',
                method: 'createMediaRecord',
                args: [{
                  filename: 'test-image.png',
                  type: 'image',
                  source: 'workflow_test',
                  filepath: '{{image-node.output.data.image_urls[0]}}',
                  size_bytes: 0,
                }],
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'image-node', target: 'save-node' }],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(2)

      const saveResult = result.nodeResults.get('save-node')
      expect(saveResult?.success).toBe(true)
      
      const savedData = saveResult?.data as { id?: string }
      expect(savedData?.id).toBeDefined()

      
      if (savedData?.id) {
        const record = await db.getMediaRecordById(savedData.id)
        expect(record).toBeDefined()
        expect(record?.type).toBe('image')
      }
    }, 30000)
  })

  describe('B-6: Capacity Check → Action', () => {
    it('should check capacity before executing action', async () => {
      const workflow = {
        nodes: [
          {
            id: 'check-node',
            type: 'action',
            data: {
              label: 'Check Capacity',
              config: {
                service: 'capacityChecker',
                method: 'hasCapacity',
                args: ['text'],
              },
            },
          },
          {
            id: 'text-node',
            type: 'action',
            data: {
              label: 'Generate Text',
              config: {
                service: 'minimaxClient',
                method: 'chatCompletion',
                args: [{
                  model: 'abab6.5s-chat',
                  messages: [{ role: 'user', content: 'Hello' }],
                }],
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'check-node', target: 'text-node' }],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      
      const checkResult = result.nodeResults.get('check-node')
      expect(checkResult?.success).toBe(true)
      expect(typeof checkResult?.data).toBe('boolean')
    })
  })
})

/**
 * 阶段 C：端到端验证
 * 
 * 这些测试需要完整的系统运行：
 * - PostgreSQL 数据库
 * - 真实的 MiniMax API Key
 * - Cron Scheduler 运行
 * 
 * 运行命令：
 * ```bash
 * # 启动服务
 * npm run dev:full
 * 
 * # 运行 e2e 测试
 * vitest run server/__tests__/workflow-integration.test.ts -t "Phase C"
 * ```
 */
describe('Workflow Engine - Phase C E2E Tests', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>

  beforeAll(async () => {
    db = await getDatabase()
  })

  describe('C-1: Scheduled Image Generation + Save', () => {
    it('should trigger workflow via cron and save results', async () => {
      
      const template = await db.createWorkflowTemplate({
        id: 'test-cron-image',
        name: 'Test Cron Image Generation',
        description: 'E2E test for scheduled image generation',
        nodes_json: JSON.stringify([
          {
            id: 'image-node',
            type: 'action',
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{
                  model: 'image-01',
                  prompt: 'A test image from cron job',
                }],
              },
            },
          },
          {
            id: 'save-node',
            type: 'action',
            data: {
              label: 'Save to DB',
              config: {
                service: 'db',
                method: 'createMediaRecord',
                args: [{
                  filename: 'cron-image.png',
                  type: 'image',
                  source: 'cron_test',
                  filepath: '{{image-node.output.data.image_urls[0]}}',
                  size_bytes: 0,
                }],
              },
            },
          },
        ]),
        edges_json: JSON.stringify([
          { id: 'e1', source: 'image-node', target: 'save-node' },
        ]),
        is_public: false,
      }, undefined)

      
      const job = await db.createCronJob({
        name: 'Test Cron Job',
        cron_expression: '* * * * *',
        workflow_id: template.id,
        is_active: false,
      }, undefined)

      
      const scheduler = new CronScheduler(db)
      const result = await scheduler.executeJobNow(job.id)

      expect(result).toBeDefined()

      
      const logs = await db.getAllExecutionLogs(undefined, 1, 1)
      const latestLog = logs[0]
      
      expect(latestLog).toBeDefined()
      expect(latestLog?.status).toBe('completed')
      expect(latestLog?.tasks_executed).toBe(2)
      expect(latestLog?.tasks_succeeded).toBe(2)

      
      await db.deleteCronJob(job.id, undefined)
      await db.deleteWorkflowTemplate(template.id, null)
    }, 60000)
  })

  describe('C-2: Full Pipeline with Logs', () => {
    it('should execute full pipeline and create detailed logs', async () => {
      const template = await db.createWorkflowTemplate({
        id: 'test-full-pipeline',
        name: 'Test Full Pipeline',
        description: 'E2E test for complete workflow execution',
        nodes_json: JSON.stringify([
          {
            id: 'capacity-check',
            type: 'action',
            data: {
              label: 'Check Capacity',
              config: {
                service: 'capacityChecker',
                method: 'hasCapacity',
                args: ['image'],
              },
            },
          },
          {
            id: 'gen-image',
            type: 'action',
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{
                  model: 'image-01',
                  prompt: 'E2E test image',
                }],
              },
            },
          },
          {
            id: 'save-result',
            type: 'action',
            data: {
              label: 'Save Result',
              config: {
                service: 'db',
                method: 'createMediaRecord',
                args: [{
                  filename: 'e2e-image.png',
                  type: 'image',
                  source: 'e2e_test',
                  filepath: '{{gen-image.output.data.image_urls[0]}}',
                  size_bytes: 0,
                }],
              },
            },
          },
        ]),
        edges_json: JSON.stringify([
          { id: 'e1', source: 'capacity-check', target: 'gen-image' },
          { id: 'e2', source: 'gen-image', target: 'save-result' },
        ]),
        is_public: false,
      }, undefined)

      const job = await db.createCronJob({
        name: 'Test Full Pipeline Job',
        cron_expression: '0 0 1 1 *',
        workflow_id: template.id,
        is_active: false,
      }, undefined)

      
      const scheduler = new CronScheduler(db)
      await scheduler.executeJobNow(job.id)

      
      const logs = await db.getAllExecutionLogs(undefined, 1, 1)
      const latestLog = logs[0]

      expect(latestLog?.status).toBe('completed')
      expect(latestLog?.tasks_executed).toBe(3)

      
      const details = await db.getExecutionLogDetailsByLogId(latestLog!.id)
      expect(details.length).toBe(3)

      
      const nodeIds = details.map(d => d.node_id)
      expect(nodeIds).toContain('capacity-check')
      expect(nodeIds).toContain('gen-image')
      expect(nodeIds).toContain('save-result')

      
      await db.deleteCronJob(job.id, undefined)
      await db.deleteWorkflowTemplate(template.id, null)
    }, 60000)
  })
})