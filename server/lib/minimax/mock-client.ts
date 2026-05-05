import { MiniMaxClient } from './client.js'
import type { MiniMaxError } from './types.js'

export class MockMiniMaxClient extends MiniMaxClient {
  constructor() {
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
  async lyricsGeneration(): Promise<unknown> { return this.createErrorResponse('lyricsGeneration') }
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
