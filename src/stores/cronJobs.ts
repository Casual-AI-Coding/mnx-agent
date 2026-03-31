import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CronJob,
  CreateCronJobDTO,
  UpdateCronJobDTO,
} from '../types/cron'

interface CronJobsState {
  jobs: CronJob[]
  loading: boolean
  error: string | null
  fetchJobs: () => Promise<void>
  createJob: (job: CreateCronJobDTO) => Promise<CronJob>
  updateJob: (id: string, updates: UpdateCronJobDTO) => Promise<CronJob>
  deleteJob: (id: string) => Promise<void>
  toggleJob: (id: string) => Promise<void>
  runJobManually: (id: string) => Promise<void>
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const placeholderApi = {
  fetchJobs: async (): Promise<CronJob[]> => {
    return []
  },
  createJob: async (job: CreateCronJobDTO): Promise<CronJob> => {
    return {
      id: generateId(),
      name: job.name,
      description: job.description,
      cronExpression: job.cronExpression,
      isActive: job.isActive ?? true,
      workflowJson: job.workflowJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: null,
      totalRuns: 0,
      totalFailures: 0,
    }
  },
  updateJob: async (id: string, updates: UpdateCronJobDTO): Promise<CronJob> => {
    return {
      id,
      name: updates.name ?? 'Updated Job',
      description: updates.description ?? '',
      cronExpression: updates.cronExpression ?? '* * * * *',
      isActive: updates.isActive ?? true,
      workflowJson: updates.workflowJson ?? '{}',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: null,
      totalRuns: 0,
      totalFailures: 0,
    }
  },
  deleteJob: async (id: string): Promise<void> => {
    console.log(`Placeholder: Deleting job ${id}`)
  },
  toggleJob: async (id: string, isActive: boolean): Promise<CronJob> => {
    return {
      id,
      name: 'Toggled Job',
      description: '',
      cronExpression: '* * * * *',
      isActive,
      workflowJson: '{}',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      nextRunAt: null,
      totalRuns: 0,
      totalFailures: 0,
    }
  },
  runJobManually: async (id: string): Promise<void> => {
    console.log(`Placeholder: Running job ${id} manually`)
  },
}

export const useCronJobsStore = create<CronJobsState>()(
  persist(
    (set, get) => ({
      jobs: [],
      loading: false,
      error: null,

      fetchJobs: async () => {
        set({ loading: true, error: null })
        try {
          const jobs = await placeholderApi.fetchJobs()
          set({ jobs, loading: false })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch jobs',
            loading: false,
          })
        }
      },

      createJob: async (jobData) => {
        set({ loading: true, error: null })
        try {
          const newJob = await placeholderApi.createJob(jobData)
          set((state) => ({
            jobs: [...state.jobs, newJob],
            loading: false,
          }))
          return newJob
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to create job',
            loading: false,
          })
          throw err
        }
      },

      updateJob: async (id, updates) => {
        set({ loading: true, error: null })
        try {
          const updatedJob = await placeholderApi.updateJob(id, updates)
          set((state) => ({
            jobs: state.jobs.map((job) =>
              job.id === id ? { ...job, ...updatedJob, updatedAt: new Date().toISOString() } : job
            ),
            loading: false,
          }))
          return updatedJob
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to update job',
            loading: false,
          })
          throw err
        }
      },

      deleteJob: async (id) => {
        set({ loading: true, error: null })
        try {
          await placeholderApi.deleteJob(id)
          set((state) => ({
            jobs: state.jobs.filter((job) => job.id !== id),
            loading: false,
          }))
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to delete job',
            loading: false,
          })
          throw err
        }
      },

      toggleJob: async (id) => {
        const job = get().jobs.find((j) => j.id === id)
        if (!job) return

        set({ loading: true, error: null })
        try {
          const newIsActive = !job.isActive
          await placeholderApi.toggleJob(id, newIsActive)
          set((state) => ({
            jobs: state.jobs.map((j) =>
              j.id === id
                ? { ...j, isActive: newIsActive, updatedAt: new Date().toISOString() }
                : j
            ),
            loading: false,
          }))
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to toggle job',
            loading: false,
          })
          throw err
        }
      },

      runJobManually: async (id) => {
        set({ loading: true, error: null })
        try {
          await placeholderApi.runJobManually(id)
          set((state) => ({
            jobs: state.jobs.map((job) =>
              job.id === id
                ? {
                    ...job,
                    lastRunAt: new Date().toISOString(),
                    totalRuns: job.totalRuns + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : job
            ),
            loading: false,
          }))
        } catch (err) {
          set((state) => ({
            jobs: state.jobs.map((job) =>
              job.id === id
                ? {
                    ...job,
                    lastRunAt: new Date().toISOString(),
                    totalFailures: job.totalFailures + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : job
            ),
            error: err instanceof Error ? err.message : 'Failed to run job',
            loading: false,
          }))
          throw err
        }
      },
    }),
    {
      name: 'minimax-cron-jobs',
    }
  )
)