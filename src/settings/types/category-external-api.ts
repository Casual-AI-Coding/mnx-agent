export type ExternalProtocol = 'openai' | 'anthropic'

export interface ExternalEndpoint {
  id: string
  name: string
  url: string
  protocol: ExternalProtocol
  apiKey: string
}
