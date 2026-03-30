import axios, { AxiosInstance, AxiosError } from 'axios'

const API_HOSTS = {
  domestic: 'https://api.minimaxi.com',
  international: 'https://api.minimax.io',
}

type Region = 'domestic' | 'international'

interface MiniMaxErrorResponse {
  base_resp?: {
    status_code: number
    status_msg: string
  }
  error?: {
    code: string
    message: string
  }
}

interface MiniMaxError {
  code: number
  message: string
}

const ERROR_CODE_MAP: Record<number, { status: number; message: string }> = {
  0: { status: 200, message: 'success' },
  1002: { status: 429, message: 'Rate limit exceeded' },
  1008: { status: 402, message: 'Insufficient balance' },
}

function getErrorMapping(statusCode: number): { status: number; message: string } {
  return ERROR_CODE_MAP[statusCode] || { status: 500, message: 'Internal server error' }
}

export class MiniMaxClient {
  private client: AxiosInstance

  constructor(apiKey: string, region: Region = 'international') {
    const baseURL = API_HOSTS[region]

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    })
  }

  private handleError(error: AxiosError<MiniMaxErrorResponse>): never {
    const axiosError = error as AxiosError<MiniMaxErrorResponse>
    
    if (axiosError.response?.data) {
      const data = axiosError.response.data
      const statusCode = data.base_resp?.status_code ?? data.error?.code ? Number(data.error?.code) : error.response?.status ?? 500
      const statusMsg = data.base_resp?.status_msg ?? data.error?.message ?? 'Unknown error'
      
      const err = new Error(statusMsg) as Error & MiniMaxError
      err.code = statusCode
      throw err
    }
    
    if (error.code === 'ECONNABORTED') {
      const err = new Error('Request timeout') as Error & MiniMaxError
      err.code = 408
      throw err
    }
    
    const err = new Error(error.message || 'Request failed') as Error & MiniMaxError
    err.code = error.response?.status ?? 500
    throw err
  }

  async chatCompletion(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/text/chatcompletion_v2', body)
      return response.data
    } catch (error) {
      this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async chatCompletionStream(body: Record<string, unknown>): Promise<{ data: string; isEnd: boolean }[]> {
    try {
      const response = await this.client.post('/v1/text/chatcompletion_v2', body, {
        responseType: 'stream',
      })

      const stream = response.data as AsyncIterable<Buffer>
      const chunks: { data: string; isEnd: boolean }[] = []

      for await (const chunk of stream) {
        const lines = chunk.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              chunks.push({ data: '[DONE]', isEnd: true })
            } else {
              chunks.push({ data, isEnd: false })
            }
          }
        }
      }

      return chunks
    } catch (error) {
      this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async textToAudioSync(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/t2a_v2', body)
      return response.data
    } catch (error) {
      this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async textToAudioAsync(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/t2a_async_v2', body)
      return response.data
    } catch (error) {
      this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async textToAudioAsyncStatus(taskId: string): Promise<unknown> {
    try {
      const response = await this.client.get(`/v1/t2a_async_v2?task_id=${taskId}`)
      return response.data
    } catch (error) {
      this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async imageGeneration(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/image_generation', body)
      return response.data
    } catch (error) {
      this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }
}

let clientInstance: MiniMaxClient | null = null

export function getMiniMaxClient(): MiniMaxClient {
  if (!clientInstance) {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      throw new Error('MINIMAX_API_KEY is not configured')
    }
    const region = (process.env.MINIMAX_REGION as Region) || 'international'
    clientInstance = new MiniMaxClient(apiKey, region)
  }
  return clientInstance
}

export type { Region }
