import { createMockEventBus } from './__tests__/helpers/mock-event-bus'
/**
 * 阶段 B 验证：真实 API 集成测试
 * 直接调用 WorkflowEngine，不通过 HTTP API
 */

import { getDatabase } from './database/service-async.js'
import { getServiceNodeRegistry } from './services/service-node-registry.js'
import { WorkflowEngine } from './services/workflow/engine.js'
import { getMiniMaxClient } from './lib/minimax/index.js'
import { getEventBus } from './service-registration.js'

async function testWorkflow() {
  console.log('=== Stage B: Real API Integration ===\n')

  const db = await getDatabase()
  const registry = getServiceNodeRegistry(db)
  const eventBus = getEventBus()
  const engine = new WorkflowEngine(db, registry, undefined, eventBus)

  // 检查注册的服务
  const services = registry.getAllServices()
  console.log('✅ Registered services:', services.join(', '))
  console.log('   Total methods:', services.reduce((sum, s) => sum + registry.getServiceMethods(s).length, 0))
  console.log()

  // Test 1: 单节点文本生成
  console.log('Test 1: Single text generation node')
  const workflow1 = JSON.stringify({
    nodes: [{
      id: 'text-1',
      type: 'action',
      data: {
        label: 'Text Gen',
        config: {
          service: 'minimaxClient',
          method: 'chatCompletion',
          args: [{
            model: 'abab6.5s-chat',
            messages: [{ role: 'user', content: '用一句话回答：1+1等于几？' }]
          }]
        }
      }
    }],
    edges: []
  })

  try {
    const result1 = await engine.executeWorkflow(workflow1)
    if (result1.success) {
      const textResult = result1.nodeResults.get('text-1')
      console.log('✅ Text generation succeeded')
      console.log('   Output:', JSON.stringify(textResult?.data).substring(0, 200))
    } else {
      console.log('❌ Text generation failed:', result1.error)
    }
  } catch (error) {
    console.log('❌ Test 1 error:', (error as Error).message)
  }

  console.log()

  // Test 2: 容量检查
  console.log('Test 2: Capacity check')
  const workflow2 = JSON.stringify({
    nodes: [{
      id: 'capacity-1',
      type: 'action',
      data: {
        label: 'Check Capacity',
        config: {
          service: 'capacityChecker',
          method: 'hasCapacity',
          args: ['image']
        }
      }
    }],
    edges: []
  })

  try {
    const result2 = await engine.executeWorkflow(workflow2)
    if (result2.success) {
      const capResult = result2.nodeResults.get('capacity-1')
      console.log('✅ Capacity check succeeded')
      console.log('   Has capacity:', capResult?.data)
    } else {
      console.log('❌ Capacity check failed:', result2.error)
    }
  } catch (error) {
    console.log('❌ Test 2 error:', (error as Error).message)
  }

  console.log()

  // Test 3: 数据库查询
  console.log('Test 3: Database query')
  const workflow3 = JSON.stringify({
    nodes: [{
      id: 'db-1',
      type: 'action',
      data: {
        label: 'Get Queue Stats',
        config: {
          service: 'db',
          method: 'getQueueStats',
          args: []
        }
      }
    }],
    edges: []
  })

  try {
    const result3 = await engine.executeWorkflow(workflow3)
    if (result3.success) {
      const dbResult = result3.nodeResults.get('db-1')
      console.log('✅ Database query succeeded')
      console.log('   Stats:', JSON.stringify(dbResult?.data))
    } else {
      console.log('❌ Database query failed:', result3.error)
    }
  } catch (error) {
    console.log('❌ Test 3 error:', (error as Error).message)
  }

  console.log()

  // Test 4: 多节点链式调用
  console.log('Test 4: Multi-node chain (text → transform)')
  const workflow4 = JSON.stringify({
    nodes: [
      {
        id: 'text-2',
        type: 'action',
        data: {
          label: 'Generate Text',
          config: {
            service: 'minimaxClient',
            method: 'chatCompletion',
            args: [{
              model: 'abab6.5s-chat',
              messages: [{ role: 'user', content: '说一个数字' }]
            }]
          }
        }
      },
      {
        id: 'extract-1',
        type: 'transform',
        data: {
          label: 'Extract Content',
          config: {
            transformType: 'extract',
            inputNode: 'text-2',
            inputPath: 'choices[0].message.content'
          }
        }
      }
    ],
    edges: [{ id: 'e1', source: 'text-2', target: 'extract-1' }]
  })

  try {
    const result4 = await engine.executeWorkflow(workflow4)
    if (result4.success) {
      const extractResult = result4.nodeResults.get('extract-1')
      console.log('✅ Multi-node chain succeeded')
      console.log('   Extracted:', extractResult?.data)
    } else {
      console.log('❌ Multi-node chain failed:', result4.error)
    }
  } catch (error) {
    console.log('❌ Test 4 error:', (error as Error).message)
  }

  console.log('\n=== Stage B Verification Complete ===')

  process.exit(0)
}

testWorkflow().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
