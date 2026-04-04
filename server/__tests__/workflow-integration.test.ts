import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { getDatabase } from '../database/service-async'
import { createConnection, getConnection } from '../database/connection'
import { getServiceNodeRegistry, resetServiceNodeRegistry } from '../services/service-node-registry'
import { WorkflowEngine } from '../services/workflow-engine'
import { CronScheduler } from '../services/cron-scheduler'
import { getMiniMaxClient } from '../lib/minimax'
import { CapacityChecker } from '../services/capacity-checker'
import { TaskExecutor } from '../services/task-executor'
import { saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile } from '../lib/media-storage'
import { toCSV } from '../lib/csv-utils'
import { generateMediaToken, verifyMediaToken } from '../lib/media-token'
import type { WorkflowTemplate } from '../database/types'

async function registerServices(db: Awaited<ReturnType<typeof getDatabase>>) {
  const registry = getServiceNodeRegistry(db)
  const minimaxClient = getMiniMaxClient()
  const taskExecutor = new TaskExecutor(minimaxClient, db)
  const capacityChecker = new CapacityChecker(minimaxClient, db)

  await registry.register({
    serviceName: 'minimaxClient',
    instance: minimaxClient,
    methods: [
      { name: 'chatCompletion', displayName: 'Text Generation', category: 'MiniMax API' },
      { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
      { name: 'videoGeneration', displayName: 'Video Generation', category: 'MiniMax API' },
      { name: 'textToAudioSync', displayName: 'Voice Sync', category: 'MiniMax API' },
      { name: 'textToAudioAsync', displayName: 'Voice Async', category: 'MiniMax API' },
      { name: 'musicGeneration', displayName: 'Music Generation', category: 'MiniMax API' },
    ],
  })

  await registry.register({
    serviceName: 'db',
    instance: db,
    methods: [
      { name: 'createMediaRecord', displayName: 'Create Media Record', category: 'Database Media' },
      { name: 'getTaskById', displayName: 'Get Task By ID', category: 'Database Task' },
    ],
  })

  await registry.register({
    serviceName: 'capacityChecker',
    instance: capacityChecker,
    methods: [
      { name: 'getRemainingCapacity', displayName: 'Get Remaining Capacity', category: 'Capacity' },
      { name: 'hasCapacity', displayName: 'Check Has Capacity', category: 'Capacity' },
    ],
  })

  await registry.register({
    serviceName: 'mediaStorage',
    instance: { saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile },
    methods: [
      { name: 'saveMediaFile', displayName: 'Save Media File', category: 'Media Storage' },
      { name: 'saveFromUrl', displayName: 'Save From URL', category: 'Media Storage' },
    ],
  })

  await registry.register({
    serviceName: 'utils',
    instance: { toCSV, generateMediaToken, verifyMediaToken },
    methods: [
      { name: 'toCSV', displayName: 'Convert to CSV', category: 'Utils' },
    ],
  })
}

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

const hasApiKey = !!process.env.MINIMAX_API_KEY

describe.skipIf(!hasApiKey)('Workflow Engine - Phase B Integration Tests', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>
  let registry: ReturnType<typeof getServiceNodeRegistry>
  let engine: WorkflowEngine

  const testWorkflows: WorkflowTemplate[] = []
  const testJobIds: string[] = []

  beforeAll(async () => {
    await createConnection({
      pgHost: process.env.DB_HOST || 'localhost',
      pgPort: parseInt(process.env.DB_PORT || '5432', 10),
      pgUser: process.env.DB_USER || 'postgres',
      pgPassword: process.env.DB_PASSWORD || '',
      pgDatabase: process.env.DB_NAME || 'minimax_agent',
    })
    resetServiceNodeRegistry()
    db = await getDatabase()
    await registerServices(db)
    registry = getServiceNodeRegistry(db)
    engine = new WorkflowEngine(db, registry)
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM execution_log_details')
    await conn.execute('DELETE FROM execution_logs')
    await conn.execute('DELETE FROM task_queue')
    await conn.execute('DELETE FROM cron_jobs')
    await conn.execute('DELETE FROM media_records')
  })

  afterAll(async () => {
    resetServiceNodeRegistry()
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
            id: 'image-node',
            type: 'action',
            data: {
              label: 'Generate Image',
              config: {
                service: 'minimaxClient',
                method: 'imageGeneration',
                args: [{
                  model: 'image-01',
                  prompt: 'A sunset',
                }],
              },
            },
          },
          {
            id: 'condition-node',
            type: 'condition',
            data: {
              label: 'Has Result?',
              config: {
                condition: '{{image-node.output.data.image_urls[0]}} contains https',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'image-node', target: 'condition-node' },
        ],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      expect(result.nodeResults.has('image-node')).toBe(true)
      expect(result.nodeResults.has('condition-node')).toBe(true)
      
      const imageResult = result.nodeResults.get('image-node')
      expect(imageResult?.success).toBe(true)
      
      const conditionResult = result.nodeResults.get('condition-node')
      expect(conditionResult?.success).toBe(true)
    }, 60000)
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
                items: JSON.stringify(['sunset']),
                maxIterations: 1,
              },
            },
          },
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
                  prompt: 'A beautiful {{item}}',
                }],
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'loop-node', target: 'image-node' }],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBeGreaterThan(0)
    }, 30000)
  })

  describe('B-4: Text → Media (Real API)', () => {
    it('should call MiniMax image generation API', async () => {
      if (!process.env.MINIMAX_API_KEY) {
        console.log('Skipping B-4: MINIMAX_API_KEY not set')
        return
      }
      
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
      
      const data = imageResult?.data as { data?: { image_urls?: string[] }; base_resp?: { status_code?: number; status_msg?: string } }
      
      // Skip if API quota exceeded
      if (data?.base_resp?.status_code === 2056) {
        console.log('Skipping B-4: API quota exceeded')
        return
      }
      
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
                  source: 'image_generation',
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

  describe('B-6: Transform Node', () => {
    it('should transform data between nodes', async () => {
      if (!process.env.MINIMAX_API_KEY) {
        console.log('Skipping B-6: MINIMAX_API_KEY not set')
        return
      }
      
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
                  prompt: 'A beautiful sunset',
                }],
              },
            },
          },
          {
            id: 'transform-node',
            type: 'transform',
            data: {
              label: 'Extract URL',
              config: {
                transformType: 'extract',
                inputNode: 'image-node',
                inputPath: 'data.image_urls[0]',
              },
            },
          },
        ],
        edges: [{ id: 'e1', source: 'image-node', target: 'transform-node' }],
      }

      const result = await engine.executeWorkflow(JSON.stringify(workflow))

      expect(result.success).toBe(true)
      expect(result.nodeResults.size).toBe(2)
      
      const imageResult = result.nodeResults.get('image-node')
      expect(imageResult?.success).toBe(true)
      
      // Skip if API quota exceeded
      const imageData = imageResult?.data as { base_resp?: { status_code?: number } }
      if (imageData?.base_resp?.status_code === 2056) {
        console.log('Skipping B-6: API quota exceeded')
        return
      }
      
      const transformResult = result.nodeResults.get('transform-node')
      expect(transformResult?.success).toBe(true)
      expect(typeof transformResult?.data).toBe('string')
      expect((transformResult?.data as string)).toMatch(/^https:\/\//)
    }, 30000)
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
describe.skipIf(!hasApiKey)('Workflow Engine - Phase C E2E Tests', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>
  let registry: ReturnType<typeof getServiceNodeRegistry>
  let engine: WorkflowEngine
  let scheduler: CronScheduler

  beforeAll(async () => {
    await createConnection({
      pgHost: process.env.DB_HOST || 'localhost',
      pgPort: parseInt(process.env.DB_PORT || '5432', 10),
      pgUser: process.env.DB_USER || 'postgres',
      pgPassword: process.env.DB_PASSWORD || '',
      pgDatabase: process.env.DB_NAME || 'minimax_agent',
    })
    resetServiceNodeRegistry()
    db = await getDatabase()
    await registerServices(db)
    registry = getServiceNodeRegistry(db)
    engine = new WorkflowEngine(db, registry)
    scheduler = new CronScheduler(db, engine)
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM execution_log_details')
    await conn.execute('DELETE FROM execution_logs')
    await conn.execute('DELETE FROM task_queue')
    await conn.execute('DELETE FROM cron_jobs')
    await conn.execute('DELETE FROM media_records')
  })

  afterAll(async () => {
    resetServiceNodeRegistry()
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
                  source: 'image_generation',
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

      
      await scheduler.executeJobNow(job.id)

      
      const logs = await db.getAllExecutionLogs(undefined, 10)
      const latestLog = logs.find(l => l.job_id === job.id)
      
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
                  source: 'image_generation',
                  filepath: '{{gen-image.output.data.image_urls[0]}}',
                  size_bytes: 0,
                }],
              },
            },
          },
        ]),
        edges_json: JSON.stringify([
          { id: 'e1', source: 'gen-image', target: 'save-result' },
        ]),
        is_public: false,
      }, undefined)

      const job = await db.createCronJob({
        name: 'Test Full Pipeline Job',
        cron_expression: '0 0 1 1 *',
        workflow_id: template.id,
        is_active: false,
      }, undefined)

      
      await scheduler.executeJobNow(job.id)

      
      const logs = await db.getAllExecutionLogs(undefined, 10)
      const latestLog = logs.find(l => l.job_id === job.id)

      expect(latestLog?.status).toBe('completed')
      expect(latestLog?.tasks_executed).toBe(2)

      
      const details = await db.getExecutionLogDetailsByLogId(latestLog!.id)
      expect(details.length).toBe(2)

      
      const nodeIds = details.map(d => d.node_id)
      expect(nodeIds).toContain('gen-image')
      expect(nodeIds).toContain('save-result')

      
      await db.deleteCronJob(job.id, undefined)
      await db.deleteWorkflowTemplate(template.id, null)
    }, 60000)
  })
})