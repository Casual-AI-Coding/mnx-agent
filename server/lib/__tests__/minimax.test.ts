// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios, { AxiosError, AxiosInstance } from 'axios'
import { MiniMaxClient, getMiniMaxClient, resetMiniMaxClient, createMiniMaxClientFromHeaders } from '../minimax'

vi.mock('../retry.js', () => ({
  retryWithBackoff: vi.fn(async (fn) => await fn()),
}))

describe('MiniMaxClient', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
    resetMiniMaxClient()
  })

  afterEach(() => {
    resetMiniMaxClient()
  })

  describe('constructor', () => {
    it('should expose the same public API from the minimax barrel entry', async () => {
      const minimaxModule = await import('../minimax/index.js')

      expect(minimaxModule.MiniMaxClient).toBe(MiniMaxClient)
      expect(minimaxModule.getMiniMaxClient).toBe(getMiniMaxClient)
      expect(minimaxModule.resetMiniMaxClient).toBe(resetMiniMaxClient)
      expect(minimaxModule.createMiniMaxClientFromHeaders).toBe(createMiniMaxClientFromHeaders)
    })

    it('should use domestic region (api.minimaxi.com)', () => {
      const client = new MiniMaxClient('test-api-key', 'domestic')
      
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.minimaxi.com',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      })
    })

    it('should use international region (api.minimax.io) by default', () => {
      const client = new MiniMaxClient('test-api-key')
      
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.minimax.io',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      })
    })

    it('should use international region when specified', () => {
      const client = new MiniMaxClient('test-api-key', 'international')
      
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.minimax.io',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      })
    })

    it('should set Authorization header correctly with Bearer prefix', () => {
      const client = new MiniMaxClient('my-secret-key', 'international')
      
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer my-secret-key',
        }),
      }))
    })
  })

  describe('error handling - ERROR_CODE_MAP', () => {
    it('should map status code 0 to 200 (success)', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 0,
            status_msg: 'success',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'success',
        code: 0,
      })
    })

    it('should map error code 1002 to 429 (Rate limit exceeded)', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1002,
            status_msg: 'Rate limit exceeded',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'Rate limit exceeded',
        code: 1002,
      })
    })

    it('should map error code 1008 to 402 (Insufficient balance)', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1008,
            status_msg: 'Insufficient balance',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'Insufficient balance',
        code: 1008,
      })
    })

    it('should map unknown codes to 500', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 9999,
            status_msg: 'Unknown error',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'Unknown error',
        code: 9999,
      })
    })
  })

  describe('handleError method', () => {
    it('should preserve structured context for base_resp errors', () => {
      const responseData = {
        base_resp: {
          status_code: 1001,
          status_msg: 'Invalid parameter',
        },
      }
      const error = new AxiosError('Request failed')
      error.response = {
        status: 400,
        data: responseData,
      }

      try {
        MiniMaxClient.handleError(error)
        throw new Error('expected handleError to throw')
      } catch (thrown) {
        expect(thrown).toMatchObject({
          message: 'Invalid parameter',
          code: 1001,
          status: 400,
          response: responseData,
        })
        expect(thrown).toHaveProperty('cause', error)
      }
    })

    it('should handle base_resp error format', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Invalid parameter',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'Invalid parameter',
        code: 1001,
      })
    })

    it('should handle error.code format', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 400,
        data: {
          error: {
            code: '403',
            message: 'Forbidden',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'Forbidden',
        code: 403,
      })
    })

    it('should handle ECONNABORTED timeout error', () => {
      const error = new AxiosError('timeout of 60000ms exceeded')
      error.code = 'ECONNABORTED'

      try {
        MiniMaxClient.handleError(error)
        throw new Error('expected handleError to throw')
      } catch (thrown) {
        expect(thrown).toMatchObject({
          message: 'Request timeout',
          code: 408,
          status: 408,
        })
        expect(thrown).toHaveProperty('cause', error)
      }
    })

    it('should handle generic axios error without response', () => {
      const error = new AxiosError('Network Error')
      error.code = 'ERR_NETWORK'
      error.response = undefined

      try {
        MiniMaxClient.handleError(error)
        throw new Error('expected handleError to throw')
      } catch (thrown) {
        expect(thrown).toMatchObject({
          message: 'Network Error',
          code: 500,
          status: 500,
        })
        expect(thrown).toHaveProperty('cause', error)
      }
    })

    it('should use response status and Unknown error when no base_resp or error.code', async () => {
      const error = new AxiosError('Bad Request')
      error.response = {
        status: 400,
        data: {},
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toMatchObject({
        message: 'Unknown error',
        code: 400,
      })
    })

    it('should use default message when error.message is empty', () => {
      const error = new AxiosError('')
      error.response = undefined

      expect(() => MiniMaxClient.handleError(error)).toThrow('Request failed')
    })
  })

  describe('chatCompletion method', () => {
    it('should return successful response', async () => {
      const mockResponse = {
        choices: [
          { message: { role: 'assistant', content: 'Hello!' } },
        ],
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.chatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/text/chatcompletion_v2', {
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error and throw', async () => {
      const error = new AxiosError('Request failed')
      error.code = 'ERR_BAD_RESPONSE'
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1002,
            status_msg: 'Rate limit exceeded',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletion({})).rejects.toThrow()
    })

    it('should preserve structured context and stable serialization through public call path', async () => {
      const responseData = {
        base_resp: {
          status_code: 1002,
          status_msg: 'Rate limit exceeded',
        },
      }
      const error = new AxiosError('Request failed')
      error.code = 'ERR_BAD_RESPONSE'
      error.response = {
        status: 503,
        data: responseData,
      }

      mockClient.post.mockRejectedValueOnce(error)

      const client = new MiniMaxClient('test-key')

      try {
        await client.chatCompletion({ model: 'abab6.5s-chat', messages: [] })
        throw new Error('expected chatCompletion to throw')
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(Error)
        expect(thrown).toMatchObject({
          name: 'MiniMaxClientError',
          message: 'Rate limit exceeded',
          code: 1002,
          status: 503,
          response: responseData,
          axiosCode: 'ERR_BAD_RESPONSE',
        })
        expect(thrown).toHaveProperty('cause', error)

        const serialized = JSON.parse(JSON.stringify(thrown)) as Record<string, unknown>

        expect(serialized).toEqual({
          name: 'MiniMaxClientError',
          message: 'Rate limit exceeded',
          code: 1002,
          status: 503,
          response: responseData,
          axiosCode: 'ERR_BAD_RESPONSE',
          cause: {
            name: 'AxiosError',
            message: 'Request failed',
            code: 'ERR_BAD_RESPONSE',
            status: 503,
          },
        })
      }
    })
  })

  describe('chatCompletionStream method', () => {
    it('should return stream chunks', async () => {
      // Create mock async iterable for stream
      const mockChunks = [
        Buffer.from('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'),
        Buffer.from('data: {"choices":[{"delta":{"content":" World"}}]}\n'),
        Buffer.from('data: [DONE]\n'),
      ]
      
      async function* mockStream() {
        for (const chunk of mockChunks) {
          yield chunk
        }
      }
      
      mockClient.post.mockResolvedValueOnce({
        data: mockStream(),
      })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.chatCompletionStream({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/text/chatcompletion_v2', {
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      }, {
        responseType: 'stream',
      })
      
      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({ data: '{"choices":[{"delta":{"content":"Hello"}}]}', isEnd: false })
      expect(result[1]).toEqual({ data: '{"choices":[{"delta":{"content":" World"}}]}', isEnd: false })
      expect(result[2]).toEqual({ data: '[DONE]', isEnd: true })
    })

    it('should handle stream error', async () => {
      const error = new AxiosError('Stream failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1002,
            status_msg: 'Rate limit exceeded',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.chatCompletionStream({ messages: [] })).rejects.toMatchObject({
        message: 'Rate limit exceeded',
        code: 1002,
      })
    })
  })

  describe('imageGeneration method', () => {
    it('should return successful response with image_urls', async () => {
      const mockResponse = {
        image_urls: [
          'https://example.com/image1.png',
          'https://example.com/image2.png',
        ],
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.imageGeneration({
        prompt: 'A beautiful sunset',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/image_generation', {
        prompt: 'A beautiful sunset',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1008,
            status_msg: 'Insufficient balance',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.imageGeneration({})).rejects.toMatchObject({
        message: 'Insufficient balance',
        code: 1008,
      })
    })
  })

  describe('videoGeneration method', () => {
    it('should return successful response with task_id', async () => {
      const mockResponse = {
        task_id: 'video-task-12345',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.videoGeneration({
        prompt: 'A cat playing piano',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/video_generation', {
        prompt: 'A cat playing piano',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 400,
        data: {
          error: {
            code: '400',
            message: 'Invalid prompt',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.videoGeneration({})).rejects.toMatchObject({
        message: 'Invalid prompt',
        code: 400,
      })
    })
  })

  describe('musicGeneration method', () => {
    it('should return successful response', async () => {
      const mockResponse = {
        audio_url: 'https://example.com/music.mp3',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.musicGeneration({
        prompt: 'Create a jazz song',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/music_generation', {
        prompt: 'Create a jazz song',
      }, {
        timeout: 300000, // 5 minutes
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Internal error',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.musicGeneration({})).rejects.toMatchObject({
        message: 'Internal error',
        code: 1001,
      })
    })
  })

  describe('lyricsGeneration method', () => {
    it('should call /v1/lyrics_generation with correct body', async () => {
      const mockResponse = {
        song_title: 'Test Song',
        style_tags: ['pop', 'emotional'],
        lyrics: '[Verse 1]\nTest lyrics...',
        base_resp: { status_code: 0, status_msg: 'success' }
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.lyricsGeneration({
        mode: 'write_full_song',
        prompt: 'A song about love'
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/lyrics_generation', {
        mode: 'write_full_song',
        prompt: 'A song about love'
      }, {
        timeout: 60000, // 1 minute for lyrics generation
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Internal error',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.lyricsGeneration({})).rejects.toMatchObject({
        message: 'Internal error',
        code: 1001,
      })
    })
  })

  describe('textToAudioSync method', () => {
    it('should return successful response', async () => {
      const mockResponse = {
        audio_url: 'https://example.com/audio.wav',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.textToAudioSync({
        text: 'Hello world',
        voice_id: 'male-qn-qingse',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/t2a_v2', {
        text: 'Hello world',
        voice_id: 'male-qn-qingse',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('textToAudioAsync method', () => {
    it('should return task_id for async generation', async () => {
      const mockResponse = {
        task_id: 'audio-task-12345',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.textToAudioAsync({
        text: 'Long text to convert',
        voice_id: 'female-shaonv',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/t2a_async_v2', {
        text: 'Long text to convert',
        voice_id: 'female-shaonv',
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('textToAudioAsyncStatus method', () => {
    it('should check task status', async () => {
      const mockResponse = {
        task_id: 'audio-task-12345',
        status: 'completed',
        audio_url: 'https://example.com/audio.wav',
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.textToAudioAsyncStatus('audio-task-12345')
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/t2a_async_v2?task_id=audio-task-12345')
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Task not found',
          },
        },
      }
      
      mockClient.get.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.textToAudioAsyncStatus('invalid-id')).rejects.toMatchObject({
        message: 'Task not found',
        code: 1001,
      })
    })
  })

  describe('videoGenerationStatus method', () => {
    it('should check video generation status', async () => {
      const mockResponse = {
        task_id: 'video-task-12345',
        status: 'completed',
        video_url: 'https://example.com/video.mp4',
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.videoGenerationStatus('video-task-12345')
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/query/video_generation?task_id=video-task-12345')
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 404,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Task not found',
          },
        },
      }
      
      mockClient.get.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.videoGenerationStatus('invalid-id')).rejects.toMatchObject({
        message: 'Task not found',
        code: 1001,
      })
    })
  })

  describe('getBalance method', () => {
    it('should return account balance', async () => {
      const mockResponse = {
        balance: 100.50,
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.getBalance()
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/user/balance')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('voiceList method', () => {
    it('should return voice list', async () => {
      const mockResponse = {
        voices: [
          { voice_id: 'male-qn-qingse', voice_name: '青涩青年音' },
          { voice_id: 'female-shaonv', voice_name: '少女音' },
        ],
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.voiceList('all')
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/get_voice', { voice_type: 'all' })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('fileList method', () => {
    it('should return file list', async () => {
      const mockResponse = {
        files: [
          { file_id: 1, file_name: 'test.mp3' },
        ],
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.fileList()
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/files/list')
      expect(result).toEqual(mockResponse)
    })

    it('should return file list with purpose filter', async () => {
      const mockResponse = {
        files: [
          { file_id: 1, file_name: 'test.mp3', purpose: 'voice_clone' },
        ],
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.fileList('voice_clone')
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/files/list?purpose=voice_clone')
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Request failed')
      error.response = {
        status: 500,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Server error',
          },
        },
      }
      
      mockClient.get.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.fileList()).rejects.toMatchObject({
        message: 'Server error',
        code: 1001,
      })
    })
  })

  describe('fileUpload method', () => {
    it('should upload file successfully', async () => {
      const mockResponse = {
        file_id: 123,
        file_name: 'uploaded.mp3',
      }
      
      const formData = new FormData()
      formData.append('file', new Blob(['audio data']), 'test.mp3')
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.fileUpload(formData)
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Upload failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Invalid file format',
          },
        },
      }
      
      const formData = new FormData()
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.fileUpload(formData)).rejects.toMatchObject({
        message: 'Invalid file format',
        code: 1001,
      })
    })
  })

  describe('fileRetrieve method', () => {
    it('should retrieve file successfully', async () => {
      const mockResponse = {
        file_id: 123,
        file_name: 'test.mp3',
        file_size: 1024,
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.fileRetrieve(123)
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/files/retrieve?file_id=123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('File not found')
      error.response = {
        status: 404,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'File not found',
          },
        },
      }
      
      mockClient.get.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.fileRetrieve(999)).rejects.toMatchObject({
        message: 'File not found',
        code: 1001,
      })
    })
  })

  describe('fileDelete method', () => {
    it('should delete file successfully', async () => {
      const mockResponse = {
        success: true,
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.fileDelete(123, 'voice_clone')
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/files/delete', { file_id: 123, purpose: 'voice_clone' })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Delete failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Cannot delete file',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.fileDelete(123, 'voice_clone')).rejects.toMatchObject({
        message: 'Cannot delete file',
        code: 1001,
      })
    })
  })

  describe('voiceDelete method', () => {
    it('should delete voice successfully', async () => {
      const mockResponse = {
        success: true,
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.voiceDelete('voice-123', 'clone')
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/delete_voice', { voice_id: 'voice-123', voice_type: 'clone' })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Delete failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Voice not found',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.voiceDelete('invalid-id', 'clone')).rejects.toMatchObject({
        message: 'Voice not found',
        code: 1001,
      })
    })
  })

  describe('voiceClone method', () => {
    it('should clone voice successfully', async () => {
      const mockResponse = {
        voice_id: 'clone-voice-123',
        voice_name: 'My Clone Voice',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.voiceClone({
        voice_id: 'source-voice',
        file_id: 123,
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/voice_clone', {
        voice_id: 'source-voice',
        file_id: 123,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Clone failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Invalid source voice',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.voiceClone({ voice_id: 'invalid' })).rejects.toMatchObject({
        message: 'Invalid source voice',
        code: 1001,
      })
    })
  })

  describe('voiceDesign method', () => {
    it('should design voice successfully', async () => {
      const mockResponse = {
        voice_id: 'designed-voice-123',
        voice_name: 'Custom Voice',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.voiceDesign({
        text: 'Create a warm female voice',
        voice_description: 'warm and friendly',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/voice_design', {
        text: 'Create a warm female voice',
        voice_description: 'warm and friendly',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Design failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Invalid voice description',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.voiceDesign({ text: '' })).rejects.toMatchObject({
        message: 'Invalid voice description',
        code: 1001,
      })
    })
  })

  describe('videoAgentGenerate method', () => {
    it('should generate video with agent successfully', async () => {
      const mockResponse = {
        task_id: 'video-agent-task-123',
      }
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.videoAgentGenerate({
        prompt: 'Create a video of a sunset',
      })
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/video_template_generation', {
        prompt: 'Create a video of a sunset',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Generation failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Invalid prompt',
          },
        },
      }
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.videoAgentGenerate({ prompt: '' })).rejects.toMatchObject({
        message: 'Invalid prompt',
        code: 1001,
      })
    })
  })

  describe('videoAgentStatus method', () => {
    it('should check video agent status successfully', async () => {
      const mockResponse = {
        task_id: 'video-agent-task-123',
        status: 'completed',
        video_url: 'https://example.com/video.mp4',
      }
      
      mockClient.get.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.videoAgentStatus('video-agent-task-123')
      
      expect(mockClient.get).toHaveBeenCalledWith('/v1/query/video_template_generation?task_id=video-agent-task-123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Status check failed')
      error.response = {
        status: 404,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Task not found',
          },
        },
      }
      
      mockClient.get.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.videoAgentStatus('invalid-id')).rejects.toMatchObject({
        message: 'Task not found',
        code: 1001,
      })
    })
  })

  describe('musicPreprocess method', () => {
    it('should preprocess music successfully', async () => {
      const mockResponse = {
        preprocess_id: 'preprocess-123',
      }
      
      const formData = new FormData()
      formData.append('audio_file', new Blob(['audio data']), 'song.mp3')
      
      mockClient.post.mockResolvedValueOnce({ data: mockResponse })
      
      const client = new MiniMaxClient('test-key')
      const result = await client.musicPreprocess(formData)
      
      expect(mockClient.post).toHaveBeenCalledWith('/v1/music_cover_preprocess', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle error', async () => {
      const error = new AxiosError('Preprocess failed')
      error.response = {
        status: 400,
        data: {
          base_resp: {
            status_code: 1001,
            status_msg: 'Invalid audio format',
          },
        },
      }
      
      const formData = new FormData()
      
      mockClient.post.mockRejectedValueOnce(error)
      
      const client = new MiniMaxClient('test-key')
      
      await expect(client.musicPreprocess(formData)).rejects.toMatchObject({
        message: 'Invalid audio format',
        code: 1001,
      })
    })
  })
})

describe('getMiniMaxClient', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetMiniMaxClient()
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
  })

  afterEach(() => {
    resetMiniMaxClient()
  })

  it('should create client with API key from environment', () => {
    process.env.MINIMAX_API_KEY = 'env-test-key'
    process.env.MINIMAX_REGION = 'international'
    
    const client = getMiniMaxClient()
    
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'https://api.minimax.io',
      headers: {
        'Authorization': 'Bearer env-test-key',
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    })
    
    delete process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_REGION
  })

  it('should use domestic region when MINIMAX_REGION=cn', () => {
    process.env.MINIMAX_API_KEY = 'env-test-key'
    process.env.MINIMAX_REGION = 'cn'
    
    const client = getMiniMaxClient()
    
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.minimaxi.com',
    }))
    
    delete process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_REGION
  })

  it('should return singleton instance', () => {
    process.env.MINIMAX_API_KEY = 'env-test-key'
    
    const client1 = getMiniMaxClient()
    const client2 = getMiniMaxClient()
    
    expect(axios.create).toHaveBeenCalledTimes(1)
    
    delete process.env.MINIMAX_API_KEY
  })
})

describe('createMiniMaxClientFromHeaders', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
  })

  it('should create client with international region by default', () => {
    const client = createMiniMaxClientFromHeaders('header-key')
    
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.minimax.io',
      headers: expect.objectContaining({
        'Authorization': 'Bearer header-key',
      }),
    }))
  })

  it('should create client with domestic region when region=cn', () => {
    const client = createMiniMaxClientFromHeaders('header-key', 'cn')
    
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.minimaxi.com',
    }))
  })

  it('should throw error when API key is empty', () => {
    expect(() => createMiniMaxClientFromHeaders('')).toThrow('API key is required')
  })

  it('should use international for non-cn region values', () => {
    const client = createMiniMaxClientFromHeaders('header-key', 'us')
    
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://api.minimax.io',
    }))
  })
})

describe('resetMiniMaxClient', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
    resetMiniMaxClient()
  })

  afterEach(() => {
    resetMiniMaxClient()
  })

  it('should reset singleton instance', () => {
    process.env.MINIMAX_API_KEY = 'env-test-key'
    
    const client1 = getMiniMaxClient()
    resetMiniMaxClient()
    const client2 = getMiniMaxClient()
    
    expect(axios.create).toHaveBeenCalledTimes(2)
    
    delete process.env.MINIMAX_API_KEY
  })
})

describe('getBalance method', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
    resetMiniMaxClient()
  })

  it('should return balance data on success', async () => {
    const mockResponse = { balance: 1000, quota: 5000 }
    mockClient.get.mockResolvedValueOnce({ data: mockResponse })

    const client = new MiniMaxClient('test-key')
    const result = await client.getBalance()

    expect(mockClient.get).toHaveBeenCalledWith('/v1/user/balance')
    expect(result).toEqual(mockResponse)
  })

  it('should throw on error', async () => {
    const error = new AxiosError('Service unavailable')
    error.response = {
      status: 503,
      data: {},
    }
    mockClient.get.mockRejectedValueOnce(error)

    const client = new MiniMaxClient('test-key')

    try {
      await client.getBalance()
      fail('Should have thrown')
    } catch (e: any) {
      expect(e.code).toBe(503)
    }
  })
})

describe('getCodingPlanRemains method', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
    resetMiniMaxClient()
  })

  it('should return remains data on success', async () => {
    const mockResponse = { remains: 100, total: 1000 }
    mockClient.get.mockResolvedValueOnce({ data: mockResponse })

    const client = new MiniMaxClient('test-key')
    const result = await client.getCodingPlanRemains('1001')

    expect(mockClient.get).toHaveBeenCalledWith(
      '/v1/api/openplatform/coding_plan/remains',
      expect.objectContaining({ headers: { productId: '1001' } })
    )
    expect(result).toEqual(mockResponse)
  })

  it('should use default productId', async () => {
    const mockResponse = { remains: 100 }
    mockClient.get.mockResolvedValueOnce({ data: mockResponse })

    const client = new MiniMaxClient('test-key')
    await client.getCodingPlanRemains()

    expect(mockClient.get).toHaveBeenCalledWith(
      '/v1/api/openplatform/coding_plan/remains',
      expect.objectContaining({ headers: { productId: '1001' } })
    )
  })

  it('should throw on error', async () => {
    const error = new AxiosError('API error')
    error.response = {
      status: 400,
      data: { base_resp: { status_code: 400, status_msg: 'Invalid request' } },
    }
    mockClient.get.mockRejectedValueOnce(error)

    const client = new MiniMaxClient('test-key')

    await expect(client.getCodingPlanRemains()).rejects.toMatchObject({
      message: 'Invalid request',
      code: 400,
    })
  })
})

describe('MockMiniMaxClient', () => {
  let mockClient: { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> }
  let mockAxiosCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      post: vi.fn(),
      get: vi.fn(),
    }
    mockAxiosCreate = vi.fn().mockReturnValue(mockClient as unknown as AxiosInstance)
    vi.spyOn(axios, 'create').mockImplementation(mockAxiosCreate)
    resetMiniMaxClient()
    delete process.env.MINIMAX_API_KEY
  })

  afterEach(() => {
    delete process.env.MINIMAX_API_KEY
    resetMiniMaxClient()
  })

  it('should return error when API key not configured for chatCompletion', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.chatCompletion({})).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for imageGeneration', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.imageGeneration({ prompt: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for videoGeneration', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.videoGeneration({ prompt: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for getBalance', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.getBalance()).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for musicGeneration', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.musicGeneration({ prompt: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for voiceList', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.voiceList()).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for fileUpload', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.fileUpload({ file: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for voiceDelete', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.voiceDelete({ voice_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for voiceClone', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.voiceClone({ voice_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for voiceDesign', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.voiceDesign({ text: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for fileList', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.fileList({})).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for fileRetrieve', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.fileRetrieve({ file_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for fileDelete', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.fileDelete({ file_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for getCodingPlanRemains', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.getCodingPlanRemains()).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for videoAgentGenerate', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.videoAgentGenerate({ prompt: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for videoAgentStatus', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.videoAgentStatus({ task_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for musicPreprocess', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.musicPreprocess({ prompt: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for videoGenerationStatus', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.videoGenerationStatus({ task_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for chatCompletionStream', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.chatCompletionStream({ messages: [] })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })

  it('should return error for textToAudioAsyncStatus', async () => {
    process.env.MINIMAX_API_KEY = ''
    resetMiniMaxClient()
    
    const client = getMiniMaxClient()

    await expect(client.textToAudioAsyncStatus({ task_id: 'test' })).rejects.toMatchObject({
      message: expect.stringContaining('MINIMAX_API_KEY not configured'),
      code: 503,
    })
  })
})
