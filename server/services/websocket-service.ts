import { EventEmitter } from 'events'
import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { UserService } from './user-service.js'
import type { IEventBus } from './interfaces/event-bus.interface'
import { toLocalISODateString } from '../lib/date-utils.js'

export interface CronEvent {
  type: 'job_created' | 'job_updated' | 'job_deleted' | 'job_toggled' | 'job_executed' |
        'task_created' | 'task_updated' | 'task_completed' | 'task_failed' | 'task_moved_to_dlq' |
        'log_created' | 'log_updated' |
        'workflow_test_started' | 'workflow_test_completed' | 'workflow_node_output' |
        'workflow_node_start' | 'workflow_node_complete' | 'workflow_node_error'
  payload: unknown
  timestamp: string
}

export class CronEventEmitter extends EventEmitter implements IEventBus {
  emitJobCreated(job: unknown): void {
    this.emit('job_event', {
      type: 'job_created',
      payload: job,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitJobUpdated(job: unknown): void {
    this.emit('job_event', {
      type: 'job_updated',
      payload: job,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitJobDeleted(jobId: string): void {
    this.emit('job_event', {
      type: 'job_deleted',
      payload: { id: jobId },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitJobToggled(job: unknown): void {
    this.emit('job_event', {
      type: 'job_toggled',
      payload: job,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitJobExecuted(jobId: string, result: { success: boolean; durationMs: number }): void {
    this.emit('job_event', {
      type: 'job_executed',
      payload: { jobId, ...result },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitTaskCreated(task: unknown): void {
    this.emit('task_event', {
      type: 'task_created',
      payload: task,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitTaskUpdated(task: unknown): void {
    this.emit('task_event', {
      type: 'task_updated',
      payload: task,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitTaskCompleted(task: unknown): void {
    this.emit('task_event', {
      type: 'task_completed',
      payload: task,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitTaskFailed(task: unknown): void {
    this.emit('task_event', {
      type: 'task_failed',
      payload: task,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitTaskMovedToDLQ(task: unknown, error: string): void {
    this.emit('task_event', {
      type: 'task_moved_to_dlq',
      payload: { task, error },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitLogCreated(log: unknown): void {
    this.emit('log_event', {
      type: 'log_created',
      payload: log,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitLogUpdated(log: unknown): void {
    this.emit('log_event', {
      type: 'log_updated',
      payload: log,
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitWorkflowTestStarted(workflowId: string, executionId: string): void {
    this.emit('workflow_event', {
      type: 'workflow_test_started',
      payload: { workflowId, executionId },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitWorkflowTestCompleted(workflowId: string, executionId: string, result: unknown, error?: string): void {
    this.emit('workflow_event', {
      type: 'workflow_test_completed',
      payload: { workflowId, executionId, result, error },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitWorkflowNodeOutput(nodeId: string, output: unknown, executionId: string): void {
    this.emit('workflow_event', {
      type: 'workflow_node_output',
      payload: { nodeId, output, executionId },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitWorkflowNodeStart(nodeId: string, executionId: string, workflowId?: string): void {
    this.emit('workflow_node_event', {
      type: 'workflow_node_start',
      payload: { nodeId, executionId, workflowId },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitWorkflowNodeComplete(nodeId: string, executionId: string, result: unknown, durationMs: number): void {
    this.emit('workflow_node_event', {
      type: 'workflow_node_complete',
      payload: { nodeId, executionId, result, durationMs },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }

  emitWorkflowNodeError(nodeId: string, executionId: string, error: string): void {
    this.emit('workflow_node_event', {
      type: 'workflow_node_error',
      payload: { nodeId, executionId, error },
      timestamp: toLocalISODateString()
    } as CronEvent)
  }
}

export const cronEvents = new CronEventEmitter()

// Heartbeat and connection limit constants
const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const HEARTBEAT_TIMEOUT = 10000 // 10 seconds
const MAX_CONNECTIONS = 1000

interface WebSocketClient {
  ws: WebSocket
  subscriptions: Set<string>
  isAlive: boolean
  lastPong: number
}

let wss: WebSocketServer | null = null
const clients: Set<WebSocketClient> = new Set()
let heartbeatInterval: NodeJS.Timeout | null = null
let eventForwardersRegistered = false

function handleJobEvent(event: CronEvent): void {
  sendToSubscribedClients('jobs', event)
}

function handleTaskEvent(event: CronEvent): void {
  sendToSubscribedClients('tasks', event)
}

function handleLogEvent(event: CronEvent): void {
  sendToSubscribedClients('logs', event)
}

function handleWorkflowEvent(event: CronEvent): void {
  sendToSubscribedClients('workflows', event)
}

function sendToSubscribedClients(channel: string, event: CronEvent): void {
  const message = JSON.stringify(event)
  for (const client of clients) {
    if (client.subscriptions.has('all') || client.subscriptions.has(channel)) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message)
      }
    }
  }
}

function registerEventForwarders(): void {
  if (eventForwardersRegistered) return
  cronEvents.on('job_event', handleJobEvent)
  cronEvents.on('task_event', handleTaskEvent)
  cronEvents.on('log_event', handleLogEvent)
  cronEvents.on('workflow_event', handleWorkflowEvent)
  cronEvents.on('workflow_node_event', handleWorkflowEvent)
  eventForwardersRegistered = true
}

function unregisterEventForwarders(): void {
  if (!eventForwardersRegistered) return
  cronEvents.off('job_event', handleJobEvent)
  cronEvents.off('task_event', handleTaskEvent)
  cronEvents.off('log_event', handleLogEvent)
  cronEvents.off('workflow_event', handleWorkflowEvent)
  cronEvents.off('workflow_node_event', handleWorkflowEvent)
  eventForwardersRegistered = false
}

export function initCronWebSocket(server: Server): WebSocketServer {
  if (wss) return wss

  wss = new WebSocketServer({ server, path: '/ws/cron' })

  wss.on('connection', (ws: WebSocket, req) => {
    if (clients.size >= MAX_CONNECTIONS) {
      ws.close(1013, 'Max connections exceeded')
      return
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(1008, 'Authentication required')
      return
    }

    const payload = UserService.verifyToken(token)
    if (!payload) {
      ws.close(1008, 'Invalid or expired token')
      return
    }

    ;(ws as any).userId = payload.userId
    ;(ws as any).userRole = payload.role

    const client: WebSocketClient = {
      ws,
      subscriptions: new Set(['all']),
      isAlive: true,
      lastPong: Date.now()
    }
    clients.add(client)

    ws.on('pong', () => {
      client.isAlive = true
      client.lastPong = Date.now()
    })

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())
        if (message.type === 'subscribe' && message.channels) {
          client.subscriptions = new Set(message.channels)
        }
        if (message.type === 'unsubscribe' && message.channels) {
          for (const ch of message.channels) {
            client.subscriptions.delete(ch)
          }
        }
      } catch {
      }
    })

    ws.on('close', () => {
      clients.delete(client)
    })

    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: toLocalISODateString()
    }))
  })

  registerEventForwarders()

  startHeartbeat()

  return wss
}

function startHeartbeat(): void {
  if (heartbeatInterval) return

  heartbeatInterval = setInterval(() => {
    for (const client of [...clients]) {
      if (!client.isAlive) {
        client.ws.terminate()
        clients.delete(client)
        continue
      }
      client.isAlive = false
      client.ws.ping()
    }
  }, HEARTBEAT_INTERVAL)
}

function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

export function closeCronWebSocket(): void {
  stopHeartbeat()
  unregisterEventForwarders()
  if (wss) {
    wss.close()
    wss = null
    clients.clear()
  }
}

export function getWebSocketClientCount(): number {
  return clients.size
}

// Test helpers - these are exported only for testing purposes
export function getClients(): Set<WebSocketClient> {
  return clients
}

export function triggerHeartbeat(): void {
  for (const client of [...clients]) {
    if (!client.isAlive) {
      client.ws.terminate()
      clients.delete(client)
      continue
    }
    client.isAlive = false
    client.ws.ping()
  }
}

export class WebSocketService {
  private static instance: WebSocketService | null = null
  private initialized = false

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService()
    }
    return WebSocketService.instance
  }

  initialize(server: Server): void {
    if (this.initialized) return
    initCronWebSocket(server)
    this.initialized = true
  }

  close(): void {
    closeCronWebSocket()
    this.initialized = false
  }

  getClientCount(): number {
    return getWebSocketClientCount()
  }

  getEvents(): CronEventEmitter {
    return cronEvents
  }
}
