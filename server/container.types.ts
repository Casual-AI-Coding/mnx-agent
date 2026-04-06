import type { Container } from './container.js'

export interface CronJobRepositoryPort {
  findAll(): Promise<unknown[]>
  findById(id: string): Promise<unknown | null>
  create(data: unknown): Promise<unknown>
  update(id: string, data: unknown): Promise<unknown>
  delete(id: string): Promise<void>
}

export interface TaskRepositoryPort {
  findAll(): Promise<unknown[]>
  findById(id: string): Promise<unknown | null>
  create(data: unknown): Promise<unknown>
  update(id: string, data: unknown): Promise<unknown>
  delete(id: string): Promise<void>
}

export interface MediaRepositoryPort {
  findAll(): Promise<unknown[]>
  findById(id: string): Promise<unknown | null>
  create(data: unknown): Promise<unknown>
  update(id: string, data: unknown): Promise<unknown>
  delete(id: string): Promise<void>
}

export interface LogRepositoryPort {
  findAll(): Promise<unknown[]>
  findById(id: string): Promise<unknown | null>
  create(data: unknown): Promise<unknown>
}

export interface ContainerTokens {
  cronJobRepository: CronJobRepositoryPort
  taskRepository: TaskRepositoryPort
  mediaRepository: MediaRepositoryPort
  logRepository: LogRepositoryPort
  db: unknown
  logger: unknown
  config: Record<string, unknown>
  cronScheduler: unknown
  workflowEngine: unknown
  taskExecutor: unknown
  queueProcessor: unknown
  notificationService: unknown
  webhookService: unknown
}

export type Token = keyof ContainerTokens

export function resolve<T extends Token>(container: Container, token: T): ContainerTokens[T] {
  return container.resolve<ContainerTokens[T]>(token)
}
