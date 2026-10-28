import { useEffect, useState, useCallback, useRef } from 'react'
import {
  initWebSocketClient,
  getWebSocketClient,
  closeWebSocketClient,
  type ConnectionStatus,
  type WebSocketEvent,
  type WebSocketChannel,
} from '@/lib/websocket-client'
import { ingestWebSocketEvent } from '@/lib/notification-events'

interface UseWebSocketOptions {
  channels?: WebSocketChannel[]
  showToasts?: boolean
  onEvent?: (event: WebSocketEvent) => void
  url?: string
}

interface UseWebSocketReturn {
  status: ConnectionStatus
  events: WebSocketEvent[]
  isConnected: boolean
  connect: () => void
  disconnect: () => void
  subscribe: (channels: WebSocketChannel[]) => void
  unsubscribe: (channels: WebSocketChannel[]) => void
  clearEvents: () => void
}

const MAX_EVENTS_BUFFER = 100

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    channels = ['all'],
    showToasts = false,
    onEvent,
    url,
  } = options

  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [events, setEvents] = useState<WebSocketEvent[]>([])
  const eventsRef = useRef<WebSocketEvent[]>([])
  const unsubscribeFns = useRef<(() => void)[]>([])

  const addEvent = useCallback((event: WebSocketEvent) => {
    eventsRef.current = [event, ...eventsRef.current].slice(0, MAX_EVENTS_BUFFER)
    setEvents(eventsRef.current)
  }, [])

  useEffect(() => {
    const client = initWebSocketClient(url)

    const unsubStatus = client.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })

    const unsubEvents = client.onEvent('all', (event) => {
      addEvent(event)

      if (showToasts) {
        // R-016: 统一走通知中心分发（error 级别才弹 Toast），不再全量 toast
        ingestWebSocketEvent(event)
      }

      onEvent?.(event)
    })

    client.subscribe(channels)

    unsubscribeFns.current = [unsubStatus, unsubEvents]

    return () => {
      unsubStatus()
      unsubEvents()
      client.unsubscribe(channels)
    }
  }, [channels.join(','), showToasts, url, onEvent, addEvent])

  const connect = useCallback(() => {
    const client = getWebSocketClient()
    if (client) {
      client.connect()
    } else {
      initWebSocketClient(url)
    }
  }, [url])

  const disconnect = useCallback(() => {
    closeWebSocketClient()
  }, [])

  const subscribe = useCallback((newChannels: WebSocketChannel[]) => {
    const client = getWebSocketClient()
    if (client) {
      client.subscribe(newChannels)
    }
  }, [])

  const unsubscribe = useCallback((oldChannels: WebSocketChannel[]) => {
    const client = getWebSocketClient()
    if (client) {
      client.unsubscribe(oldChannels)
    }
  }, [])

  const clearEvents = useCallback(() => {
    eventsRef.current = []
    setEvents([])
  }, [])

  return {
    status,
    events,
    isConnected: status === 'connected',
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearEvents,
  }
}
