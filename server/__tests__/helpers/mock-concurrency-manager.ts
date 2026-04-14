import type { IConcurrencyManager } from '../../services/interfaces/concurrency-manager.interface.js'

export function createMockConcurrencyManager(): IConcurrencyManager {
  const runningJobs = new Set<string>()
  let shuttingDown = false

  return {
    acquireSlot: async (jobId: string) => {
      runningJobs.add(jobId)
      return true
    },
    releaseSlot: (jobId: string) => {
      runningJobs.delete(jobId)
    },
    getRunningJobs: () => runningJobs,
    getRunningCount: () => runningJobs.size,
    isShuttingDown: () => shuttingDown,
    setShuttingDown: (value: boolean) => {
      shuttingDown = value
    },
  }
}