import type { DomainEvent, EventHandler } from './event-handler'
import { getLogger } from '../../lib/logger.js'

export { type DomainEvent, type EventHandler } from './event-handler'
export type { JobCreatedEvent, JobExecutedEvent, TaskQueuedEvent, AllDomainEvents } from './event-handler'

const logger = getLogger()

export class DomainEventBus {
  private handlers = new Map<string, EventHandler[]>()

  subscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, [...existing, handler as EventHandler])
  }

  unsubscribe<T extends DomainEvent>(eventType: T['type'], handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(
      eventType,
      existing.filter((h) => h !== handler)
    )
  }

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventHandlers = this.handlers.get(event.type) ?? []
    await Promise.all(
      eventHandlers.map(async (handler) => {
        try {
          await handler(event)
        } catch (error) {
          logger.error(error, `Event handler error for '${event.type}'`)
        }
      })
    )
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)))
  }
}
