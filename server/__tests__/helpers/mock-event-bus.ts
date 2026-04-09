import type { IEventBus } from '../../services/interfaces/event-bus.interface.js'

/**
 * Creates a mock IEventBus for testing purposes.
 * All methods are no-ops that do nothing.
 */
export function createMockEventBus(): IEventBus {
  return {
    emitJobCreated: () => {},
    emitJobUpdated: () => {},
    emitJobDeleted: () => {},
    emitJobToggled: () => {},
    emitJobExecuted: () => {},
    emitTaskCreated: () => {},
    emitTaskUpdated: () => {},
    emitTaskCompleted: () => {},
    emitTaskFailed: () => {},
    emitTaskMovedToDLQ: () => {},
    emitLogCreated: () => {},
    emitLogUpdated: () => {},
    emitWorkflowTestStarted: () => {},
    emitWorkflowTestCompleted: () => {},
    emitWorkflowNodeOutput: () => {},
    emitWorkflowNodeStart: () => {},
    emitWorkflowNodeComplete: () => {},
    emitWorkflowNodeError: () => {},
  }
}