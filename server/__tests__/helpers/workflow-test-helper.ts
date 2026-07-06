import type { DatabaseService } from '../../database/service-async'
import type { ServiceNodeRegistry } from '../../services/service-node-registry'
import { WorkflowEngine } from '../../services/workflow/index'
import { CronScheduler } from '../../services/cron-scheduler'
import { WorkflowService } from '../../services/domain/workflow.service'
import { JobService } from '../../services/domain/job.service'
import { LogService } from '../../services/domain/log.service'
import { WorkflowRepository } from '../../repositories/workflow-repository'
import { JobRepository } from '../../repositories/job-repository'
import { LogRepository } from '../../repositories/log-repository'
import { UserRepository } from '../../repositories/user-repository'
import { ExternalApiLogRepository } from '../../repositories/external-api-log.repository'
import { getGlobalContainer } from '../../container'
import { TOKENS } from '../../service-registration'
import { createMockEventBus } from './mock-event-bus'
import { createMockConcurrencyManager } from './mock-concurrency-manager'

export interface TestWorkflowFixture {
  id: string
  name: string
  nodes_json: string
  edges_json: string
}

export interface TestJobFixture {
  id: string
  workflow_id: string
}

export class WorkflowTestHelper {
  private engine: WorkflowEngine
  private workflowService: WorkflowService
  private jobService: JobService
  private logService: LogService
  private scheduler: CronScheduler | null = null

  private workflows: TestWorkflowFixture[] = []
  private jobs: TestJobFixture[] = []

  constructor(db: DatabaseService, registry: ServiceNodeRegistry) {
    const connection = db.getConnection()
    this.workflowService = new WorkflowService(new WorkflowRepository(connection))
    this.jobService = new JobService(new JobRepository(connection))
    this.logService = new LogService(
      new LogRepository(connection),
      new UserRepository(connection),
      new ExternalApiLogRepository(connection)
    )
    getGlobalContainer().register(TOKENS.WORKFLOW_SERVICE, this.workflowService)
    getGlobalContainer().register(TOKENS.JOB_SERVICE, this.jobService)
    getGlobalContainer().register(TOKENS.LOG_SERVICE, this.logService)
    this.engine = new WorkflowEngine(db, registry, undefined, createMockEventBus())
  }

  async createTestWorkflow(config: {
    id: string
    name: string
    nodes: unknown[]
    edges: unknown[]
  }): Promise<TestWorkflowFixture> {
    const workflow = await this.workflowService.create({
      id: config.id,
      name: config.name,
      description: `Test workflow: ${config.name}`,
      nodes_json: JSON.stringify(config.nodes),
      edges_json: JSON.stringify(config.edges),
      is_public: false,
    }, undefined)

    this.workflows.push(workflow)
    return workflow
  }

  async createTestJob(config: {
    name: string
    workflow_id: string
    cron_expression?: string
  }): Promise<TestJobFixture> {
    const job = await this.jobService.create({
      name: config.name,
      cron_expression: config.cron_expression || '0 0 1 1 *',
      workflow_id: config.workflow_id,
      is_active: false,
    }, undefined)

    this.jobs.push({ id: job.id, workflow_id: config.workflow_id })
    return { id: job.id, workflow_id: config.workflow_id }
  }

  async executeWorkflow(workflowJson: string): Promise<{
    success: boolean
    nodeResults: Map<string, { success: boolean; data?: unknown }>
  }> {
    return this.engine.executeWorkflow(workflowJson)
  }

  async executeJob(jobId: string): Promise<void> {
    if (!this.scheduler) {
      this.scheduler = new CronScheduler(
        this.engine,
        null,
        null,
        createMockEventBus(),
        createMockConcurrencyManager()
      )
    }
    await this.scheduler.executeJobNow(jobId)
  }

  async getLatestExecutionLog(): Promise<{
    id: string
    status: string
    tasks_executed: number
    tasks_succeeded: number
    tasks_failed: number
  } | null> {
    const logs = await this.logService.getAll({ limit: 1 })
    return logs[0] || null
  }

  async getExecutionLogDetails(logId: string): Promise<Array<{
    id: string
    node_id: string
    node_type: string
    success: boolean
    error_message: string | null
  }>> {
    return this.logService.getDetails(logId)
  }

  async cleanup(): Promise<void> {
    for (const job of this.jobs) {
      try {
        await this.jobService.delete(job.id, undefined)
      } catch {}
    }

    for (const workflow of this.workflows) {
      try {
        await this.workflowService.delete(workflow.id, undefined)
      } catch {}
    }

    this.workflows = []
    this.jobs = []
  }
}

export const WORKFLOW_TEMPLATES = {
  singleAction: {
    id: 'test-single-action',
    name: 'Single Action Test',
    nodes: [
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
    edges: [],
  },

  actionWithTransform: {
    id: 'test-action-transform',
    name: 'Action + Transform Test',
    nodes: [
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
      {
        id: 'extract-node',
        type: 'transform',
        data: {
          label: 'Extract Content',
          config: {
            transformType: 'extract',
            inputNode: 'text-node',
            inputPath: 'choices[0].message.content',
          },
        },
      },
    ],
    edges: [{ id: 'e1', source: 'text-node', target: 'extract-node' }],
  },

  imageWithSave: {
    id: 'test-image-save',
    name: 'Image + Save Test',
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
              prompt: 'A test image',
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
              source: 'test',
              filepath: '{{image-node.output.data.image_urls[0]}}',
              size_bytes: 0,
            }],
          },
        },
      },
    ],
    edges: [{ id: 'e1', source: 'image-node', target: 'save-node' }],
  },

  loopWithAction: {
    id: 'test-loop-action',
    name: 'Loop + Action Test',
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
  },

  capacityWithAction: {
    id: 'test-capacity-action',
    name: 'Capacity + Action Test',
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
  },
}
