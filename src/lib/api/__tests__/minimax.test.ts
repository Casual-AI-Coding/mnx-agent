import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createChatCompletion, streamChatCompletion } from '../text'
import { createSyncVoice, createAsyncVoice, getAsyncVoiceStatus } from '../voice'
import { generateImage } from '../image'
import { generateMusic } from '../music'
import { createVideo, getVideoStatus } from '../video'
import { listFiles, uploadFile, deleteFile, retrieveFile } from '../file'
import { getBaseUrl, getHeaders, getApiMode } from '../config'

vi.mock('../config', () => ({
  getBaseUrl: vi.fn(() => 'https://api.minimaxi.com'),
  getHeaders: vi.fn(() => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-key',
  })),
  getApiMode: vi.fn(() => 'direct'),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('Text API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createChatCompletion', () => {
    it('should return chat completion on success', async () => {
      const mockResponse = {
        id: 'chat-123',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finish_reason: 'stop',
        }],
        created: 1700000000,
        model: 'abab6.5s-chat',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await createChatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimaxi.com/v1/text/chatcompletion_v2',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('abab6.5s-chat'),
        })
      )
      expect(result.id).toBe('chat-123')
      expect(result.choices[0].message.content).toBe('Hello!')
    })

    it('should throw error on failed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'Rate limit exceeded' } }),
      })

      await expect(createChatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('Rate limit exceeded')
    })

    it('should use generic error message when status_msg is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      await expect(createChatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow('Failed to create chat completion')
    })

    it('should pass stream: false in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'test' }),
      })

      await createChatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.stream).toBe(false)
    })
  })

  describe('streamChatCompletion', () => {
    it('should yield stream chunks', async () => {
      const chunks = [
        { id: '1', choices: [{ delta: { content: 'Hel' } }] },
        { id: '1', choices: [{ delta: { content: 'lo' } }] },
        { id: '1', choices: [{ delta: { content: '!' } }] },
      ]

      const encoder = new TextEncoder()
      const streamData = chunks.map(c => `data: ${JSON.stringify(c)}`).join('\n') + '\ndata: [DONE]\n'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: encoder.encode(streamData) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      })

      const results = []
      for await (const chunk of streamChatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        results.push(chunk)
      }

      expect(results.length).toBe(3)
      expect(results[0].choices[0].delta.content).toBe('Hel')
    })

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'Model not found' } }),
      })

      await expect(async () => {
        for await (const _ of streamChatCompletion({
          model: 'unknown',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {}
      }).rejects.toThrow('Model not found')
    })

    it('should throw error when no reader available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      })

      await expect(async () => {
        for await (const _ of streamChatCompletion({
          model: 'abab6.5s-chat',
          messages: [{ role: 'user', content: 'Hi' }],
        })) {}
      }).rejects.toThrow('ERR_NO_READER')
    })

    it('should skip empty lines and non-data lines', async () => {
      const encoder = new TextEncoder()
      const validChunk = { id: 'test-id', choices: [{ delta: { content: 'test' }, finish_reason: null, index: 0 }], created: 1700000000, model: 'test', object: 'chat.completion.chunk' }
      const streamData = `data: ${JSON.stringify(validChunk)}\n\n  \nsomething else\n`

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: encoder.encode(streamData) })
              .mockResolvedValueOnce({ done: true, value: undefined }),
          }),
        },
      })

      const results = []
      for await (const chunk of streamChatCompletion({
        model: 'abab6.5s-chat',
        messages: [{ role: 'user', content: 'Hi' }],
      })) {
        results.push(chunk)
      }

      expect(results.length).toBe(1)
      expect(results[0].id).toBe('test-id')
    })
  })
})

describe('Voice API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSyncVoice', () => {
    it('should create synchronous voice in direct mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      const mockResponse = {
        data: 'hex_audio_data',
        trace_id: 'trace-123',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await createSyncVoice({
        text: 'Hello world',
        model: 'speech-02-hd',
        voice_setting: { voice_id: 'female-tianmei', speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.minimaxi.com/v1/t2a_v2',
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(result.data).toBe('hex_audio_data')
    })

    it('should use proxy endpoint in proxy mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')
      vi.mocked(getBaseUrl).mockReturnValue('/api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'audio' }),
      })

      await createSyncVoice({
        text: 'Hello',
        model: 'speech-02-hd',
        voice_setting: { voice_id: 'test', speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      })

      expect(fetch).toHaveBeenCalledWith(
        '/api/voice/sync',
        expect.any(Object)
      )
    })

    it('should throw error on voice creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'Voice not found' } }),
      })

      await expect(createSyncVoice({
        text: 'Test',
        model: 'speech-02-hd',
        voice_setting: { voice_id: 'invalid', speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      })).rejects.toThrow('Voice not found')
    })

    it('should output_format hex in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: '' }),
      })

      await createSyncVoice({
        text: 'Test',
        model: 'speech-02-hd',
        voice_setting: { voice_id: 'test', speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.output_format).toBe('hex')
    })
  })

  describe('createAsyncVoice', () => {
    it('should create async voice task', async () => {
      const mockResponse = {
        task_id: 'task-123',
        trace_id: 'trace-456',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await createAsyncVoice({
        text: 'Long text for async',
        model: 'speech-02-hd',
        voice_setting: { voice_id: 'female-tianmei', speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      })

      expect(result.task_id).toBe('task-123')
    })

    it('should use correct endpoint in proxy mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')
      vi.mocked(getBaseUrl).mockReturnValue('/api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'test' }),
      })

      await createAsyncVoice({
        text: 'Test',
        model: 'speech-02-hd',
        voice_setting: { voice_id: 'test', speed: 1, vol: 1, pitch: 0 },
        audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
      })

      expect(fetch).toHaveBeenCalledWith(
        '/api/voice/async',
        expect.any(Object)
      )
    })
  })

  describe('getAsyncVoiceStatus', () => {
    it('should query voice task status', async () => {
      const mockResponse = {
        task_id: 'task-123',
        trace_id: 'trace-456',
        status: 'completed' as const,
        file_id: 'file-123',
        results: {
          audio_url: 'https://audio.url/file.wav',
          audio_length: 30,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await getAsyncVoiceStatus('task-123')

      expect(result.task_id).toBe('task-123')
      expect(result.status).toBe('completed')
      expect(result.results?.audio_url).toBe('https://audio.url/file.wav')
    })

    it('should use query params in direct mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'test' }),
      })

      await getAsyncVoiceStatus('task-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('task_id=task-123'),
        expect.any(Object)
      )
    })

    it('should use path params in proxy mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')
      vi.mocked(getBaseUrl).mockReturnValue('/api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'test' }),
      })

      await getAsyncVoiceStatus('task-123')

      expect(fetch).toHaveBeenCalledWith(
        '/api/voice/async/task-123',
        expect.any(Object)
      )
    })
  })
})

describe('Image API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateImage', () => {
    it('should generate image and return URLs', async () => {
      const mockResponse = {
        data: {
          image_urls: ['https://image1.url', 'https://image2.url'],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await generateImage({
        model: 'image-01',
        prompt: 'A beautiful sunset',
      })

      expect(result.data.length).toBe(2)
      expect(result.data[0].url).toBe('https://image1.url')
    })

    it('should handle proxy mode response format', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')

      const mockResponse = {
        success: true,
        data: {
          data: {
            image_urls: ['https://proxy-image.url'],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await generateImage({
        model: 'image-01',
        prompt: 'Test',
      })

      expect(result.data[0].url).toBe('https://proxy-image.url')
    })

    it('should use correct endpoint in proxy mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')
      vi.mocked(getBaseUrl).mockReturnValue('/api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      })

      await generateImage({ model: 'image-01', prompt: 'Test' })

      expect(fetch).toHaveBeenCalledWith(
        '/api/image/generate',
        expect.any(Object)
      )
    })

    it('should throw error on generation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid prompt' }),
      })

      await expect(generateImage({
        model: 'image-01',
        prompt: '',
      })).rejects.toThrow('Invalid prompt')
    })

    it('should add response_format url to request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { image_urls: [] } }),
      })

      await generateImage({
        model: 'image-01',
        prompt: 'Test',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.response_format).toBe('url')
    })
  })
})

describe('Music API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateMusic', () => {
    it('should generate music and return audio data', async () => {
      const mockResponse = {
        trace_id: 'trace-123',
        data: {
          audio: 'https://music.url/file.mp3',
          duration: 30,
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await generateMusic({
        model: 'music-2.5',
        lyrics: '[Verse]\nA calm jazz piece\n[Chorus]\nMusic fills the air',
      })

      expect(result.data.audio).toBe('https://music.url/file.mp3')
    })

    it('should add output_format url to request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ trace_id: 'test', data: { audio: '', duration: 0 } }),
      })

      await generateMusic({
        model: 'music-2.5',
        lyrics: 'Test music',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.output_format).toBe('url')
    })

    it('should throw error on music generation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'Lyrics too long' } }),
      })

      await expect(generateMusic({
        model: 'music-2.5',
        lyrics: 'Test',
      })).rejects.toThrow('Lyrics too long')
    })
  })
})

describe('Video API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createVideo', () => {
    it('should create video task and return task_id', async () => {
      const mockResponse = {
        task_id: 'video-task-123',
        trace_id: 'trace-456',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await createVideo({
        model: 'video-01',
        prompt: 'A dancing cat',
      })

      expect(result.task_id).toBe('video-task-123')
    })

    it('should throw error on video creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'Video model unavailable' } }),
      })

      await expect(createVideo({
        model: 'video-01',
        prompt: 'Test',
      })).rejects.toThrow('Video model unavailable')
    })
  })

  describe('getVideoStatus', () => {
    it('should query video task status', async () => {
      const mockResponse = {
        task_id: 'video-task-123',
        status: 'Success',
        file: {
          download_url: 'https://video.url/file.mp4',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await getVideoStatus('video-task-123')

      expect(result.task_id).toBe('video-task-123')
      expect(result.status).toBe('Success')
    })

    it('should use query params for status check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task_id: 'test' }),
      })

      await getVideoStatus('video-task-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('task_id=video-task-123'),
        expect.any(Object)
      )
    })

    it('should throw error on status query failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'Failed to query video status' } }),
      })

      await expect(getVideoStatus('invalid-id')).rejects.toThrow('Failed to query video status')
    })
  })
})

describe('File API Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listFiles', () => {
    it('should list files in direct mode', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      const mockResponse = {
        files: [
          { file_id: 123, filename: 'test.txt', bytes: 1024, created_at: 1700000000 },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await listFiles()

      expect(result.files.length).toBe(1)
      expect(result.files[0].file_id).toBe('123')
      expect(result.files[0].file_name).toBe('test.txt')
    })

    it('should handle proxy mode response format', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')

      const mockResponse = {
        success: true,
        data: {
          files: [
            { file_id: 'f-1', file_name: 'proxy.txt', file_size: 2048, created_at: '2024-01-01' },
          ],
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await listFiles()

      expect(result.files[0].file_id).toBe('f-1')
    })

    it('should transform timestamp to ISO date', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ file_id: 1, filename: 't.txt', bytes: 1, created_at: 1700000000 }],
        }),
      })

      const result = await listFiles()

      expect(result.files[0].created_at).toBe('2023-11-14T22:13:20.000Z')
    })

    it('should pass purpose filter', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      })

      await listFiles('assistants')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('purpose=assistants'),
        expect.any(Object)
      )
    })

    it('should throw error on list failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Access denied' }),
      })

      await expect(listFiles()).rejects.toThrow('Access denied')
    })
  })

  describe('uploadFile', () => {
    it('should upload file and return file_id', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      const mockResponse = {
        file_id: 'uploaded-123',
        filename: 'test.txt',
        bytes: 1024,
        created_at: '2024-01-01',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const result = await uploadFile(file)

      expect(result.file_id).toBe('uploaded-123')
    })

    it('should handle proxy mode upload response', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')

      const mockResponse = {
        success: true,
        data: {
          file_id: 'proxy-123',
          file_name: 'uploaded.txt',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const file = new File(['content'], 'test.txt')
      const result = await uploadFile(file)

      expect(result.file_id).toBe('proxy-123')
    })

    it('should remove Content-Type header for FormData', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ file_id: 'test' }),
      })

      const file = new File(['content'], 'test.txt')
      await uploadFile(file)

      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Content-Type']).toBeUndefined()
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {},
      })

      await deleteFile('file-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('file-123'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should use proxy endpoint for delete', async () => {
      vi.mocked(getApiMode).mockReturnValue('proxy')
      vi.mocked(getBaseUrl).mockReturnValue('/api')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {},
      })

      await deleteFile('file-123')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/files/delete'),
        expect.any(Object)
      )
    })
  })

  describe('retrieveFile', () => {
    it('should retrieve file metadata', async () => {
      vi.mocked(getApiMode).mockReturnValue('direct')

      const mockResponse = {
        file_id: 'file-123',
        filename: 'retrieved.txt',
        bytes: 512,
        created_at: 1700000000,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await retrieveFile('file-123')

      expect(result.file_id).toBe('file-123')
    })

    it('should throw error on retrieve failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ base_resp: { status_msg: 'File not found' } }),
      })

      await expect(retrieveFile('invalid')).rejects.toThrow('File not found')
    })
  })
})