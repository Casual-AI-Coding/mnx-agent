import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DatabaseService } from '../../database/service-async.js'
import type { ExecutionState, ExecutionStateRow, CreateExecutionState, UpdateExecutionState } from '../../database/types.js'
import * as dateUtils from '../../lib/date-utils.js'
import { ExecutionStateManager } from '../execution-state-manager.js'

vi.mock('../../lib/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('ExecutionStateManager', () => {
  let manager: ExecutionStateManager
  let mockDb: {
    run: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    all: ReturnType<typeof vi.fn>
    transaction: ReturnType<typeof vi.fn>
  }

  const mockExecutionStateRow: ExecutionStateRow = {
    id: 'exec_12345678',
    execution_log_id: 'log-1',
    workflow_id: 'wf-1',
    status: 'running',
    current_layer: 0,
    completed_nodes: '[]',
    failed_nodes: '[]',
    node_outputs: '{}',
    context: '{}',
    started_at: '2024-01-15T10:30:00',
    updated_at: '2024-01-15T10:30:00',
    paused_at: null,
    resumed_at: null,
    completed_at: null,
    created_by: null
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:30:00'))

    vi.spyOn(dateUtils, 'toLocalISODateString').mockReturnValue('2024-01-15T10:30:00')

    mockDb = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 'exec_12345678' }),
      get: vi.fn(),
      all: vi.fn(),
      transaction: vi.fn(async (fn: (db: DatabaseService) => Promise<unknown>) => fn(mockDb as unknown as DatabaseService))
    }

    manager = new ExecutionStateManager(mockDb as unknown as DatabaseService)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create instance with database service', () => {
      expect(manager).toBeInstanceOf(ExecutionStateManager)
    })
  })

  describe('create', () => {
    it('should create execution state with required fields', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1'
      }

      mockDb.get.mockResolvedValue(mockExecutionStateRow)

      const result = await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining(['log-1', 'wf-1', 'running', 0])
      )
      expect(result.execution_log_id).toBe('log-1')
      expect(result.workflow_id).toBe('wf-1')
    })

    it('should create execution state with custom status', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        status: 'pending'
      }

      mockDb.get.mockResolvedValue({ ...mockExecutionStateRow, status: 'pending' })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining(['pending'])
      )
    })

    it('should create execution state with custom current_layer', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        current_layer: 5
      }

      mockDb.get.mockResolvedValue({ ...mockExecutionStateRow, current_layer: 5 })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining([5])
      )
    })

    it('should create execution state with completed_nodes', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        completed_nodes: ['node-1', 'node-2']
      }

      mockDb.get.mockResolvedValue({
        ...mockExecutionStateRow,
        completed_nodes: JSON.stringify(['node-1', 'node-2'])
      })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining(['["node-1","node-2"]'])
      )
    })

    it('should create execution state with failed_nodes', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        failed_nodes: [{ nodeId: 'node-1', error: 'Failed' }]
      }

      mockDb.get.mockResolvedValue({
        ...mockExecutionStateRow,
        failed_nodes: JSON.stringify([{ nodeId: 'node-1', error: 'Failed' }])
      })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining([expect.stringContaining('node-1')])
      )
    })

    it('should create execution state with node_outputs', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        node_outputs: { 'node-1': { result: 'success' } }
      }

      mockDb.get.mockResolvedValue({
        ...mockExecutionStateRow,
        node_outputs: JSON.stringify({ 'node-1': { result: 'success' } })
      })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining([expect.stringContaining('success')])
      )
    })

    it('should create execution state with context', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        context: { key: 'value' }
      }

      mockDb.get.mockResolvedValue({
        ...mockExecutionStateRow,
        context: JSON.stringify({ key: 'value' })
      })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining([expect.stringContaining('value')])
      )
    })

    it('should create execution state with created_by', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1',
        created_by: 'user-123'
      }

      mockDb.get.mockResolvedValue({ ...mockExecutionStateRow, created_by: 'user-123' })

      await manager.create(input)

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO execution_states'),
        expect.arrayContaining(['user-123'])
      )
    })

    it('should call getById after insert', async () => {
      const input: CreateExecutionState = {
        execution_log_id: 'log-1',
        workflow_id: 'wf-1'
      }

      mockDb.get.mockResolvedValue(mockExecutionStateRow)

      await manager.create(input)

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM execution_states WHERE id = $1'),
        expect.arrayContaining([expect.stringMatching(/^exec_[a-f0-9]+$/)])
      )
    })
  })

  describe('getById', () => {
    it('should return execution state when found', async () => {
      mockDb.get.mockResolvedValue(mockExecutionStateRow)

      const result = await manager.getById('exec_12345678')

      expect(result).toBeDefined()
      expect(result?.id).toBe('exec_12345678')
      expect(result?.execution_log_id).toBe('log-1')
      expect(result?.status).toBe('running')
    })

    it('should return undefined when not found', async () => {
      mockDb.get.mockResolvedValue(undefined)

      const result = await manager.getById('nonexistent')

      expect(result).toBeUndefined()
    })

    it('should query with correct SQL', async () => {
      mockDb.get.mockResolvedValue(mockExecutionStateRow)

      await manager.getById('exec_12345678')

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM execution_states WHERE id = $1',
        ['exec_12345678']
      )
    })

    it('should map row status correctly', async () => {
      const rowWithStatus = { ...mockExecutionStateRow, status: 'completed' }
      mockDb.get.mockResolvedValue(rowWithStatus)

      const result = await manager.getById('exec_12345678')

      expect(result?.status).toBe('completed')
    })
  })

  describe('getByExecutionLogId', () => {
    it('should return execution state when found', async () => {
      mockDb.get.mockResolvedValue(mockExecutionStateRow)

      const result = await manager.getByExecutionLogId('log-1')

      expect(result).toBeDefined()
      expect(result?.execution_log_id).toBe('log-1')
    })

    it('should return undefined when not found', async () => {
      mockDb.get.mockResolvedValue(undefined)

      const result = await manager.getByExecutionLogId('nonexistent')

      expect(result).toBeUndefined()
    })

    it('should query with correct SQL', async () => {
      mockDb.get.mockResolvedValue(mockExecutionStateRow)

      await manager.getByExecutionLogId('log-1')

      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM execution_states WHERE execution_log_id = $1',
        ['log-1']
      )
    })
  })

  describe('update', () => {
    it('should update status field', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.update('exec_12345678', { status: 'completed' })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE execution_states SET'),
        expect.arrayContaining(['completed', 'exec_12345678'])
      )
    })

    it('should update current_layer field', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.update('exec_12345678', { current_layer: 3 })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('current_layer = $2'),
        expect.arrayContaining([3, 'exec_12345678'])
      )
    })

    it('should update multiple fields', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.update('exec_12345678', {
        status: 'paused',
        current_layer: 2,
        paused_at: '2024-01-15T12:00:00'
      })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        expect.arrayContaining(['paused', 2, '2024-01-15T12:00:00', 'exec_12345678'])
      )
    })

    it('should skip undefined fields', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.update('exec_12345678', {
        status: 'completed',
        current_layer: undefined
      } as UpdateExecutionState)

      const callArgs = mockDb.run.mock.calls[0]
      expect(callArgs[0]).not.toContain('current_layer')
    })

    it('should always include updated_at', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.update('exec_12345678', { status: 'running' })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = $1'),
        expect.arrayContaining([expect.any(String)])
      )
    })

    it('should use correct parameter indexing', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.update('exec_12345678', {
        status: 'paused',
        completed_at: '2024-01-15T12:00:00'
      })

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringMatching(/status = \$2.*completed_at = \$3/),
        expect.arrayContaining(['paused', '2024-01-15T12:00:00', 'exec_12345678'])
      )
    })
  })

  describe('markNodeComplete', () => {
    it('should add node to completed_nodes', async () => {
      const stateWithNodes: ExecutionStateRow = {
        ...mockExecutionStateRow,
        completed_nodes: '[]',
        node_outputs: '{}'
      }
      mockDb.get.mockResolvedValue(stateWithNodes)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeComplete('exec_12345678', 'node-1', { result: 'output' })

      // Get the values array from the update call
      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      // First element is updated_at, then completed_nodes, then node_outputs, then id
      expect(updateValues[1]).toBe('["node-1"]')
    })

    it('should not duplicate node in completed_nodes', async () => {
      const stateWithNodes: ExecutionStateRow = {
        ...mockExecutionStateRow,
        completed_nodes: '["node-1"]',
        node_outputs: '{"node-1": "previous"}'
      }
      mockDb.get.mockResolvedValue(stateWithNodes)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeComplete('exec_12345678', 'node-1', { result: 'new' })

      // Get the completed_nodes value
      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      const completedNodes = JSON.parse(updateValues[1] as string)
      expect(completedNodes).toEqual(['node-1']) // Should not be duplicated
    })

    it('should store node output', async () => {
      const stateWithNodes: ExecutionStateRow = {
        ...mockExecutionStateRow,
        completed_nodes: '[]',
        node_outputs: '{}'
      }
      mockDb.get.mockResolvedValue(stateWithNodes)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeComplete('exec_12345678', 'node-1', { result: 'success' })

      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      const nodeOutputs = JSON.parse(updateValues[2] as string)
      expect(nodeOutputs).toHaveProperty('node-1')
    })

    it('should throw error when execution state not found', async () => {
      mockDb.get.mockResolvedValue(undefined)

      await expect(
        manager.markNodeComplete('nonexistent', 'node-1', {})
      ).rejects.toThrow('Execution state nonexistent not found')
    })

    it('should preserve existing node outputs when adding new one', async () => {
      const stateWithOutputs: ExecutionStateRow = {
        ...mockExecutionStateRow,
        completed_nodes: '[]',
        node_outputs: '{"existing": "data"}'
      }
      mockDb.get.mockResolvedValue(stateWithOutputs)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeComplete('exec_12345678', 'node-1', { new: 'output' })

      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      const nodeOutputs = JSON.parse(updateValues[2] as string)
      expect(nodeOutputs).toHaveProperty('existing', 'data')
      expect(nodeOutputs).toHaveProperty('node-1')
    })

    it('should reread and update inside a transaction to avoid stale completed node state', async () => {
      const staleSnapshot: ExecutionStateRow = {
        ...mockExecutionStateRow,
        completed_nodes: '[]',
        node_outputs: '{}'
      }
      const currentRow: ExecutionStateRow = {
        ...mockExecutionStateRow,
        completed_nodes: '["node-existing"]',
        node_outputs: '{"node-existing":{"result":"kept"}}'
      }

      mockDb.get.mockResolvedValue(staleSnapshot)
      mockDb.run.mockResolvedValue({ changes: 1 })
      mockDb.transaction.mockImplementation(async (fn: (db: DatabaseService) => Promise<unknown>) => {
        const txDb = {
          ...mockDb,
          get: vi.fn().mockResolvedValue(currentRow),
          run: vi.fn().mockResolvedValue({ changes: 1 }),
        }
        await fn(txDb as unknown as DatabaseService)
        expect(txDb.get).toHaveBeenCalledWith(
          'SELECT * FROM execution_states WHERE id = $1 FOR UPDATE',
          ['exec_12345678']
        )
        expect(txDb.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE execution_states SET'),
          expect.arrayContaining([
            '2024-01-15T10:30:00',
            '["node-existing","node-1"]',
            '{"node-existing":{"result":"kept"},"node-1":{"result":"fresh"}}',
            'exec_12345678',
          ])
        )
      })

      await manager.markNodeComplete('exec_12345678', 'node-1', { result: 'fresh' })

      expect(mockDb.transaction).toHaveBeenCalledOnce()
      expect(mockDb.get).not.toHaveBeenCalled()
    })
  })

  describe('markNodeFailed', () => {
    it('should add node to failed_nodes with error', async () => {
      const stateWithFailed: ExecutionStateRow = {
        ...mockExecutionStateRow,
        failed_nodes: '[]'
      }
      mockDb.get.mockResolvedValue(stateWithFailed)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeFailed('exec_12345678', 'node-1', 'Something went wrong')

      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      const failedNodes = JSON.parse(updateValues[1] as string)
      expect(failedNodes).toHaveLength(1)
      expect(failedNodes[0].nodeId).toBe('node-1')
      expect(failedNodes[0].error).toBe('Something went wrong')
    })

    it('should include timestamp in failed_nodes entry', async () => {
      const stateWithFailed: ExecutionStateRow = {
        ...mockExecutionStateRow,
        failed_nodes: '[]'
      }
      mockDb.get.mockResolvedValue(stateWithFailed)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeFailed('exec_12345678', 'node-1', 'Error')

      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      const failedNodes = JSON.parse(updateValues[1] as string)
      expect(failedNodes[0]).toHaveProperty('timestamp')
      expect(failedNodes[0].timestamp).toBe('2024-01-15T10:30:00')
    })

    it('should throw error when execution state not found', async () => {
      mockDb.get.mockResolvedValue(undefined)

      await expect(
        manager.markNodeFailed('nonexistent', 'node-1', 'Error')
      ).rejects.toThrow('Execution state nonexistent not found')
    })

    it('should append to existing failed nodes', async () => {
      const stateWithFailed: ExecutionStateRow = {
        ...mockExecutionStateRow,
        failed_nodes: JSON.stringify([{ nodeId: 'node-0', error: 'First', timestamp: '2024-01-15T09:00:00' }])
      }
      mockDb.get.mockResolvedValue(stateWithFailed)
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.markNodeFailed('exec_12345678', 'node-1', 'Second')

      const updateValues = mockDb.run.mock.calls[0][1] as unknown[]
      const failedNodes = JSON.parse(updateValues[1] as string)
      expect(failedNodes).toHaveLength(2)
      expect(failedNodes[0].nodeId).toBe('node-0')
      expect(failedNodes[1].nodeId).toBe('node-1')
    })

    it('should reread and append failed nodes inside a transaction to avoid stale failure state', async () => {
      const staleSnapshot: ExecutionStateRow = {
        ...mockExecutionStateRow,
        failed_nodes: '[]'
      }
      const currentRow: ExecutionStateRow = {
        ...mockExecutionStateRow,
        failed_nodes: '[{"nodeId":"node-existing","error":"kept","timestamp":"2024-01-15T09:00:00"}]'
      }

      mockDb.get.mockResolvedValue(staleSnapshot)
      mockDb.run.mockResolvedValue({ changes: 1 })
      mockDb.transaction.mockImplementation(async (fn: (db: DatabaseService) => Promise<unknown>) => {
        const txDb = {
          ...mockDb,
          get: vi.fn().mockResolvedValue(currentRow),
          run: vi.fn().mockResolvedValue({ changes: 1 }),
        }
        await fn(txDb as unknown as DatabaseService)
        expect(txDb.get).toHaveBeenCalledWith(
          'SELECT * FROM execution_states WHERE id = $1 FOR UPDATE',
          ['exec_12345678']
        )
        expect(txDb.run).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE execution_states SET'),
          expect.arrayContaining([
            '2024-01-15T10:30:00',
            '[{"nodeId":"node-existing","error":"kept","timestamp":"2024-01-15T09:00:00"},{"nodeId":"node-1","error":"Second","timestamp":"2024-01-15T10:30:00"}]',
            'exec_12345678',
          ])
        )
      })

      await manager.markNodeFailed('exec_12345678', 'node-1', 'Second')

      expect(mockDb.transaction).toHaveBeenCalledOnce()
      expect(mockDb.get).not.toHaveBeenCalled()
    })
  })

  describe('pause', () => {
    it('should update status to paused', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.pause('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('status = $2')
      expect(values).toContain('paused')
    })

    it('should set paused_at timestamp', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.pause('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('paused_at = $3')
      expect(values).toContain('2024-01-15T10:30:00')
    })

    it('should call update with correct parameters', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.pause('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('UPDATE execution_states SET')
      expect(values).toContain('paused')
      expect(values).toContain('2024-01-15T10:30:00')
    })
  })

  describe('resume', () => {
    it('should update status to resumed', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.resume('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('status = $2')
      expect(values).toContain('resumed')
    })

    it('should set resumed_at timestamp', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.resume('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('resumed_at = $3')
      expect(values).toContain('2024-01-15T10:30:00')
    })
  })

  describe('complete', () => {
    it('should update status to completed', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.complete('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('status = $2')
      expect(values).toContain('completed')
    })

    it('should set completed_at timestamp', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.complete('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('completed_at = $3')
      expect(values).toContain('2024-01-15T10:30:00')
    })
  })

  describe('fail', () => {
    it('should update status to failed', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.fail('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('status = $2')
      expect(values).toContain('failed')
    })

    it('should set completed_at timestamp', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.fail('exec_12345678')

      const [sql, values] = mockDb.run.mock.calls[0]
      expect(sql).toContain('completed_at = $3')
      expect(values).toContain('2024-01-15T10:30:00')
    })
  })

  describe('getRunningExecutions', () => {
    it('should return running executions', async () => {
      const runningRows: ExecutionStateRow[] = [
        { ...mockExecutionStateRow, id: 'exec_1', status: 'running' },
        { ...mockExecutionStateRow, id: 'exec_2', status: 'running' }
      ]
      mockDb.all.mockResolvedValue(runningRows)

      const result = await manager.getRunningExecutions()

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('running')
      expect(result[1].status).toBe('running')
    })

    it('should query with correct SQL', async () => {
      mockDb.all.mockResolvedValue([])

      await manager.getRunningExecutions()

      expect(mockDb.all).toHaveBeenCalledTimes(1)
      expect(mockDb.all.mock.calls[0][0]).toBe("SELECT * FROM execution_states WHERE status = 'running'")
    })

    it('should return empty array when no running executions', async () => {
      mockDb.all.mockResolvedValue([])

      const result = await manager.getRunningExecutions()

      expect(result).toEqual([])
    })

    it('should map all rows correctly', async () => {
      const rows: ExecutionStateRow[] = [
        { ...mockExecutionStateRow, id: 'exec_1', status: 'running', current_layer: 1 },
        { ...mockExecutionStateRow, id: 'exec_2', status: 'running', current_layer: 2 }
      ]
      mockDb.all.mockResolvedValue(rows)

      const result = await manager.getRunningExecutions()

      expect(result[0].current_layer).toBe(1)
      expect(result[1].current_layer).toBe(2)
    })
  })

  describe('getPausedExecutions', () => {
    it('should return paused executions', async () => {
      const pausedRows: ExecutionStateRow[] = [
        { ...mockExecutionStateRow, id: 'exec_1', status: 'paused' },
        { ...mockExecutionStateRow, id: 'exec_2', status: 'paused' }
      ]
      mockDb.all.mockResolvedValue(pausedRows)

      const result = await manager.getPausedExecutions()

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('paused')
      expect(result[1].status).toBe('paused')
    })

    it('should query with correct SQL', async () => {
      mockDb.all.mockResolvedValue([])

      await manager.getPausedExecutions()

      expect(mockDb.all).toHaveBeenCalledTimes(1)
      expect(mockDb.all.mock.calls[0][0]).toBe("SELECT * FROM execution_states WHERE status = 'paused'")
    })

    it('should return empty array when no paused executions', async () => {
      mockDb.all.mockResolvedValue([])

      const result = await manager.getPausedExecutions()

      expect(result).toEqual([])
    })
  })

  describe('delete', () => {
    it('should delete execution state by id', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      await manager.delete('exec_12345678')

      expect(mockDb.run).toHaveBeenCalledWith(
        'DELETE FROM execution_states WHERE id = $1',
        ['exec_12345678']
      )
    })

    it('should return void', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 })

      const result = await manager.delete('exec_12345678')

      expect(result).toBeUndefined()
    })
  })

  describe('rowToExecutionState', () => {
    it('should convert row status to ExecutionStateStatus type', () => {
      const row: ExecutionStateRow = {
        ...mockExecutionStateRow,
        status: 'completed'
      }

      const state: ExecutionState = {
        ...row,
        status: row.status as ExecutionState['status']
      }

      expect(state.status).toBe('completed')
    })

    it('should preserve all row properties', () => {
      const row: ExecutionStateRow = {
        id: 'exec_test',
        execution_log_id: 'log_test',
        workflow_id: 'wf_test',
        status: 'running',
        current_layer: 5,
        completed_nodes: '["n1"]',
        failed_nodes: '[]',
        node_outputs: '{"n1": "out"}',
        context: '{"ctx": true}',
        started_at: '2024-01-01T00:00:00',
        updated_at: '2024-01-01T00:00:00',
        paused_at: null,
        resumed_at: null,
        completed_at: null,
        created_by: 'user_test'
      }

      const state: ExecutionState = {
        ...row,
        status: row.status as ExecutionState['status']
      }

      expect(state.id).toBe('exec_test')
      expect(state.execution_log_id).toBe('log_test')
      expect(state.workflow_id).toBe('wf_test')
      expect(state.current_layer).toBe(5)
      expect(state.completed_nodes).toBe('["n1"]')
      expect(state.failed_nodes).toBe('[]')
      expect(state.node_outputs).toBe('{"n1": "out"}')
      expect(state.context).toBe('{"ctx": true}')
      expect(state.created_by).toBe('user_test')
    })
  })
})
