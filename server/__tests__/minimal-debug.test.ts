import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createConnection } from '../database/connection.js'
import { getDatabase } from '../database/service-async.js'
import { getServiceNodeRegistry, resetServiceNodeRegistry } from '../services/service-node-registry.js'
import { WorkflowEngine } from '../services/workflow-engine.js'
import { getMiniMaxClient } from '../lib/minimax.js'

describe('Minimal Workflow Test', () => {
  let db: Awaited<ReturnType<typeof getDatabase>>
  let registry: ReturnType<typeof getServiceNodeRegistry>
  let engine: WorkflowEngine

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
    registry = getServiceNodeRegistry(db)
    
    const minimaxClient = getMiniMaxClient()
    await registry.register({
      serviceName: 'minimaxClient',
      instance: minimaxClient,
      methods: [
        { name: 'imageGeneration', displayName: 'Image Generation', category: 'MiniMax API' },
      ],
    })
    
    engine = new WorkflowEngine(db, registry)
  })

  afterAll(async () => {
    resetServiceNodeRegistry()
  })

  it('should execute simple workflow', async () => {
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
      ],
      edges: [],
    }

    const result = await engine.executeWorkflow(JSON.stringify(workflow))
    console.log('Result:', JSON.stringify(result, null, 2))
    expect(result.success).toBe(true)
  }, 30000)
})
