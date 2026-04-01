import { toastInfo, toastSuccess, toastError } from './toast'

export interface WebSocketMessage {
  type: 'connected' | 'job_created' | 'job_updated' | 'job_deleted' | 'job_toggled' | 'job_executed' |
        'task_created' | 'task_updated' | 'task_completed' | 'task_failed' |
        'log_created' | 'log_updated'
  timestamp: string
  payload?: unknown
}

export interface SubscribeMessage {
  type: 'subscribe' | 'unsubscribe'
  channels: string[]
}

export type WebSocketChannel = 'all' | 'jobs' | 'tasks' | 'logs'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

export interface WebSocketEvent {
  type: string
  payload: unknown
  timestamp: string
}

interface QueuedEvent {
  event: WebSocketEvent
  channel: string
}

interface WebSocketClientOptions {
  url: string
  reconnectBaseDelay?: number
  reconnectMaxDelay?: number
  heartbeatInterval?: number
  heartbeatTimeout?: number
  jitterMax?: number
  autoConnect?: boolean
  bufferEvents?: boolean
}

export class ReconnectingWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private reconnectBaseDelay: number
  private reconnectMaxDelay: number
  private heartbeatInterval: number
  private heartbeatTimeout: number
  private jitterMax: number
  private bufferEvents: boolean

  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null

  private subscriptions: Set<WebSocketChannel> = new Set(['all'])
  private eventBuffer: QueuedEvent[] = []
  private eventListeners: Map<string, Set<(event: WebSocketEvent) => void>> = new Map()

  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set()
  private _status: ConnectionStatus = 'disconnected'

  constructor(options: WebSocketClientOptions) {
    this.url = options.url
    this.reconnectBaseDelay = options.reconnectBaseDelay ?? 1000
    this.reconnectMaxDelay = options.reconnectMaxDelay ?? 30000
    this.heartbeatInterval = options.heartbeatInterval ?? 30000
    this.heartbeatTimeout = options.heartbeatTimeout ?? 10000
    this.jitterMax = options.jitterMax ?? 1000
    this.bufferEvents = options.bufferEvents ?? true

    if (options.autoConnect ?? true) {
      this.connect()
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  private getReconnectDelay(): number {
    const exponentialDelay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      this.reconnectMaxDelay
    )
    const jitter = Math.random() * this.jitterMax
    return exponentialDelay + jitter
  }

  private setStatus(status: ConnectionStatus): void {
    if (this._status !== status) {
      this._status = status
      this.notifyStatusListeners(status)
    }
  }

  private notifyStatusListeners(status: ConnectionStatus): void {
    for (const listener of this.statusListeners) {
      try {
        listener(status)
      } catch (err) {
        console.error('[WebSocket] Status listener error:', err)
      }
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus('connected')
        this.startHeartbeat()
        this.resubscribe()
        this.flushEventBuffer()
      }

      this.ws.onclose = () => {
        this.cleanup()
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error)
        this.setStatus('disconnected')
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err)
      this.setStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer)
      this.pongTimeoutTimer = null
    }
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = this.getReconnectDelay()
    this.setStatus('reconnecting')

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }))

        this.pongTimeoutTimer = setTimeout(() => {
          console.warn('[WebSocket] Pong timeout, reconnecting...')
          this.ws?.close()
        }, this.heartbeatTimeout)
      }
    }, this.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private resubscribe(): void {
    if (this.subscriptions.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'subscribe',
        channels: Array.from(this.subscriptions)
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  private flushEventBuffer(): void {
    if (!this.bufferEvents || this.eventBuffer.length === 0) return

    const eventsToProcess = [...this.eventBuffer]
    this.eventBuffer = []

    for (const { event, channel } of eventsToProcess) {
      this.dispatchEvent(event, channel)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage | { type: 'pong' }

      if (message.type === 'pong') {
        if (this.pongTimeoutTimer) {
          clearTimeout(this.pongTimeoutTimer)
          this.pongTimeoutTimer = null
        }
        return
      }

      const channel = this.getChannelFromType(message.type)
      const event: WebSocketEvent = {
        type: message.type,
        payload: message.payload,
        timestamp: message.timestamp
      }

      if (this._status === 'connected') {
        this.dispatchEvent(event, channel)
      } else if (this.bufferEvents) {
        this.eventBuffer.push({ event, channel })
      }
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err)
    }
  }

  private getChannelFromType(type: string): string {
    if (type.startsWith('job_')) return 'jobs'
    if (type.startsWith('task_')) return 'tasks'
    if (type.startsWith('log_')) return 'logs'
    return 'all'
  }

  private dispatchEvent(event: WebSocketEvent, channel: string): void {
    const channelListeners = this.eventListeners.get(channel)
    if (channelListeners) {
      for (const listener of channelListeners) {
        try {
          listener(event)
        } catch (err) {
          console.error('[WebSocket] Event listener error:', err)
        }
      }
    }

    const allListeners = this.eventListeners.get('all')
    if (allListeners && channel !== 'all') {
      for (const listener of allListeners) {
        try {
          listener(event)
        } catch (err) {
          console.error('[WebSocket] Event listener error:', err)
        }
      }
    }
  }

  subscribe(channels: WebSocketChannel[]): void {
    for (const channel of channels) {
      this.subscriptions.add(channel)
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'subscribe',
        channels
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  unsubscribe(channels: WebSocketChannel[]): void {
    for (const channel of channels) {
      this.subscriptions.delete(channel)
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: SubscribeMessage = {
        type: 'unsubscribe',
        channels
      }
      this.ws.send(JSON.stringify(message))
    }
  }

  onEvent(channel: WebSocketChannel, listener: (event: WebSocketEvent) => void): () => void {
    if (!this.eventListeners.has(channel)) {
      this.eventListeners.set(channel, new Set())
    }
    this.eventListeners.get(channel)!.add(listener)

    return () => {
      this.eventListeners.get(channel)?.delete(listener)
    }
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this._status)

    return () => {
      this.statusListeners.delete(listener)
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.cleanup()
    this.ws?.close()
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('[WebSocket] Cannot send, not connected')
    }
  }
}

let wsClient: ReconnectingWebSocket | null = null

export function initWebSocketClient(url?: string): ReconnectingWebSocket {
  if (wsClient) {
    return wsClient
  }

  const wsUrl = url || getWebSocketUrl()
  wsClient = new ReconnectingWebSocket({
    url: wsUrl,
    autoConnect: true,
    bufferEvents: true
  })

  return wsClient
}

export function getWebSocketClient(): ReconnectingWebSocket | null {
  return wsClient
}

export function closeWebSocketClient(): void {
  if (wsClient) {
    wsClient.disconnect()
    wsClient = null
  }
}

function getWebSocketUrl(): string {
  if (import.meta.env.DEV) {
    return 'ws://localhost:4511/ws/cron'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/cron`
}

export function showEventToast(event: WebSocketEvent): void {
  switch (event.type) {
    case 'job_created':
      toastInfo('定时任务已创建', (event.payload as { name?: string })?.name || '新任务')
      break
    case 'job_executed':
      toastSuccess('任务执行完成', (event.payload as { jobId?: string })?.jobId || '')
      break
    case 'task_completed':
      toastSuccess('队列任务完成', (event.payload as { id?: string })?.id || '')
      break
    case 'task_failed':
      toastError('任务执行失败', (event.payload as { id?: string })?.id || '')
      break
  }
}
