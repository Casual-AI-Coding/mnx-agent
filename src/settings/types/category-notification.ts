export type NotificationEvent = 'start' | 'success' | 'failure' | 'retry'

export interface NotificationSettings {
  webhookEnabled: boolean
  webhookUrl: string
  webhookSecret: string
  emailEnabled: boolean
  desktopEnabled: boolean
  soundEnabled: boolean
  events: NotificationEvent[]
}
