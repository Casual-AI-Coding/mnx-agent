import { create } from 'zustand'
import type {
  CronJob,
  BackendJob,
  CreateCronJobDTO,
  UpdateCronJobDTO,
} from '../types/cron'
import {
  getCronJobs,
  createCronJob as apiCreateCronJob,
  updateCronJob as apiUpdateCronJob,
  deleteCronJob as apiDeleteCronJob,
  toggleCronJob as apiToggleCronJob,
  runCronJob as apiRunCronJob,
  addJobTag as apiAddJobTag,
  removeJobTag as apiRemoveJobTag,
  getJobTags as apiGetJobTags,
  addJobDependency as apiAddJobDependency,
  removeJobDependency as apiRemoveJobDependency,
  getJobDependencies as apiGetJobDependencies,
} from '../lib/api/cron'
import { getWebSocketClient, type JobEventPayload } from '@/lib/websocket-client'

function transformJobResponse(job: BackendJob): CronJob {
  return {
    id: job.id,
    name: job.name,
    description: job.description ?? '',
    cronExpression: job.cron_expression,
    timezone: job.timezone ?? 'Asia/Shanghai',
    isActive: Boolean(job.is_active),
    workflowId: job.workflow_id,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    lastRunAt: job.last_run_at,
    nextRunAt: job.next_run_at,
    totalRuns: job.total_runs ?? 0,
    totalFailures: job.total_failures ?? 0,
  }
}

interface CronJobsState {
  jobs: CronJob[]
  loading: boolean
  error: string | null
  _wsUnsubscribe?: () => void
  fetchJobs: () => Promise<void>
  createJob: (job: CreateCronJobDTO) => Promise<CronJob>
  updateJob: (id: string, updates: UpdateCronJobDTO) => Promise<CronJob>
  deleteJob: (id: string) => Promise<void>
  toggleJob: (id: string) => Promise<void>
  runJobManually: (id: string) => Promise<void>
  addJobTag: (jobId: string, tag: string) => Promise<string[]>
  removeJobTag: (jobId: string, tag: string) => Promise<string[]>
  getJobTags: (jobId: string) => Promise<string[]>
  addJobDependency: (jobId: string, dependsOnJobId: string) => Promise<string[]>
  removeJobDependency: (jobId: string, dependsOnJobId: string) => Promise<string[]>
  getJobDependencies: (jobId: string) => Promise<string[]>
  subscribeToWebSocket: () => void
  unsubscribeFromWebSocket: () => void
}

export const useCronJobsStore = create<CronJobsState>()((set, get) => ({
  jobs: [],
  loading: false,
  error: null,

  fetchJobs: async () => {
    set({ loading: true, error: null })
    try {
      const response = await getCronJobs()
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch jobs')
      }
      const jobs = response.data.jobs.map((j) => transformJobResponse(j))
      set({ jobs, loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch jobs',
        loading: false,
      })
    }
  },

  createJob: async (jobData: CreateCronJobDTO) => {
    set({ loading: true, error: null })
    try {
      const response = await apiCreateCronJob(jobData)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create job')
      }
      const newJob = transformJobResponse(response.data)
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

  updateJob: async (id: string, updates: UpdateCronJobDTO) => {
    set({ loading: true, error: null })
    try {
      const response = await apiUpdateCronJob(id, updates)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update job')
      }
      const updatedJob = transformJobResponse(response.data)
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

  deleteJob: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiDeleteCronJob(id)
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete job')
      }
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

  toggleJob: async (id: string) => {
    const job = get().jobs.find((j) => j.id === id)
    if (!job) return

    set({ loading: true, error: null })
    try {
      const response = await apiToggleCronJob(id)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to toggle job')
      }
      const jobData = response.data.job
      const newIsActive = jobData.is_active !== undefined 
        ? Boolean(jobData.is_active) 
        : !job.isActive
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

  runJobManually: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiRunCronJob(id)
      if (!response.success) {
        throw new Error(response.error || 'Failed to run job')
      }
      set({ loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to run job',
        loading: false,
      })
      throw err
    }
  },

  addJobTag: async (jobId: string, tag: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiAddJobTag(jobId, tag)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to add job tag')
      }
      set({ loading: false })
      return response.data.tags
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add job tag',
        loading: false,
      })
      throw err
    }
  },

  removeJobTag: async (jobId: string, tag: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiRemoveJobTag(jobId, tag)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to remove job tag')
      }
      set({ loading: false })
      return response.data.tags
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to remove job tag',
        loading: false,
      })
      throw err
    }
  },

  getJobTags: async (jobId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiGetJobTags(jobId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get job tags')
      }
      set({ loading: false })
      return response.data.tags
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to get job tags',
        loading: false,
      })
      throw err
    }
  },

  addJobDependency: async (jobId: string, dependsOnJobId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiAddJobDependency(jobId, dependsOnJobId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to add job dependency')
      }
      set({ loading: false })
      return response.data.dependencies
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add job dependency',
        loading: false,
      })
      throw err
    }
  },

  removeJobDependency: async (jobId: string, dependsOnJobId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiRemoveJobDependency(jobId, dependsOnJobId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to remove job dependency')
      }
      set({ loading: false })
      return response.data.dependencies
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to remove job dependency',
        loading: false,
      })
      throw err
    }
  },

  getJobDependencies: async (jobId: string) => {
    set({ loading: true, error: null })
    try {
      const response = await apiGetJobDependencies(jobId)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to get job dependencies')
      }
      set({ loading: false })
      return response.data.dependencies
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to get job dependencies',
        loading: false,
      })
      throw err
    }
  },

  subscribeToWebSocket: () => {
    const client = getWebSocketClient()
    if (!client) return

    const currentUnsub = get()._wsUnsubscribe
    if (currentUnsub) return

    const unsub = client.onEvent('jobs', (event) => {
      const { type, payload } = event
      const jobPayload = payload as JobEventPayload

      switch (type) {
        case 'job_created': {
          if (jobPayload.id) {
            const newJob = transformJobResponse(jobPayload as BackendJob)
            set((state) => {
              if (state.jobs.find((j) => j.id === newJob.id)) return state
              return { jobs: [...state.jobs, newJob] }
            })
          }
          break
        }

        case 'job_updated':
        case 'job_toggled': {
          if (jobPayload.id) {
            const updatedJob = transformJobResponse(jobPayload as BackendJob)
            set((state) => ({
              jobs: state.jobs.map((job) =>
                job.id === updatedJob.id ? { ...job, ...updatedJob } : job
              ),
            }))
          }
          break
        }

        case 'job_deleted': {
          const { id } = jobPayload
          if (id) {
            set((state) => ({
              jobs: state.jobs.filter((job) => job.id !== id),
            }))
          }
          break
        }

        case 'job_executed': {
          const { jobId, success } = jobPayload
          if (jobId) {
            set((state) => ({
              jobs: state.jobs.map((job) =>
                job.id === jobId
                  ? {
                      ...job,
                      lastRunAt: new Date().toISOString(),
                      totalRuns: job.totalRuns + 1,
                      totalFailures: success ? job.totalFailures : job.totalFailures + 1,
                    }
                  : job
              ),
            }))
          }
          break
        }
      }
    })

    set({ _wsUnsubscribe: unsub })
  },

  unsubscribeFromWebSocket: () => {
    const unsub = get()._wsUnsubscribe
    if (unsub) {
      unsub()
      set({ _wsUnsubscribe: undefined })
    }
  },
}))