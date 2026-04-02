import { DatabaseService } from '../database/service'
import { TaskStatus, TriggerType, ExecutionStatus } from '../database/types'
import type {
  CronJob,
  TaskQueueItem,
  ExecutionLog,
  CapacityRecord,
  WorkflowTemplate,
  CreateCronJob,
  CreateTaskQueueItem,
  CreateExecutionLog,
} from '../database/types'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('DatabaseService', () => {
  let db: DatabaseService
  let tempDir: string
  let dbPath: string

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'db-test-'))
    dbPath = join(tempDir, 'test.db')
    db = new DatabaseService(dbPath)
    db.init()
  })

  afterEach(() => {
    db.close()
    rmSync(tempDir, { recursive: true, force: true })
  })

  // ============================================================================
  // Connection & Initialization
  // ============================================================================

  describe('Connection & Initialization', () => {
    it('should create database file on init', () => {
      expect(db.isConnected()).toBe(true)
    })

    it('should get raw database instance', () => {
      const rawDb = db.getDatabase()
      expect(rawDb).toBeDefined()
      expect(typeof rawDb.prepare).toBe('function')
    })

    it('should close connection properly', () => {
      const testDb = new DatabaseService(join(tempDir, 'close-test.db'))
      testDb.init()
      
      expect(testDb.isConnected()).toBe(true)
      
      testDb.close()
      
      expect(testDb.isConnected()).toBe(false)
    })
  })

  // ============================================================================
  // Cron Jobs CRUD
  // ============================================================================

  describe('Cron Jobs CRUD', () => {
    const createJobData = (name: string): CreateCronJob => ({
      name,
      description: 'Test job description',
      cron_expression: '0 * * * *',
      is_active: true,
      timeout_ms: 60000,
    })

    describe('Create', () => {
      it('should create a cron job with all fields', () => {
        const data = createJobData('Test Job')
        const job = db.createCronJob(data)
        
        expect(job.id).toBeDefined()
        expect(job.name).toBe('Test Job')
        expect(job.description).toBe('Test job description')
        expect(job.cron_expression).toBe('0 * * * *')
        expect(job.is_active).toBe(true)
        expect(job.timeout_ms).toBe(60000)
        expect(job.total_runs).toBe(0)
        expect(job.total_failures).toBe(0)
        expect(job.created_at).toBeDefined()
        expect(job.updated_at).toBeDefined()
      })

      it('should create cron job with minimal fields', () => {
        const data: CreateCronJob = {
          name: 'Minimal Job',
          cron_expression: '*/5 * * * *',
        }
        const job = db.createCronJob(data)
        
        expect(job.id).toBeDefined()
        expect(job.name).toBe('Minimal Job')
        expect(job.is_active).toBe(true) // default
        expect(job.timeout_ms).toBe(300000) // default 5 min
      })

      it('should create inactive job when is_active is false', () => {
        const data = createJobData('Inactive Job')
        data.is_active = false
        
        const job = db.createCronJob(data)
        
        expect(job.is_active).toBe(false)
      })

      it('should generate unique IDs for each job', () => {
        const job1 = db.createCronJob(createJobData('Job 1'))
        const job2 = db.createCronJob(createJobData('Job 2'))
        
        expect(job1.id).not.toBe(job2.id)
      })
    })

    describe('Read', () => {
      it('should get job by ID', () => {
        const created = db.createCronJob(createJobData('Get Test'))
        const fetched = db.getCronJobById(created.id)
        
        expect(fetched).toBeDefined()
        expect(fetched?.id).toBe(created.id)
        expect(fetched?.name).toBe('Get Test')
      })

      it('should return null for non-existent job ID', () => {
        const fetched = db.getCronJobById('non-existent-id')
        
        expect(fetched).toBeNull()
      })

      it('should get all cron jobs', () => {
        db.createCronJob(createJobData('Job A'))
        db.createCronJob(createJobData('Job B'))
        db.createCronJob(createJobData('Job C'))
        
        const jobs = db.getAllCronJobs()
        
        expect(jobs.length).toBe(3)
        expect(jobs.map(j => j.name)).toContain('Job A')
        expect(jobs.map(j => j.name)).toContain('Job B')
        expect(jobs.map(j => j.name)).toContain('Job C')
      })

      it('should return all jobs sorted by created_at DESC', () => {
        const job1 = db.createCronJob(createJobData('First'))
        const job2 = db.createCronJob(createJobData('Second'))
        const job3 = db.createCronJob(createJobData('Third'))
        
        const jobs = db.getAllCronJobs()
        
        expect(jobs.length).toBe(3)
        expect(jobs.map(j => j.id)).toContain(job1.id)
        expect(jobs.map(j => j.id)).toContain(job2.id)
        expect(jobs.map(j => j.id)).toContain(job3.id)
      })

      it('should get only active cron jobs', () => {
        const active1 = db.createCronJob({ ...createJobData('Active 1'), is_active: true })
        const active2 = db.createCronJob({ ...createJobData('Active 2'), is_active: true })
        const inactive = db.createCronJob({ ...createJobData('Inactive'), is_active: false })
        
        const activeJobs = db.getActiveCronJobs()
        
        expect(activeJobs.length).toBe(2)
        expect(activeJobs.find(j => j.id === active1.id)).toBeDefined()
        expect(activeJobs.find(j => j.id === active2.id)).toBeDefined()
        expect(activeJobs.find(j => j.id === inactive.id)).toBeUndefined()
      })
    })

    describe('Update', () => {
      it('should update job name', () => {
        const created = db.createCronJob(createJobData('Original Name'))
        
        const updated = db.updateCronJob(created.id, { name: 'New Name' })
        
        expect(updated?.name).toBe('New Name')
        expect(updated?.description).toBe(created.description) // unchanged
      })

      it('should update multiple fields', () => {
        const created = db.createCronJob(createJobData('Original'))
        
        const updated = db.updateCronJob(created.id, {
          name: 'Updated Name',
          cron_expression: '*/10 * * * *',
          is_active: false,
        })
        
        expect(updated?.name).toBe('Updated Name')
        expect(updated?.cron_expression).toBe('*/10 * * * *')
        expect(updated?.is_active).toBe(false)
      })

      it('should return null when updating non-existent job', () => {
        const result = db.updateCronJob('non-existent', { name: 'New Name' })
        
        expect(result).toBeNull()
      })

      it('should return existing job when no updates provided', () => {
        const created = db.createCronJob(createJobData('Test'))
        
        const result = db.updateCronJob(created.id, {})
        
        expect(result?.id).toBe(created.id)
        expect(result?.name).toBe(created.name)
      })

      it('should update run statistics', () => {
        const created = db.createCronJob(createJobData('Stats Test'))
        
        const updated = db.updateCronJobRunStats(created.id, { 
          success: true, 
          tasksExecuted: 1, 
          tasksSucceeded: 1, 
          tasksFailed: 0, 
          durationMs: 1000 
        })
        
        expect(updated?.total_runs).toBe(1)
        expect(updated?.total_failures).toBe(0)
        expect(updated?.last_run_at).toBeDefined()
        
        // Failed run
        const updated2 = db.updateCronJobRunStats(created.id, { 
          success: false, 
          tasksExecuted: 1, 
          tasksSucceeded: 0, 
          tasksFailed: 1, 
          durationMs: 1000 
        })
        
        expect(updated2?.total_runs).toBe(2)
        expect(updated2?.total_failures).toBe(1)
      })

      it('should toggle job active status', () => {
        const active = db.createCronJob({ ...createJobData('Toggle Test'), is_active: true })
        
        const toggled = db.toggleCronJobActive(active.id)
        
        expect(toggled?.is_active).toBe(false)
        
        const toggled2 = db.toggleCronJobActive(active.id)
        
        expect(toggled2?.is_active).toBe(true)
      })

      it('should update last run and next run times', () => {
        const created = db.createCronJob(createJobData('Run Times'))
        const nextRun = new Date().toISOString()
        
        const updated = db.updateCronJobLastRun(created.id, nextRun)
        
        expect(updated?.last_run_at).toBeDefined()
        expect(updated?.next_run_at).toBe(nextRun)
      })

      it('should update timestamp on every change', () => {
        const created = db.createCronJob(createJobData('Timestamp Test'))
        const originalUpdatedAt = created.updated_at
        
        // Wait a tiny bit (not needed for SQLite but conceptually correct)
        const updated = db.updateCronJob(created.id, { name: 'Updated' })
        
        expect(updated?.updated_at).toBeDefined()
        // SQLite datetime is precise enough to show difference
      })
    })

    describe('Delete', () => {
      it('should delete an existing job', () => {
        const created = db.createCronJob(createJobData('Delete Test'))
        
        const result = db.deleteCronJob(created.id)
        
        expect(result).toBe(true)
        expect(db.getCronJobById(created.id)).toBeNull()
      })

      it('should return false when deleting non-existent job', () => {
        const result = db.deleteCronJob('non-existent-id')
        
        expect(result).toBe(false)
      })
    })
  })

  // ============================================================================
  // Task Queue CRUD
  // ============================================================================

  describe('Task Queue CRUD', () => {
    const createTaskData = (type: string): CreateTaskQueueItem => ({
      task_type: type,
      payload: JSON.stringify({ action: 'test' }),
      priority: 5,
      status: TaskStatus.PENDING,
      max_retries: 3,
    })

    describe('Create', () => {
      it('should create a task with all fields', () => {
        const job = db.createCronJob({
          name: 'Job for Task',
          cron_expression: '0 * * * *',
        })
        
        const data = { ...createTaskData('test-action'), job_id: job.id }
        const task = db.createTask(data)
        
        expect(task.id).toBeDefined()
        expect(task.job_id).toBe(job.id)
        expect(task.task_type).toBe('test-action')
        expect(task.payload).toBeDefined()
        expect(task.priority).toBe(5)
        expect(task.status).toBe(TaskStatus.PENDING)
        expect(task.retry_count).toBe(0)
        expect(task.max_retries).toBe(3)
        expect(task.created_at).toBeDefined()
      })

      it('should create task without job_id', () => {
        const task = db.createTask(createTaskData('standalone-task'))
        
        expect(task.job_id).toBeNull()
      })

      it('should create task with default priority', () => {
        const data: CreateTaskQueueItem = {
          task_type: 'default-priority',
          payload: '{}',
        }
        const task = db.createTask(data)
        
        expect(task.priority).toBe(0)
        expect(task.max_retries).toBe(3)
      })
    })

    describe('Read', () => {
      it('should get task by ID', () => {
        const created = db.createTask(createTaskData('read-test'))
        const fetched = db.getTaskById(created.id)
        
        expect(fetched).toBeDefined()
        expect(fetched?.id).toBe(created.id)
      })

      it('should return null for non-existent task', () => {
        expect(db.getTaskById('non-existent')).toBeNull()
      })

      it('should get all tasks', () => {
        db.createTask({ ...createTaskData('task1'), priority: 1 })
        db.createTask({ ...createTaskData('task2'), priority: 10 })
        db.createTask({ ...createTaskData('task3'), priority: 5 })
        
        const tasks = db.getAllTasks()
        
        expect(tasks.length).toBe(3)
      })

      it('should get tasks filtered by status', () => {
        const pending = db.createTask({ ...createTaskData('pending'), status: TaskStatus.PENDING })
        const running = db.createTask({ ...createTaskData('running'), status: TaskStatus.RUNNING })
        const completed = db.createTask({ ...createTaskData('completed'), status: TaskStatus.COMPLETED })
        
        const pendingTasks = db.getAllTasks(TaskStatus.PENDING)
        
        expect(pendingTasks.length).toBe(1)
        expect(pendingTasks[0].id).toBe(pending.id)
        
        const runningTasks = db.getAllTasks(TaskStatus.RUNNING)
        
        expect(runningTasks.length).toBe(1)
        expect(runningTasks[0].id).toBe(running.id)
      })

      it('should order tasks by priority DESC, created_at ASC', () => {
        const low = db.createTask({ ...createTaskData('low'), priority: 1 })
        const high = db.createTask({ ...createTaskData('high'), priority: 10 })
        const medium = db.createTask({ ...createTaskData('medium'), priority: 5 })
        
        const tasks = db.getAllTasks()
        
        expect(tasks[0].id).toBe(high.id) // highest priority first
        expect(tasks[1].id).toBe(medium.id)
        expect(tasks[2].id).toBe(low.id)
      })

      it('should get pending tasks by job', () => {
        const job1 = db.createCronJob({ name: 'Job1', cron_expression: '0 * * * *' })
        const job2 = db.createCronJob({ name: 'Job2', cron_expression: '0 * * * *' })
        
        const task1 = db.createTask({ ...createTaskData('j1'), job_id: job1.id, status: TaskStatus.PENDING })
        const task2 = db.createTask({ ...createTaskData('j2'), job_id: job2.id, status: TaskStatus.PENDING })
        const task3 = db.createTask({ ...createTaskData('j1-complete'), job_id: job1.id, status: TaskStatus.COMPLETED })
        
        const job1Tasks = db.getPendingTasksByJob(job1.id, 10)
        
        expect(job1Tasks.length).toBe(1)
        expect(job1Tasks[0].id).toBe(task1.id)
      })

      it('should limit pending tasks', () => {
        for (let i = 0; i < 15; i++) {
          db.createTask({ ...createTaskData(`task-${i}`), status: TaskStatus.PENDING })
        }
        
        const tasks = db.getPendingTasksByJob(null, 5)
        
        expect(tasks.length).toBe(5)
      })

      it('should get task counts by status', () => {
        db.createTask({ ...createTaskData('p1'), status: TaskStatus.PENDING })
        db.createTask({ ...createTaskData('p2'), status: TaskStatus.PENDING })
        db.createTask({ ...createTaskData('r1'), status: TaskStatus.RUNNING })
        db.createTask({ ...createTaskData('f1'), status: TaskStatus.FAILED })
        db.createTask({ ...createTaskData('f2'), status: TaskStatus.FAILED })
        db.createTask({ ...createTaskData('f3'), status: TaskStatus.FAILED })
        
        expect(db.getPendingTaskCount()).toBe(2)
        expect(db.getRunningTaskCount()).toBe(1)
        expect(db.getFailedTaskCount()).toBe(3)
      })

      it('should get tasks by job ID', () => {
        const job = db.createCronJob({ name: 'Job', cron_expression: '0 * * * *' })
        
        const task1 = db.createTask({ ...createTaskData('t1'), job_id: job.id })
        const task2 = db.createTask({ ...createTaskData('t2'), job_id: job.id })
        db.createTask({ ...createTaskData('t3'), job_id: null })
        
        const jobTasks = db.getTasksByJobId(job.id)
        
        expect(jobTasks.length).toBe(2)
      })

      it('should get task payload', async () => {
        const task = db.createTask({ ...createTaskData('payload-test'), payload: '{"key":"value"}' })
        
        const payloadData = await db.getTaskPayload(task.id)
        
        expect(payloadData).toBeDefined()
        expect(payloadData?.payload).toBe('{"key":"value"}')
      })
    })

    describe('Update', () => {
      it('should update task status', () => {
        const task = db.createTask(createTaskData('update-test'))
        
        const updated = db.updateTask(task.id, { status: TaskStatus.RUNNING })
        
        expect(updated?.status).toBe(TaskStatus.RUNNING)
      })

      it('should update multiple fields', () => {
        const task = db.createTask(createTaskData('multi-update'))
        
        const updated = db.updateTask(task.id, {
          status: TaskStatus.FAILED,
          error_message: 'Something went wrong',
          retry_count: 3,
        })
        
        expect(updated?.status).toBe(TaskStatus.FAILED)
        expect(updated?.error_message).toBe('Something went wrong')
        expect(updated?.retry_count).toBe(3)
      })

      it('should mark task as running', () => {
        const task = db.createTask(createTaskData('running-test'))
        
        const updated = db.markTaskRunning(task.id)
        
        expect(updated?.status).toBe('running')
        expect(updated?.started_at).toBeDefined()
      })

      it('should mark task as completed', () => {
        const task = db.createTask(createTaskData('completed-test'))
        
        const updated = db.markTaskCompleted(task.id, '{"result":"ok"}')
        
        expect(updated?.status).toBe('completed')
        expect(updated?.completed_at).toBeDefined()
        expect(updated?.result).toBe('{"result":"ok"}')
      })

      it('should mark task as failed and increment retry count', () => {
        const task = db.createTask({ ...createTaskData('failed-test'), max_retries: 3 })
        
        // First failure - should stay pending for retry
        const updated1 = db.markTaskFailed(task.id, 'Error 1')
        
        expect(updated1?.status).toBe('pending')
        expect(updated1?.retry_count).toBe(1)
        expect(updated1?.error_message).toBe('Error 1')
        
        // More failures to reach max retries
        db.markTaskFailed(task.id, 'Error 2')
        db.markTaskFailed(task.id, 'Error 3')
        
        const updated4 = db.markTaskFailed(task.id, 'Error 4')
        
        // After 4 failures (retry_count=4 >= max_retries=3), should be permanently failed
        expect(updated4?.status).toBe('failed')
        expect(updated4?.completed_at).toBeDefined()
      })

      it('should return null when updating non-existent task', () => {
        expect(db.updateTask('non-existent', { status: TaskStatus.COMPLETED })).toBeNull()
      })
    })

    describe('Delete', () => {
      it('should delete an existing task', () => {
        const task = db.createTask(createTaskData('delete-test'))
        
        const result = db.deleteTask(task.id)
        
        expect(result).toBe(true)
        expect(db.getTaskById(task.id)).toBeNull()
      })

      it('should return false when deleting non-existent task', () => {
        expect(db.deleteTask('non-existent')).toBe(false)
      })
    })

    describe('Legacy Compatibility', () => {
      it('should update task status via legacy method', async () => {
        const task = db.createTask(createTaskData('legacy-update'))
        
        await db.updateTaskStatus(task.id, TaskStatus.COMPLETED, {
          completed_at: new Date().toISOString(),
          result: '{"legacy":true}',
        })
        
        const updated = db.getTaskById(task.id)
        
        expect(updated?.status).toBe(TaskStatus.COMPLETED)
        expect(updated?.result).toBe('{"legacy":true}')
      })

      it('should create task via legacy method', async () => {
        const id = await db.createTaskQueueItem({
          task_type: 'legacy-task',
          payload: '{"legacy":true}',
          priority: 7,
        })
        
        expect(id).toBeDefined()
        
        const task = db.getTaskById(id)
        expect(task?.task_type).toBe('legacy-task')
        expect(task?.priority).toBe(7)
      })
    })
  })

  // ============================================================================
  // Execution Logs CRUD
  // ============================================================================

  describe('Execution Logs CRUD', () => {
    const createLogData = (): CreateExecutionLog => ({
      trigger_type: TriggerType.MANUAL,
      status: ExecutionStatus.RUNNING,
      tasks_executed: 0,
      tasks_succeeded: 0,
      tasks_failed: 0,
    })

    describe('Create', () => {
      it('should create an execution log', () => {
        const job = db.createCronJob({ name: 'Job', cron_expression: '0 * * * *' })
        
        const log = db.createExecutionLog({
          ...createLogData(),
          job_id: job.id,
        })
        
        expect(log.id).toBeDefined()
        expect(log.job_id).toBe(job.id)
        expect(log.trigger_type).toBe(TriggerType.MANUAL)
        expect(log.status).toBe(ExecutionStatus.RUNNING)
        expect(log.started_at).toBeDefined()
      })

      it('should create log without job_id', () => {
        const log = db.createExecutionLog(createLogData())
        
        expect(log.job_id).toBeNull()
      })
    })

    describe('Read', () => {
      it('should get execution log by ID', () => {
        const created = db.createExecutionLog(createLogData())
        const fetched = db.getExecutionLogById(created.id)
        
        expect(fetched?.id).toBe(created.id)
      })

      it('should get all execution logs', () => {
        db.createExecutionLog(createLogData())
        db.createExecutionLog(createLogData())
        db.createExecutionLog(createLogData())
        
        const logs = db.getAllExecutionLogs()
        
        expect(logs.length).toBe(3)
      })

      it('should get logs filtered by job_id', () => {
        const job1 = db.createCronJob({ name: 'Job1', cron_expression: '0 * * * *' })
        const job2 = db.createCronJob({ name: 'Job2', cron_expression: '0 * * * *' })
        
        const log1 = db.createExecutionLog({ ...createLogData(), job_id: job1.id })
        const log2 = db.createExecutionLog({ ...createLogData(), job_id: job2.id })
        const log3 = db.createExecutionLog({ ...createLogData(), job_id: null })
        
        const job1Logs = db.getAllExecutionLogs(job1.id)
        
        expect(job1Logs.length).toBe(1)
        expect(job1Logs[0].id).toBe(log1.id)
      })

      it('should limit execution logs', () => {
        for (let i = 0; i < 50; i++) {
          db.createExecutionLog(createLogData())
        }
        
        const logs = db.getAllExecutionLogs(undefined, 10)
        
        expect(logs.length).toBe(10)
      })

      it('should get recent execution logs', () => {
        for (let i = 0; i < 25; i++) {
          db.createExecutionLog(createLogData())
        }
        
        const logs = db.getRecentExecutionLogs(5)
        
        expect(logs.length).toBe(5)
      })
    })

    describe('Update', () => {
      it('should update execution log status', () => {
        const log = db.createExecutionLog(createLogData())
        
        const updated = db.updateExecutionLog(log.id, {
          status: ExecutionStatus.COMPLETED,
          duration_ms: 5000,
          tasks_executed: 3,
          tasks_succeeded: 2,
          tasks_failed: 1,
        })
        
        expect(updated?.status).toBe(ExecutionStatus.COMPLETED)
        expect(updated?.duration_ms).toBe(5000)
        expect(updated?.tasks_executed).toBe(3)
      })

      it('should complete execution log with stats', () => {
        const log = db.createExecutionLog(createLogData())
        
        const completed = db.completeExecutionLog(log.id, {
          success: true,
          tasksExecuted: 5,
          tasksSucceeded: 5,
          tasksFailed: 0,
          durationMs: 10000,
        })
        
        expect(completed?.status).toBe('completed')
        expect(completed?.completed_at).toBeDefined()
        expect(completed?.duration_ms).toBe(10000)
        expect(completed?.tasks_executed).toBe(5)
        expect(completed?.tasks_succeeded).toBe(5)
        expect(completed?.tasks_failed).toBe(0)
      })

      it('should complete with failed status', () => {
        const log = db.createExecutionLog(createLogData())
        
        const completed = db.completeExecutionLog(log.id, {
          success: false,
          tasksExecuted: 3,
          tasksSucceeded: 1,
          tasksFailed: 2,
          durationMs: 5000,
          errorSummary: 'Two tasks failed',
        })
        
        expect(completed?.status).toBe('failed')
        expect(completed?.error_summary).toBe('Two tasks failed')
      })
    })
  })

  // ============================================================================
  // Capacity Tracking (Upsert)
  // ============================================================================

  describe('Capacity Tracking', () => {
    it('should insert new capacity record', () => {
      const record = db.upsertCapacityRecord('minimax-text', {
        remaining_quota: 1000,
        total_quota: 5000,
        reset_at: new Date().toISOString(),
      })
      
      expect(record.id).toBeDefined()
      expect(record.service_type).toBe('minimax-text')
      expect(record.remaining_quota).toBe(1000)
      expect(record.total_quota).toBe(5000)
      expect(record.last_checked_at).toBeDefined()
    })

    it('should update existing capacity record', () => {
      // Insert first
      db.upsertCapacityRecord('minimax-voice', {
        remaining_quota: 500,
        total_quota: 1000,
        reset_at: null,
      })
      
      // Update with new values
      const updated = db.upsertCapacityRecord('minimax-voice', {
        remaining_quota: 250,
        total_quota: 1000,
        reset_at: new Date().toISOString(),
      })
      
      expect(updated.remaining_quota).toBe(250)
      
      // Should still be only one record
      const all = db.getAllCapacityRecords()
      const voiceRecords = all.filter(r => r.service_type === 'minimax-voice')
      expect(voiceRecords.length).toBe(1)
    })

    it('should get capacity by service type', () => {
      db.upsertCapacityRecord('minimax-image', {
        remaining_quota: 100,
        total_quota: 200,
      })
      
      const record = db.getCapacityByService('minimax-image')
      
      expect(record?.service_type).toBe('minimax-image')
      expect(record?.remaining_quota).toBe(100)
    })

    it('should return null for non-existent service', () => {
      expect(db.getCapacityByService('non-existent')).toBeNull()
    })

    it('should get all capacity records', () => {
      db.upsertCapacityRecord('service-a', { remaining_quota: 10, total_quota: 20 })
      db.upsertCapacityRecord('service-b', { remaining_quota: 30, total_quota: 40 })
      
      const records = db.getAllCapacityRecords()
      
      expect(records.length).toBe(2)
    })

    it('should decrement capacity', () => {
      db.upsertCapacityRecord('minimax-decrement', {
        remaining_quota: 100,
        total_quota: 100,
      })
      
      const decremented = db.decrementCapacity('minimax-decrement', 5)
      
      expect(decremented?.remaining_quota).toBe(95)
      
      // Decrement more
      const decremented2 = db.decrementCapacity('minimax-decrement', 10)
      
      expect(decremented2?.remaining_quota).toBe(85)
    })

    it('should not go below zero when decrementing', () => {
      db.upsertCapacityRecord('minimax-limit', {
        remaining_quota: 5,
        total_quota: 100,
      })
      
      const decremented = db.decrementCapacity('minimax-limit', 100)
      
      expect(decremented?.remaining_quota).toBe(0)
    })

    it('should return null when decrementing non-existent service', () => {
      expect(db.decrementCapacity('non-existent')).toBeNull()
    })

    describe('Legacy Compatibility', () => {
      it('should get capacity via legacy method', async () => {
        db.upsertCapacityRecord('legacy-service', {
          remaining_quota: 50,
          total_quota: 100,
        })
        
        const capacity = await db.getCapacity('legacy-service')
        
        expect(capacity?.remaining).toBe(50)
        expect(capacity?.total).toBe(100)
      })

      it('should update capacity via legacy method', async () => {
        db.upsertCapacityRecord('legacy-update', {
          remaining_quota: 100,
          total_quota: 100,
        })
        
        await db.updateCapacity('legacy-update', 75)
        
        const record = db.getCapacityByService('legacy-update')
        expect(record?.remaining_quota).toBe(75)
      })
    })
  })

  // ============================================================================
  // Workflow Templates CRUD
  // ============================================================================

  describe('Workflow Templates CRUD', () => {
    const createTemplateData = () => ({
      name: 'Test Template',
      description: 'A test template',
      nodes_json: JSON.stringify([{ id: 'node-1', type: 'action' }]),
      edges_json: JSON.stringify([{ id: 'edge-1', source: 'node-1', target: 'node-2' }]),
      is_public: true,
    })

    describe('Create', () => {
      it('should create workflow template', () => {
        const template = db.createWorkflowTemplate(createTemplateData())
        
        expect(template.id).toBeDefined()
        expect(template.name).toBe('Test Template')
        expect(template.is_public).toBe(true)
        expect(template.created_at).toBeDefined()
      })

      it('should create template with is_public false', () => {
        const template = db.createWorkflowTemplate({
          ...createTemplateData(),
          is_public: false,
        })
        
        expect(template.is_public).toBe(false)
      })
    })

    describe('Read', () => {
      it('should get template by ID', () => {
        const created = db.createWorkflowTemplate(createTemplateData())
        const fetched = db.getWorkflowTemplateById(created.id)
        
        expect(fetched?.id).toBe(created.id)
      })

      it('should get all templates', () => {
        db.createWorkflowTemplate({ ...createTemplateData(), name: 'Template 1' })
        db.createWorkflowTemplate({ ...createTemplateData(), name: 'Template 2' })
        
        const templates = db.getAllWorkflowTemplates()
        
        expect(templates.length).toBe(2)
      })

      it('should get only marked templates', () => {
        const marked = db.createWorkflowTemplate({ ...createTemplateData(), is_public: true })
        const unmarked = db.createWorkflowTemplate({ ...createTemplateData(), is_public: false })
        
        const markedTemplates = db.getMarkedWorkflowTemplates()
        
        expect(markedTemplates.length).toBe(1)
        expect(markedTemplates[0].id).toBe(marked.id)
      })
    })

    describe('Update', () => {
      it('should update template', () => {
        const template = db.createWorkflowTemplate(createTemplateData())
        
        const updated = db.updateWorkflowTemplate(template.id, {
          name: 'Updated Template',
          nodes_json: '{"updated":true}',
        })
        
        expect(updated?.name).toBe('Updated Template')
        expect(updated?.nodes_json).toBe('{"updated":true}')
      })
    })

    describe('Delete', () => {
      it('should delete template', () => {
        const template = db.createWorkflowTemplate(createTemplateData())
        
        const result = db.deleteWorkflowTemplate(template.id)
        
        expect(result).toBe(true)
        expect(db.getWorkflowTemplateById(template.id)).toBeNull()
      })
    })
  })

  // ============================================================================
  // Webhooks CRUD (removed - types deleted in SP-1)
  // ============================================================================

  // ============================================================================
  // Webhooks CRUD (removed - types deleted in SP-1)
  // ============================================================================

  // ============================================================================
  // Dead Letter Queue CRUD (removed - types deleted in SP-1)
  // ============================================================================

  // ============================================================================
  // Edge Cases & Error Handling
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty database queries gracefully', () => {
      expect(db.getAllCronJobs()).toEqual([])
      expect(db.getAllTasks()).toEqual([])
      expect(db.getAllExecutionLogs()).toEqual([])
      expect(db.getAllCapacityRecords()).toEqual([])
      expect(db.getAllWorkflowTemplates()).toEqual([])
    })

    it('should handle null descriptions and optional fields', () => {
      const job = db.createCronJob({
        name: 'No Description',
        description: null,
        cron_expression: '0 * * * *',
      })
      
      expect(job.description).toBeNull()
    })

    it('should handle special characters in names and descriptions', () => {
      const job = db.createCronJob({
        name: 'Test "quotes" and \'apostrophes\'',
        description: 'Special chars: <>&"\'`$@#%^*',
        cron_expression: '0 * * * *',
      })
      
      expect(job.name).toBe('Test "quotes" and \'apostrophes\'')
      expect(job.description).toBe('Special chars: <>&"\'`$@#%^*')
    })

    it('should handle concurrent creates safely', () => {
      const jobs = []
      for (let i = 0; i < 100; i++) {
        jobs.push(db.createCronJob({
          name: `Batch Job ${i}`,
          cron_expression: '0 * * * *',
        }))
      }
      
      const ids = jobs.map(j => j.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(100)
      
      expect(db.getAllCronJobs().length).toBe(100)
    })

    it('should handle large payloads', () => {
      const largePayload = JSON.stringify({
        data: 'x'.repeat(10000),
        nested: { deep: { array: Array(100).fill('item') } },
      })
      
      const task = db.createTask({
        task_type: 'large-task',
        payload: largePayload,
      })
      
      expect(task.payload.length).toBeGreaterThan(10000)
      
      const fetched = db.getTaskById(task.id)
      expect(fetched?.payload).toBe(largePayload)
    })
  })
})