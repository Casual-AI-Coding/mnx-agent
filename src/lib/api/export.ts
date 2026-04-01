import axios, { AxiosInstance } from 'axios'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type ExportFormat = 'csv' | 'json'

export interface ExportExecutionLogsParams {
  format: ExportFormat
  startDate?: string
  endDate?: string
}

export interface ExportMediaRecordsParams {
  format: ExportFormat
  type?: 'audio' | 'image' | 'video' | 'music'
}

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4511',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function exportExecutionLogs(params: ExportExecutionLogsParams): Promise<void> {
  const response = await client.get('/export/execution-logs', {
    params,
    responseType: params.format === 'csv' ? 'text' : 'json'
  })

  const blob = params.format === 'csv'
    ? new Blob([response.data], { type: 'text/csv' })
    : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `execution-logs-${new Date().toISOString().split('T')[0]}.${params.format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export async function exportMediaRecords(params: ExportMediaRecordsParams): Promise<void> {
  const response = await client.get('/export/media-records', {
    params,
    responseType: params.format === 'csv' ? 'text' : 'json'
  })

  const blob = params.format === 'csv'
    ? new Blob([response.data], { type: 'text/csv' })
    : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })

  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `media-records-${new Date().toISOString().split('T')[0]}.${params.format}`
  document.body.appendChild(link)
  link.click
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}