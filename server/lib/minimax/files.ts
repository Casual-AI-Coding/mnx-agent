import type { AxiosError } from 'axios'
import { withExternalApiAudit, withExternalApiLog } from '../../services/external-api-audit.service.js'
import { MiniMaxClient } from './client.js'
import type { MiniMaxErrorResponse } from './types.js'

export async function fileList(client: MiniMaxClient, purpose?: string): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/files/list',
    'file_list',
    async () => {
      try {
        const url = purpose ? `/v1/files/list?purpose=${purpose}` : '/v1/files/list'
        const response = await client['client'].get(url)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function fileUpload(client: MiniMaxClient, formData: FormData): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/files/upload',
    'file_upload',
    formData,
    async () => {
      try {
        const response = await client['client'].post('/v1/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function fileRetrieve(client: MiniMaxClient, fileId: number): Promise<unknown> {
  return withExternalApiLog(
    'minimax',
    'GET /v1/files/retrieve',
    'file_retrieve',
    async () => {
      try {
        const response = await client['client'].get(`/v1/files/retrieve?file_id=${fileId}`)
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

export async function fileDelete(client: MiniMaxClient, fileId: number, purpose: string): Promise<unknown> {
  return withExternalApiAudit(
    'minimax',
    'POST /v1/files/delete',
    'file_delete',
    { file_id: fileId, purpose },
    async () => {
      try {
        const response = await client['client'].post('/v1/files/delete', { file_id: fileId, purpose })
        return response.data
      } catch (error) {
        return MiniMaxClient.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    }
  )()
}

MiniMaxClient.prototype.fileList = function (purpose?: string): Promise<unknown> {
  return fileList(this, purpose)
}

MiniMaxClient.prototype.fileUpload = function (formData: FormData): Promise<unknown> {
  return fileUpload(this, formData)
}

MiniMaxClient.prototype.fileRetrieve = function (fileId: number): Promise<unknown> {
  return fileRetrieve(this, fileId)
}

MiniMaxClient.prototype.fileDelete = function (fileId: number, purpose: string): Promise<unknown> {
  return fileDelete(this, fileId, purpose)
}

declare module './client.js' {
  interface MiniMaxClient {
    fileList(purpose?: string): Promise<unknown>
    fileUpload(formData: FormData): Promise<unknown>
    fileRetrieve(fileId: number): Promise<unknown>
    fileDelete(fileId: number, purpose: string): Promise<unknown>
  }
}
