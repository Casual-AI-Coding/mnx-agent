import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createConnection, getConnection } from '../database/connection.js'
import { DatabaseService } from '../database/service-async.js'
import { TaskStatus, TriggerType, ExecutionStatus } from '../database/types.js'
import type {
  CreateCronJob,
  CreateTaskQueueItem,
  CreateExecutionLog,
  CreateExecutionLogDetail,
} from '../database/types.js'

const testDbName = process.env.DB_TEST_NAME || `${process.env.DB_NAME || 'mnx_agent'}_test`

describe('DatabaseService', () => {
  let db: DatabaseService

  beforeAll(async () => {
    await createConnection({
      pgHost: process.env.DB_HOST || 'localhost',
      pgPort: parseInt(process.env.DB_PORT || '5432', 10),
      pgUser: process.env.DB_USER || 'postgres',
      pgPassword: process.env.DB_PASSWORD || '',
      pgDatabase: testDbName,
    })
    db = new DatabaseService(getConnection())
    await db.init()
  })

  beforeEach(async () => {
    const conn = getConnection()
    await conn.execute('DELETE FROM execution_log_details')
    await conn.execute('DELETE FROM execution_logs')
    await conn.execute('DELETE FROM task_queue')
    await conn.execute('DELETE FROM dead_letter_queue')
    await conn.execute('DELETE FROM webhook_deliveries')
    await conn.execute('DELETE FROM webhook_configs')
    await conn.execute('DELETE FROM job_dependencies')
    await conn.execute('DELETE FROM job_tags')
    await conn.execute('DELETE FROM cron_jobs')
    await conn.execute('DELETE FROM capacity_tracking')
    await conn.execute('DELETE FROM media_records')
    await conn.execute('DELETE FROM prompt_templates')
    await conn.execute('DELETE FROM workflow_templates')
    await conn.execute('DELETE FROM audit_logs')
    await conn.execute('DELETE FROM service_node_permissions')
  })

  afterAll(async () => {
  })

  describe('Connection & Initialization', () => {
    it('should connect to PostgreSQL database', async () => {
      const connected = await db.isConnected()
      expect(connected).toBe(true)
    })

    it('should report as PostgreSQL', () => {
      expect(db.isPostgres()).toBe(true)
    })

    it('should return the database connection', () => {
      const conn = db.getConnection()
      expect(conn).toBeDefined()
      expect(typeof conn.query).toBe('function')
      expect(typeof conn.execute).toBe('function')
    })
  })

  describe('Cron Jobs CRUD', () => {
    describe('Create Cron Job', () => {
      it('should create a cron job with required fields', async () => {
        const jobData: CreateCronJob = {
          name: 'Test Job',
          cron_expression: '0 * * * *',
        }
        const job = await db.createCronJob(jobData)

        expect(job.id).toBeDefined()
        expect(job.name).toBe('Test Job')
        expect(job.cron_expression).toBe('0 * * * *')
        expect(job.is_active).toBe(true)
        expect(job.timezone).toBe('UTC')
        expect(job.timeout_ms).toBe(300000)
        expect(job.total_runs).toBe(0)
        expect(job.total_failures).toBe(0)
      })

      it('should create a cron job with all fields', async () => {
        const template = await db.createWorkflowTemplate({
          name: 'Test Workflow',
          nodes_json: '{"nodes":[]}',
          edges_json: '{"edges":[]}',
        })

        const jobData: CreateCronJob = {
          name: 'Full Job',
          description: 'A complete job',
          cron_expression: '0 0 * * *',
          timezone: 'America/New_York',
          workflow_id: template.id,
          is_active: false,
          timeout_ms: 600000,
        }
        const job = await db.createCronJob(jobData)

        expect(job.name).toBe('Full Job')
        expect(job.description).toBe('A complete job')
        expect(job.timezone).toBe('America/New_York')
        expect(job.workflow_id).toBe(template.id)
        expect(job.is_active).toBe(false)
        expect(job.timeout_ms).toBe(600000)
      })

      it('should create cron job with null workflow_id', async () => {
        const job = await db.createCronJob({
          name: 'No Workflow',
          cron_expression: '0 * * * *',
          workflow_id: null,
        })
        expect(job.workflow_id).toBeNull()
      })
    })

    describe('Read Cron Jobs', () => {
      it('should get all cron jobs', async () => {
        await db.createCronJob({ name: 'Job 1', cron_expression: '0 * * * *' })
        await db.createCronJob({ name: 'Job 2', cron_expression: '0 0 * * *' })

        const jobs = await db.getAllCronJobs()
        expect(jobs.length).toBe(2)
      })

      it('should get only active cron jobs', async () => {
        await db.createCronJob({ name: 'Active Job', cron_expression: '0 * * * *', is_active: true })
        await db.createCronJob({ name: 'Inactive Job', cron_expression: '0 0 * * *', is_active: false })

        const activeJobs = await db.getActiveCronJobs()
        expect(activeJobs.length).toBe(1)
        expect(activeJobs[0].name).toBe('Active Job')
      })

      it('should get cron job by id', async () => {
        const created = await db.createCronJob({ name: 'Find Me', cron_expression: '0 * * * *' })

        const job = await db.getCronJobById(created.id)
        expect(job).not.toBeNull()
        expect(job!.name).toBe('Find Me')
      })

      it('should return null for non-existent id', async () => {
        const job = await db.getCronJobById('non-existent-id')
        expect(job).toBeNull()
      })
    })

    describe('Update Cron Jobs', () => {
      it('should update cron job fields', async () => {
        const created = await db.createCronJob({ name: 'Original', cron_expression: '0 * * * *' })

        const updated = await db.updateCronJob(created.id, {
          name: 'Updated',
          description: 'New description',
        })

        expect(updated!.name).toBe('Updated')
        expect(updated!.description).toBe('New description')
        expect(updated!.cron_expression).toBe('0 * * * *')
      })

      it('should update is_active status via toggle', async () => {
        const created = await db.createCronJob({ name: 'Toggle Test', cron_expression: '0 * * * *' })

        const toggled = await db.toggleCronJobActive(created.id)
        expect(toggled!.is_active).toBe(false)

        const toggledAgain = await db.toggleCronJobActive(created.id)
        expect(toggledAgain!.is_active).toBe(true)
      })

      it('should update run stats', async () => {
        const created = await db.createCronJob({ name: 'Stats Test', cron_expression: '0 * * * *' })

        const stats = {
          success: true,
          tasksExecuted: 5,
          tasksSucceeded: 5,
          tasksFailed: 0,
          durationMs: 1000,
        }
        await db.updateCronJobRunStats(created.id, stats)

        const job = await db.getCronJobById(created.id)
        expect(job!.total_runs).toBe(1)
        expect(job!.total_failures).toBe(0)
      })

      it('should update last run time', async () => {
        const created = await db.createCronJob({ name: 'Last Run Test', cron_expression: '0 * * * *' })
        const nextRun = '2025-01-01T12:00:00.000Z'

        await db.updateCronJobLastRun(created.id, nextRun)

        const job = await db.getCronJobById(created.id)
        expect(job!.last_run_at).toBeDefined()
        expect(job!.next_run_at).toBeTruthy()
      })

      it('should return null when updating non-existent job', async () => {
        const result = await db.updateCronJob('non-existent', { name: 'Test' })
        expect(result).toBeNull()
      })
    })

    describe('Delete Cron Jobs', () => {
      it('should delete cron job by id', async () => {
        const created = await db.createCronJob({ name: 'Delete Me', cron_expression: '0 * * * *' })

        const deleted = await db.deleteCronJob(created.id)
        expect(deleted).toBe(true)

        const job = await db.getCronJobById(created.id)
        expect(job).toBeNull()
      })

      it('should return false when deleting non-existent job', async () => {
        const deleted = await db.deleteCronJob('non-existent-id')
        expect(deleted).toBe(false)
      })
    })
  })

  describe('Task Queue CRUD', () => {
    describe('Create Task', () => {
      it('should create a task with required fields', async () => {
        const taskData: CreateTaskQueueItem = {
          task_type: 'text_generation',
          payload: '{"prompt": "hello"}',
        }
        const task = await db.createTask(taskData)

        expect(task.id).toBeDefined()
        expect(task.task_type).toBe('text_generation')
        const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload
        expect(payload.prompt).toBe('hello')
        expect(task.status).toBe(TaskStatus.PENDING)
        expect(task.priority).toBe(0)
        expect(task.retry_count).toBe(0)
        expect(task.max_retries).toBe(3)
      })

      it('should create task with all fields', async () => {
        const job = await db.createCronJob({ name: 'Task Job', cron_expression: '0 * * * *' })

        const task = await db.createTask({
          job_id: job.id,
          task_type: 'voice_synthesis',
          payload: '{"text": "hello"}',
          priority: 10,
          status: TaskStatus.RUNNING,
          max_retries: 5,
        })

        expect(task.job_id).toBe(job.id)
        expect(task.priority).toBe(10)
        expect(task.status).toBe(TaskStatus.RUNNING)
        expect(task.max_retries).toBe(5)
      })

      it('should create task with valid JSON payload', async () => {
        const task = await db.createTask({
          task_type: 'test',
          payload: JSON.stringify({ key: 'value', num: 123 }),
        })
        const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload
        expect(payload.key).toBe('value')
        expect(payload.num).toBe(123)
      })
    })

    describe('Read Tasks', () => {
      it('should get all tasks', async () => {
        await db.createTask({ task_type: 'type1', payload: '{}' })
        await db.createTask({ task_type: 'type2', payload: '{}' })

        const result = await db.getAllTasks()
        expect(result.tasks.length).toBe(2)
        expect(result.total).toBe(2)
      })

      it('should filter tasks by status', async () => {
        await db.createTask({ task_type: 'pending', payload: '{}', status: TaskStatus.PENDING })
        await db.createTask({ task_type: 'running', payload: '{}', status: TaskStatus.RUNNING })

        const result = await db.getAllTasks({ status: TaskStatus.PENDING })
        expect(result.tasks.length).toBe(1)
        expect(result.tasks[0].task_type).toBe('pending')
      })

      it('should get task by id', async () => {
        const created = await db.createTask({ task_type: 'find', payload: '{}' })

        const task = await db.getTaskById(created.id)
        expect(task!.task_type).toBe('find')
      })

      it('should get pending tasks by job', async () => {
        const job = await db.createCronJob({ name: 'Task Job', cron_expression: '0 * * * *' })
        await db.createTask({ job_id: job.id, task_type: 't1', payload: '{}' })
        await db.createTask({ job_id: job.id, task_type: 't2', payload: '{}' })

        const tasks = await db.getPendingTasksByJob(job.id, 10)
        expect(tasks.length).toBe(2)
      })

      it('should get pending task count', async () => {
        await db.createTask({ task_type: 't1', payload: '{}' })
        await db.createTask({ task_type: 't2', payload: '{}' })

        const count = await db.getPendingTaskCount()
        expect(count).toBe(2)
      })

      it('should get running task count', async () => {
        await db.createTask({ task_type: 't1', payload: '{}', status: TaskStatus.RUNNING })
        await db.createTask({ task_type: 't2', payload: '{}', status: TaskStatus.PENDING })

        const count = await db.getRunningTaskCount()
        expect(count).toBe(1)
      })

      it('should get failed task count', async () => {
        await db.createTask({ task_type: 't1', payload: '{}', status: TaskStatus.FAILED })
        await db.createTask({ task_type: 't2', payload: '{}', status: TaskStatus.PENDING })

        const count = await db.getFailedTaskCount()
        expect(count).toBe(1)
      })
    })

    describe('Update Tasks', () => {
      it('should update task status', async () => {
        const created = await db.createTask({ task_type: 'test', payload: '{}' })

        const updated = await db.updateTask(created.id, { status: TaskStatus.RUNNING })
        expect(updated!.status).toBe(TaskStatus.RUNNING)
      })

      it('should mark task as running', async () => {
        const created = await db.createTask({ task_type: 'test', payload: '{}' })

        const task = await db.markTaskRunning(created.id)
        expect(task!.status).toBe(TaskStatus.RUNNING)
        expect(task!.started_at).toBeDefined()
      })

      it('should mark task as completed', async () => {
        const created = await db.createTask({ task_type: 'test', payload: '{}' })

        const task = await db.markTaskCompleted(created.id, '{"result": "success"}')
        expect(task!.status).toBe(TaskStatus.COMPLETED)
        expect(task!.completed_at).toBeDefined()
        const result = typeof task!.result === 'string' ? JSON.parse(task!.result) : task!.result
        expect(result.result).toBe('success')
      })

      it('should mark task as failed', async () => {
        const created = await db.createTask({ task_type: 'test', payload: '{}', max_retries: 1 })

        const task = await db.markTaskFailed(created.id, 'Something went wrong')
        expect(task!.status).toBe(TaskStatus.FAILED)
        expect(task!.retry_count).toBe(1)
        expect(task!.error_message).toBe('Something went wrong')
      })

      it('should retry failed task up to max_retries', async () => {
        const created = await db.createTask({ task_type: 'test', payload: '{}', max_retries: 3 })

        let task = await db.markTaskFailed(created.id, 'Error 1')
        expect(task!.status).toBe(TaskStatus.PENDING)
        expect(task!.retry_count).toBe(1)

        task = await db.markTaskFailed(created.id, 'Error 2')
        expect(task!.status).toBe(TaskStatus.PENDING)
        expect(task!.retry_count).toBe(2)

        task = await db.markTaskFailed(created.id, 'Error 3')
        expect(task!.status).toBe(TaskStatus.FAILED)
        expect(task!.retry_count).toBe(3)
      })

      it('should batch update task statuses', async () => {
        const t1 = await db.createTask({ task_type: 't1', payload: '{}' })
        const t2 = await db.createTask({ task_type: 't2', payload: '{}' })
        const t3 = await db.createTask({ task_type: 't3', payload: '{}' })

        const count = await db.updateTasksStatusBatch([t1.id, t2.id, t3.id], TaskStatus.CANCELLED)
        expect(count).toBe(3)

        const task1 = await db.getTaskById(t1.id)
        expect(task1!.status).toBe(TaskStatus.CANCELLED)
      })
    })

    describe('Delete Tasks', () => {
      it('should delete task by id', async () => {
        const created = await db.createTask({ task_type: 'delete', payload: '{}' })

        const deleted = await db.deleteTask(created.id)
        expect(deleted).toBe(true)

        const task = await db.getTaskById(created.id)
        expect(task).toBeNull()
      })
    })
  })

  describe('Execution Logs CRUD', () => {
    describe('Create Execution Log', () => {
      it('should create an execution log', async () => {
        const logData: CreateExecutionLog = {
          job_id: null,
          trigger_type: TriggerType.CRON,
          status: ExecutionStatus.RUNNING,
        }
        const log = await db.createExecutionLog(logData)

        expect(log.id).toBeDefined()
        expect(log.job_id).toBeNull()
        expect(log.trigger_type).toBe(TriggerType.CRON)
        expect(log.status).toBe(ExecutionStatus.RUNNING)
        expect(log.tasks_executed).toBe(0)
        expect(log.tasks_succeeded).toBe(0)
        expect(log.tasks_failed).toBe(0)
      })

      it('should create execution log with job_id', async () => {
        const job = await db.createCronJob({ name: 'Log Job', cron_expression: '0 * * * *' })

        const logData: CreateExecutionLog = {
          job_id: job.id,
          trigger_type: TriggerType.CRON,
          status: ExecutionStatus.RUNNING,
        }
        const log = await db.createExecutionLog(logData)

        expect(log.job_id).toBe(job.id)
      })
    })

    describe('Read Execution Logs', () => {
      it('should get all execution logs', async () => {
        await db.createExecutionLog({ trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })
        await db.createExecutionLog({ trigger_type: TriggerType.MANUAL, status: ExecutionStatus.RUNNING })

        const logs = await db.getAllExecutionLogs()
        expect(logs.length).toBe(2)
      })

      it('should get execution logs by job_id', async () => {
        const job1 = await db.createCronJob({ name: 'Job 1', cron_expression: '0 * * * *' })
        const job2 = await db.createCronJob({ name: 'Job 2', cron_expression: '0 0 * * *' })

        await db.createExecutionLog({ job_id: job1.id, trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })
        await db.createExecutionLog({ job_id: job2.id, trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })

        const logs = await db.getAllExecutionLogs(job1.id)
        expect(logs.length).toBe(1)
        expect(logs[0].job_id).toBe(job1.id)
      })

      it('should get execution log by id', async () => {
        const created = await db.createExecutionLog({ trigger_type: TriggerType.MANUAL, status: ExecutionStatus.RUNNING })

        const log = await db.getExecutionLogById(created.id)
        expect(log!.trigger_type).toBe(TriggerType.MANUAL)
      })

      it('should get paginated execution logs', async () => {
        for (let i = 0; i < 5; i++) {
          await db.createExecutionLog({ trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })
        }

        const result = await db.getExecutionLogsPaginated({ limit: 2, offset: 0 })
        expect(result.logs.length).toBe(2)
        expect(result.total).toBe(5)
      })
    })

    describe('Update Execution Logs', () => {
      it('should update execution log', async () => {
        const created = await db.createExecutionLog({ trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })

        const updated = await db.updateExecutionLog(created.id, {
          status: ExecutionStatus.COMPLETED,
          duration_ms: 5000,
          tasks_executed: 10,
          tasks_succeeded: 9,
          tasks_failed: 1,
        })

        expect(updated!.status).toBe(ExecutionStatus.COMPLETED)
        expect(updated!.duration_ms).toBe(5000)
        expect(updated!.tasks_executed).toBe(10)
        expect(updated!.tasks_succeeded).toBe(9)
        expect(updated!.tasks_failed).toBe(1)
      })

      it('should complete execution log with stats', async () => {
        const created = await db.createExecutionLog({ trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })

        const stats = {
          success: true,
          tasksExecuted: 5,
          tasksSucceeded: 5,
          tasksFailed: 0,
          durationMs: 3000,
        }
        await db.completeExecutionLog(created.id, stats)

        const log = await db.getExecutionLogById(created.id)
        expect(log!.status).toBe(ExecutionStatus.COMPLETED)
        expect(log!.tasks_executed).toBe(5)
      })
    })

    describe('Execution Log Details', () => {
      it('should create execution log detail', async () => {
        const log = await db.createExecutionLog({ trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })

        const detailData: CreateExecutionLogDetail = {
          log_id: log.id,
          node_id: 'node-1',
          node_type: 'action',
          service_name: 'text_service',
          method_name: 'generate',
          input_payload: '{"prompt": "hello"}',
          output_result: '{"text": "response"}',
        }
        const detailId = await db.createExecutionLogDetail(detailData)

        expect(detailId).toBeDefined()

        const details = await db.getExecutionLogDetailsByLogId(log.id)
        expect(details.length).toBe(1)
        expect(details[0].node_id).toBe('node-1')
      })

      it('should update execution log detail', async () => {
        const log = await db.createExecutionLog({ trigger_type: TriggerType.CRON, status: ExecutionStatus.RUNNING })
        const detailId = await db.createExecutionLogDetail({
          log_id: log.id,
          node_id: 'node-1',
          service_name: 'test',
          method_name: 'test',
        })

        await db.updateExecutionLogDetail(detailId, {
          output_result: '{"success": true}',
          completed_at: new Date().toISOString(),
          duration_ms: 100,
        })

        const details = await db.getExecutionLogDetailsByLogId(log.id)
        const outputResult = typeof details[0].output_result === 'string' ? JSON.parse(details[0].output_result) : details[0].output_result
        expect(outputResult.success).toBe(true)
        expect(details[0].duration_ms).toBe(100)
      })
    })
  })

  describe('Capacity Tracking', () => {
    it('should get all capacity records', async () => {
      await db.upsertCapacityRecord('text', { remaining_quota: 100, total_quota: 1000 })
      await db.upsertCapacityRecord('voice', { remaining_quota: 50, total_quota: 500 })

      const records = await db.getAllCapacityRecords()
      expect(records.length).toBe(2)
    })

    it('should get capacity by service type', async () => {
      await db.upsertCapacityRecord('text', { remaining_quota: 100, total_quota: 1000 })

      const record = await db.getCapacityByService('text')
      expect(record!.service_type).toBe('text')
      expect(record!.remaining_quota).toBe(100)
      expect(record!.total_quota).toBe(1000)
    })

    it('should return null for non-existent service', async () => {
      const record = await db.getCapacityByService('non-existent')
      expect(record).toBeNull()
    })

    it('should upsert capacity record', async () => {
      await db.upsertCapacityRecord('text', { remaining_quota: 100, total_quota: 1000 })
      await db.upsertCapacityRecord('text', { remaining_quota: 80, total_quota: 1000 })

      const record = await db.getCapacityByService('text')
      expect(record!.remaining_quota).toBe(80)
    })

    it('should decrement capacity', async () => {
      await db.upsertCapacityRecord('text', { remaining_quota: 100, total_quota: 1000 })

      const record = await db.decrementCapacity('text', 10)
      expect(record!.remaining_quota).toBe(90)
    })

    it('should not go below zero when decrementing', async () => {
      await db.upsertCapacityRecord('text', { remaining_quota: 5, total_quota: 1000 })

      const record = await db.decrementCapacity('text', 10)
      expect(record!.remaining_quota).toBe(0)
    })

    it('should return null when decrementing non-existent', async () => {
      const record = await db.decrementCapacity('non-existent', 1)
      expect(record).toBeNull()
    })
  })

  describe('Workflow Templates CRUD', () => {
    describe('Create Workflow Template', () => {
      it('should create a workflow template', async () => {
        const template = await db.createWorkflowTemplate({
          name: 'My Template',
          nodes_json: '{"nodes":[]}',
          edges_json: '{"edges":[]}',
        })

        expect(template.id).toBeDefined()
        expect(template.name).toBe('My Template')
        expect(template.is_public).toBe(true)
      })

      it('should create private template', async () => {
        const template = await db.createWorkflowTemplate({
          name: 'Private Template',
          nodes_json: '{"nodes":[]}',
          edges_json: '{"edges":[]}',
          is_public: false,
        })

        expect(template.is_public).toBe(false)
      })

      it('should create template with proper JSON fields', async () => {
        const nodes = { nodes: [{ id: '1', type: 'trigger' }] }
        const edges = { edges: [{ id: 'e1', source: '1', target: '2' }] }

        const template = await db.createWorkflowTemplate({
          name: 'JSON Template',
          nodes_json: JSON.stringify(nodes),
          edges_json: JSON.stringify(edges),
        })

        expect(template.nodes_json).toBe(JSON.stringify(nodes))
        expect(template.edges_json).toBe(JSON.stringify(edges))
      })
    })

    describe('Read Workflow Templates', () => {
      it('should get all templates', async () => {
        await db.createWorkflowTemplate({ name: 'T1', nodes_json: '{}', edges_json: '{}' })
        await db.createWorkflowTemplate({ name: 'T2', nodes_json: '{}', edges_json: '{}' })

        const templates = await db.getAllWorkflowTemplates()
        expect(templates.length).toBe(2)
      })

      it('should get template by id', async () => {
        const created = await db.createWorkflowTemplate({ name: 'Find Me', nodes_json: '{}', edges_json: '{}' })

        const template = await db.getWorkflowTemplateById(created.id)
        expect(template!.name).toBe('Find Me')
      })

      it('should return null for non-existent template', async () => {
        const template = await db.getWorkflowTemplateById('non-existent')
        expect(template).toBeNull()
      })

      it('should get public templates', async () => {
        await db.createWorkflowTemplate({ name: 'Public', nodes_json: '{}', edges_json: '{}', is_public: true })
        await db.createWorkflowTemplate({ name: 'Private', nodes_json: '{}', edges_json: '{}', is_public: false })

        const publicTemplates = await db.getMarkedWorkflowTemplates()
        expect(publicTemplates.length).toBe(1)
        expect(publicTemplates[0].name).toBe('Public')
      })

      it('should get paginated templates', async () => {
        for (let i = 0; i < 5; i++) {
          await db.createWorkflowTemplate({ name: `T${i}`, nodes_json: '{}', edges_json: '{}' })
        }

        const result = await db.getWorkflowTemplatesPaginated({ limit: 2, offset: 0 })
        expect(result.templates.length).toBe(2)
        expect(result.total).toBe(5)
      })
    })

    describe('Update Workflow Templates', () => {
      it('should update template fields', async () => {
        const created = await db.createWorkflowTemplate({ name: 'Original', nodes_json: '{}', edges_json: '{}' })

        const updated = await db.updateWorkflowTemplate(created.id, {
          name: 'Updated',
          description: 'New description',
        })

        expect(updated!.name).toBe('Updated')
        expect(updated!.description).toBe('New description')
      })

      it('should update nodes and edges JSON', async () => {
        const created = await db.createWorkflowTemplate({ name: 'Test', nodes_json: '{}', edges_json: '{}' })

        const newNodes = '{"nodes":[{"id":"1"}]}'
        const newEdges = '{"edges":[{"id":"1"}]}'

        const updated = await db.updateWorkflowTemplate(created.id, {
          nodes_json: newNodes,
          edges_json: newEdges,
        })

        expect(updated!.nodes_json).toBe(newNodes)
        expect(updated!.edges_json).toBe(newEdges)
      })
    })

    describe('Delete Workflow Templates', () => {
      it('should delete template by id', async () => {
        const created = await db.createWorkflowTemplate({ name: 'Delete Me', nodes_json: '{}', edges_json: '{}' })

        const deleted = await db.deleteWorkflowTemplate(created.id)
        expect(deleted).toBe(true)

        const template = await db.getWorkflowTemplateById(created.id)
        expect(template).toBeNull()
      })
    })
  })

  describe('Webhooks CRUD', () => {
    it('should create and retrieve webhook config', async () => {
      const conn = getConnection()
      const id = 'webhook-' + Date.now()
      const now = new Date().toISOString()

      await conn.execute(
        `INSERT INTO webhook_configs (id, name, url, events, headers, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          'Test Webhook',
          'https://example.com/webhook',
          JSON.stringify(['on_start', 'on_success', 'on_failure']),
          JSON.stringify({ 'Authorization': 'Bearer token' }),
          true,
          now,
          now,
        ]
      )

      const rows = await conn.query<{
        id: string
        name: string
        url: string
        events: string
        headers: string | null
        is_active: boolean
      }>('SELECT * FROM webhook_configs WHERE id = $1', [id])

      expect(rows.length).toBe(1)
      expect(rows[0].name).toBe('Test Webhook')
      expect(rows[0].url).toBe('https://example.com/webhook')
      expect(rows[0].is_active).toBe(true)
    })

    it('should update webhook active status', async () => {
      const conn = getConnection()
      const id = 'webhook-update-' + Date.now()
      const now = new Date().toISOString()

      await conn.execute(
        `INSERT INTO webhook_configs (id, name, url, events, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, 'Test', 'https://example.com', JSON.stringify(['on_success']), true, now, now]
      )

      await conn.execute(
        'UPDATE webhook_configs SET is_active = $1, updated_at = $2 WHERE id = $3',
        [false, now, id]
      )

      const rows = await conn.query<{ is_active: boolean }>('SELECT is_active FROM webhook_configs WHERE id = $1', [id])
      expect(rows[0].is_active).toBe(false)
    })

    it('should delete webhook', async () => {
      const conn = getConnection()
      const id = 'webhook-delete-' + Date.now()
      const now = new Date().toISOString()

      await conn.execute(
        `INSERT INTO webhook_configs (id, name, url, events, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, 'Test', 'https://example.com', JSON.stringify(['on_success']), true, now, now]
      )

      await conn.execute('DELETE FROM webhook_configs WHERE id = $1', [id])

      const rows = await conn.query('SELECT * FROM webhook_configs WHERE id = $1', [id])
      expect(rows.length).toBe(0)
    })
  })

  describe('Dead Letter Queue', () => {
    it('should add item to dead letter queue', async () => {
      const conn = getConnection()
      const id = 'dlq-' + Date.now()

      await conn.execute(
        `INSERT INTO dead_letter_queue (id, task_type, payload, error_message, retry_count, max_retries, failed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          'text_generation',
          JSON.stringify({ prompt: 'test' }),
          'Max retries exceeded',
          3,
          3,
          new Date().toISOString(),
          new Date().toISOString(),
        ]
      )

      const rows = await conn.query<{
        id: string
        task_type: string
        payload: string
        error_message: string | null
        retry_count: number
      }>('SELECT * FROM dead_letter_queue WHERE id = $1', [id])

      expect(rows.length).toBe(1)
      expect(rows[0].task_type).toBe('text_generation')
      expect(rows[0].retry_count).toBe(3)
    })

    it('should resolve dead letter queue item', async () => {
      const conn = getConnection()
      const id = 'dlq-resolve-' + Date.now()
      const now = new Date().toISOString()

      await conn.execute(
        `INSERT INTO dead_letter_queue (id, task_type, payload, error_message, retry_count, max_retries, failed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, 'text', '{}', 'Error', 3, 3, now, now]
      )

      await conn.execute(
        'UPDATE dead_letter_queue SET resolved_at = $1, resolution = $2 WHERE id = $3',
        [now, 'Manually resolved', id]
      )

      const rows = await conn.query<{ resolved_at: string | null; resolution: string | null }>(
        'SELECT resolved_at, resolution FROM dead_letter_queue WHERE id = $1',
        [id]
      )

      expect(rows[0].resolved_at).toBeDefined()
      expect(rows[0].resolution).toBe('Manually resolved')
    })
  })

  describe('Job Tags', () => {
    it('should add tags to job', async () => {
      const conn = getConnection()
      const job = await db.createCronJob({ name: 'Tagged Job', cron_expression: '0 * * * *' })
      const now = new Date().toISOString()

      await conn.execute(
        'INSERT INTO job_tags (id, job_id, tag, created_at) VALUES ($1, $2, $3, $4)',
        ['tag-1-' + Date.now(), job.id, 'production', now]
      )
      await conn.execute(
        'INSERT INTO job_tags (id, job_id, tag, created_at) VALUES ($1, $2, $3, $4)',
        ['tag-2-' + Date.now(), job.id, 'important', now]
      )

      const rows = await conn.query<{ tag: string }>(
        'SELECT tag FROM job_tags WHERE job_id = $1 ORDER BY tag',
        [job.id]
      )
      expect(rows.length).toBe(2)
      expect(rows[0].tag).toBe('important')
      expect(rows[1].tag).toBe('production')
    })
  })

  describe('Job Dependencies', () => {
    it('should create job dependency', async () => {
      const conn = getConnection()

      const job1 = await db.createCronJob({ name: 'Job 1', cron_expression: '0 * * * *' })
      const job2 = await db.createCronJob({ name: 'Job 2', cron_expression: '0 0 * * *' })
      const now = new Date().toISOString()

      await conn.execute(
        'INSERT INTO job_dependencies (id, job_id, depends_on_job_id, created_at) VALUES ($1, $2, $3, $4)',
        ['dep-' + Date.now(), job2.id, job1.id, now]
      )

      const rows = await conn.query<{ job_id: string; depends_on_job_id: string }>(
        'SELECT job_id, depends_on_job_id FROM job_dependencies WHERE job_id = $1',
        [job2.id]
      )

      expect(rows.length).toBe(1)
      expect(rows[0].depends_on_job_id).toBe(job1.id)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty cron expression', async () => {
      const job = await db.createCronJob({ name: 'Empty Expr', cron_expression: '' })
      expect(job.cron_expression).toBe('')
    })

    it('should handle null workflow_id', async () => {
      const job = await db.createCronJob({ name: 'No Workflow', cron_expression: '0 * * * *' })
      expect(job.workflow_id).toBeNull()
    })

    it('should handle task with JSON payload', async () => {
      const task = await db.createTask({ task_type: 'empty', payload: '{}' })
      const payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : task.payload
      expect(payload).toEqual({})
    })

    it('should handle execution log with null job_id', async () => {
      const log = await db.createExecutionLog({ trigger_type: TriggerType.MANUAL, status: ExecutionStatus.RUNNING })
      expect(log.job_id).toBeNull()
    })

    it('should handle capacity with zero remaining', async () => {
      await db.upsertCapacityRecord('zero_service', { remaining_quota: 0, total_quota: 100 })

      const record = await db.getCapacityByService('zero_service')
      expect(record!.remaining_quota).toBe(0)
    })

    it('should handle template with JSON fields', async () => {
      const template = await db.createWorkflowTemplate({ name: 'JSON Template', nodes_json: '{}', edges_json: '{}' })
      expect(template.nodes_json).toBe('{}')
    })

    it('should correctly count tasks by status', async () => {
      await db.createTask({ task_type: 't1', payload: '{}', status: TaskStatus.PENDING })
      await db.createTask({ task_type: 't2', payload: '{}', status: TaskStatus.PENDING })
      await db.createTask({ task_type: 't3', payload: '{}', status: TaskStatus.RUNNING })
      await db.createTask({ task_type: 't4', payload: '{}', status: TaskStatus.COMPLETED })
      await db.createTask({ task_type: 't5', payload: '{}', status: TaskStatus.FAILED })

      const counts = await db.getTaskCountsByStatus()
      expect(counts.pending).toBe(2)
      expect(counts.running).toBe(1)
      expect(counts.completed).toBe(1)
      expect(counts.failed).toBe(1)
      expect(counts.total).toBe(5)
    })

    it('should get queue stats for specific job', async () => {
      const job1 = await db.createCronJob({ name: 'Job 1', cron_expression: '0 * * * *' })
      const job2 = await db.createCronJob({ name: 'Job 2', cron_expression: '0 0 * * *' })

      await db.createTask({ job_id: job1.id, task_type: 't1', payload: '{}', status: TaskStatus.PENDING })
      await db.createTask({ job_id: job1.id, task_type: 't2', payload: '{}', status: TaskStatus.COMPLETED })
      await db.createTask({ job_id: job2.id, task_type: 't3', payload: '{}', status: TaskStatus.PENDING })

      const stats = await db.getQueueStats(job1.id)
      expect(stats.pending).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.total).toBe(2)
    })

    it('should return null when decrementing capacity for non-existent service', async () => {
      const record = await db.decrementCapacity('completely-nonexistent-service', 1)
      expect(record).toBeNull()
    })

    it('should handle ISO date strings correctly', async () => {
      const job = await db.createCronJob({ name: 'Date Test', cron_expression: '0 * * * *' })
      expect(job.created_at).toBeDefined()
      expect(job.created_at).toBeTruthy()
    })
  })
})
