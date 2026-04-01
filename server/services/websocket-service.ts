import { EventEmitter } from 'events'
import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { UserService } from './user-service.js'

export interface CronEvent {
  type: 'job_created' | 'job_updated' | 'job_deleted' | 'job_toggled' | 'job_executed' |
        'task_created' | 'task_updated' | 'task_completed' | 'task_failed' |
        'log_created' | 'log_updated'
  payload: unknown
  timestamp: string
}

class CronEventEmitter extends EventEmitter {
  emitJobCreated(job: unknown): void {
    this.emit('job_event', {
      type: 'job_created',
      payload: job,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitJobUpdated(job: unknown): void {
    this.emit('job_event', {
      type: 'job_updated',
      payload: job,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitJobDeleted(jobId: string): void {
    this.emit('job_event', {
      type: 'job_deleted',
      payload: { id: jobId },
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitJobToggled(job: unknown): void {
    this.emit('job_event', {
      type: 'job_toggled',
      payload: job,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitJobExecuted(jobId: string, result: { success: boolean; durationMs: number }): void {
    this.emit('job_event', {
      type: 'job_executed',
      payload: { jobId, ...result },
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitTaskCreated(task: unknown): void {
    this.emit('task_event', {
      type: 'task_created',
      payload: task,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitTaskUpdated(task: unknown): void {
    this.emit('task_event', {
      type: 'task_updated',
      payload: task,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitTaskCompleted(task: unknown): void {
    this.emit('task_event', {
      type: 'task_completed',
      payload: task,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitTaskFailed(task: unknown): void {
    this.emit('task_event', {
      type: 'task_failed',
      payload: task,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitLogCreated(log: unknown): void {
    this.emit('log_event', {
      type: 'log_created',
      payload: log,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }

  emitLogUpdated(log: unknown): void {
    this.emit('log_event', {
      type: 'log_updated',
      payload: log,
      timestamp: new Date().toISOString()
    } as CronEvent)
  }
}

export const cronEvents = new CronEventEmitter()

interface WebSocketClient {
  ws: WebSocket
  subscriptions: Set<string>
}

let wss: WebSocketServer | null = null
const clients: Set<WebSocketClient> = new Set()

export function initCronWebSocket(server: Server): WebSocketServer {
  if (wss) return wss

  wss = new WebSocketServer({ server, path: '/ws/cron' })

  wss.on('connection', (ws: WebSocket, req) => {
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
      subscriptions: new Set(['all'])
    }
    clients.add(client)

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
      timestamp: new Date().toISOString()
    }))
  })

  const sendToClients = (channel: string, event: CronEvent) => {
    const message = JSON.stringify(event)
    for (const client of clients) {
      if (client.subscriptions.has('all') || client.subscriptions.has(channel)) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message)
        }
      }
    }
  }

  cronEvents.on('job_event', (event: CronEvent) => sendToClients('jobs', event))
  cronEvents.on('task_event', (event: CronEvent) => sendToClients('tasks', event))
  cronEvents.on('log_event', (event: CronEvent) => sendToClients('logs', event))

  return wss
}

export function closeCronWebSocket(): void {
  if (wss) {
    wss.close()
    wss = null
    clients.clear()
  }
}

export function getWebSocketClientCount(): number {
  return clients.size
}