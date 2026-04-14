import axios, { AxiosInstance, AxiosError } from 'axios'
import { retryWithBackoff } from './retry.js'

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
      const statusCode = data.base_resp?.status_code 
        ?? (data.error?.code ? Number(data.error?.code) : undefined)
        ?? error.response?.status 
        ?? 500
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
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/text/chatcompletion_v2', body)
        return response.data
      } catch (error) {
        return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
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
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async textToAudioSync(body: Record<string, unknown>): Promise<unknown> {
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/t2a_v2', body)
        return response.data
      } catch (error) {
        return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  }

  async textToAudioAsync(body: Record<string, unknown>): Promise<unknown> {
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/t2a_async_v2', body)
        return response.data
      } catch (error) {
        return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  }

  async textToAudioAsyncStatus(taskId: string): Promise<unknown> {
    try {
      const response = await this.client.get(`/v1/t2a_async_v2?task_id=${taskId}`)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async imageGeneration(body: Record<string, unknown>): Promise<unknown> {
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/image_generation', body)
        return response.data
      } catch (error) {
        return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  }

  async musicGeneration(body: Record<string, unknown>): Promise<unknown> {
    console.log('[MiniMax] Music Generation Request:', {
      body,
      timestamp: new Date().toISOString()
    })
    
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/music_generation', body, {
          timeout: 300000, // 5 minutes for music generation
        })
        return response.data
      } catch (error) {
        return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  }

  async musicPreprocess(formData: FormData): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/music_cover_preprocess', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async videoGeneration(body: Record<string, unknown>): Promise<unknown> {
    return retryWithBackoff(async () => {
      try {
        const response = await this.client.post('/v1/video_generation', body)
        return response.data
      } catch (error) {
        return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
      }
    })
  }

  async videoGenerationStatus(taskId: string): Promise<unknown> {
    try {
      const response = await this.client.get(`/v1/query/video_generation?task_id=${taskId}`)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async videoAgentGenerate(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/video_template_generation', body)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async videoAgentStatus(taskId: string): Promise<unknown> {
    try {
      const response = await this.client.get(`/v1/query/video_template_generation?task_id=${taskId}`)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async fileList(purpose?: string): Promise<unknown> {
    try {
      const url = purpose ? `/v1/files/list?purpose=${purpose}` : '/v1/files/list'
      const response = await this.client.get(url)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async fileUpload(formData: FormData): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async fileRetrieve(fileId: number): Promise<unknown> {
    try {
      const response = await this.client.get(`/v1/files/retrieve?file_id=${fileId}`)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async fileDelete(fileId: number, purpose: string): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/files/delete', { file_id: fileId, purpose })
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async voiceList(voiceType: string = 'all'): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/get_voice', { voice_type: voiceType })
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async voiceDelete(voiceId: string, voiceType: string): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/delete_voice', { voice_id: voiceId, voice_type: voiceType })
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async voiceClone(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/voice_clone', body)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async voiceDesign(body: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/v1/voice_design', body)
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async getBalance(): Promise<unknown> {
    try {
      const response = await this.client.get('/v1/user/balance')
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }

  async getCodingPlanRemains(productId: string = '1001'): Promise<unknown> {
    try {
      const response = await this.client.get('/v1/api/openplatform/coding_plan/remains', {
        headers: {
          'productId': productId,
        },
      })
      return response.data
    } catch (error) {
      return this.handleError(error as AxiosError<MiniMaxErrorResponse>)
    }
  }
}

// Mock client that returns errors gracefully when API key is not configured
class MockMiniMaxClient extends MiniMaxClient {
  constructor() {
    // Pass dummy values to satisfy parent constructor
    super('mock-key', 'international')
  }

  private createErrorResponse(operation: string): never {
    const err = new Error(`MINIMAX_API_KEY not configured. Cannot execute ${operation}.`) as Error & MiniMaxError
    err.code = 503
    throw err
  }

  async chatCompletion(): Promise<unknown> { return this.createErrorResponse('chatCompletion') }
  async chatCompletionStream(): Promise<{ data: string; isEnd: boolean }[]> { return this.createErrorResponse('chatCompletionStream') }
  async textToAudioSync(): Promise<unknown> { return this.createErrorResponse('textToAudioSync') }
  async textToAudioAsync(): Promise<unknown> { return this.createErrorResponse('textToAudioAsync') }
  async textToAudioAsyncStatus(): Promise<unknown> { return this.createErrorResponse('textToAudioAsyncStatus') }
  async imageGeneration(): Promise<unknown> { return this.createErrorResponse('imageGeneration') }
  async musicGeneration(): Promise<unknown> { return this.createErrorResponse('musicGeneration') }
  async musicPreprocess(): Promise<unknown> { return this.createErrorResponse('musicPreprocess') }
  async videoGeneration(): Promise<unknown> { return this.createErrorResponse('videoGeneration') }
  async videoGenerationStatus(): Promise<unknown> { return this.createErrorResponse('videoGenerationStatus') }
  async videoAgentGenerate(): Promise<unknown> { return this.createErrorResponse('videoAgentGenerate') }
  async videoAgentStatus(): Promise<unknown> { return this.createErrorResponse('videoAgentStatus') }
  async fileList(): Promise<unknown> { return this.createErrorResponse('fileList') }
  async fileUpload(): Promise<unknown> { return this.createErrorResponse('fileUpload') }
  async fileRetrieve(): Promise<unknown> { return this.createErrorResponse('fileRetrieve') }
  async fileDelete(): Promise<unknown> { return this.createErrorResponse('fileDelete') }
  async voiceList(): Promise<unknown> { return this.createErrorResponse('voiceList') }
  async voiceDelete(): Promise<unknown> { return this.createErrorResponse('voiceDelete') }
  async voiceClone(): Promise<unknown> { return this.createErrorResponse('voiceClone') }
  async voiceDesign(): Promise<unknown> { return this.createErrorResponse('voiceDesign') }
  async getBalance(): Promise<unknown> { return this.createErrorResponse('getBalance') }
  async getCodingPlanRemains(): Promise<unknown> { return this.createErrorResponse('getCodingPlanRemains') }
}

let clientInstance: MiniMaxClient | null = null

export function getMiniMaxClient(): MiniMaxClient {
  if (!clientInstance) {
    const apiKey = process.env.MINIMAX_API_KEY
    if (!apiKey) {
      console.warn('[MiniMaxClient] MINIMAX_API_KEY not configured, using mock client that will fail on API calls')
      clientInstance = new MockMiniMaxClient()
    } else {
      const envRegion = process.env.MINIMAX_REGION
      const region: Region = (envRegion === 'cn' ? 'domestic' : 'international')
      clientInstance = new MiniMaxClient(apiKey, region)
    }
  }
  return clientInstance
}

export function createMiniMaxClientFromHeaders(apiKey: string, region?: string): MiniMaxClient {
  if (!apiKey) {
    throw new Error('API key is required')
  }
  const regionValue = (region === 'cn' ? 'domestic' : 'international') as Region
  return new MiniMaxClient(apiKey, regionValue)
}

export function resetMiniMaxClient(): void {
  clientInstance = null
}

export type { Region }
