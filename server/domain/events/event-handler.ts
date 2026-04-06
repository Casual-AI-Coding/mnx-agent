export interface DomainEvent {
  readonly type: string
  readonly aggregateId: string
  readonly occurredAt: Date
  readonly payload: Record<string, unknown>
}

export interface JobCreatedEvent extends DomainEvent {
  readonly type: 'job.created'
  readonly payload: { name: string; cronExpression: string }
}

export interface JobExecutedEvent extends DomainEvent {
  readonly type: 'job.executed'
  readonly payload: { success: boolean; duration: number; output?: unknown; error?: string }
}

export interface TaskQueuedEvent extends DomainEvent {
  readonly type: 'task.queued'
  readonly payload: { taskType: string; priority: string }
}

export type AllDomainEvents = JobCreatedEvent | JobExecutedEvent | TaskQueuedEvent

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => Promise<void> | void
