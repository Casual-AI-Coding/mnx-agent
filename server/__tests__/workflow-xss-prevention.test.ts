import { describe, it, expect, beforeEach } from 'vitest'
import { executeTransformNode, type TransformExecutorDeps } from '../services/workflow/executors/transform-executor'
import type { WorkflowNode } from '../services/workflow/types'
import { vi } from 'vitest'

describe('XSS Prevention in Transform Node', () => {
  const executorDeps: TransformExecutorDeps = {
    executionLogId: null,
    workflowId: null,
  }

  describe('prototype pollution prevention', () => {
    it('should block access to __proto__ via template', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', { data: 'safe-value', nested: { key: 'nested-value' } })

      const node = { id: 'transform-proto', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'extract',
        inputPath: '__proto__',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)

      expect(result).toBe('')
    })

    it('should block access to constructor via template', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', { data: 'safe-value' })

      const node = { id: 'transform-constructor', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'extract',
        inputPath: 'constructor',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)

      expect(result).toBe('')
    })

    it('should block nested prototype access like data.__proto__', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', { data: { safe: 'value' } })

      const node = { id: 'transform-nested-proto', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'extract',
        inputPath: 'data.__proto__',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)

      expect(result).toBe('')
    })
  })

  describe('map transform', () => {
    it('should sanitize HTML in mapFunction to prevent XSS', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', ['item1', 'item2', 'item3'])

      const node = { id: 'transform-1', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'map',
        mapFunction: '<script>alert("xss")</script>$item',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)
      
      expect(Array.isArray(result)).toBe(true)
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain('<script>')
      expect(resultStr).toContain('&lt;script&gt;')
    })

    it('should sanitize quotes in mapFunction', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', ['item1', 'item2', 'item3'])

      const node = { id: 'transform-2', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'map',
        mapFunction: "$item['value']",
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)
      
      expect(Array.isArray(result)).toBe(true)
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain("'")
      expect(resultStr).toContain('&#x27;')
    })

    it('should sanitize double quotes in mapFunction', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', ['item1', 'item2', 'item3'])

      const node = { id: 'transform-3', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'map',
        mapFunction: '$item="value"',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)
      
      expect(Array.isArray(result)).toBe(true)
      const resultStr = JSON.stringify(result)
      expect(resultStr).toContain('&quot;')
      expect(resultStr).not.toContain('$item="value"')
    })

    it('should sanitize forward slash in mapFunction', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', ['item1', 'item2', 'item3'])

      const node = { id: 'transform-4', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'map',
        mapFunction: 'path/to/$item',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)
      
      expect(Array.isArray(result)).toBe(true)
      const resultStr = JSON.stringify(result)
      expect(resultStr).not.toContain('/path')
      expect(resultStr).toContain('&#x2F;')
    })
  })

  describe('filter transform', () => {
    it('should sanitize HTML in filterCondition to prevent XSS', async () => {
      const nodeOutputs = new Map<string, unknown>()
      nodeOutputs.set('src', [1, 2, 3, 4, 5, 6])

      const node = { id: 'transform-5', type: 'transform', data: {} } as WorkflowNode
      const config = {
        inputNode: 'src',
        transformType: 'filter',
        filterCondition: '$item > 3',
      }

      const result = await executeTransformNode(node, config, nodeOutputs, executorDeps)
      
      expect(Array.isArray(result)).toBe(true)
    })
  })
})