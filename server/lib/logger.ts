import pino from 'pino'
import path from 'path'
import fs from 'fs'

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LoggerConfig {
  level: LogLevel
  prettyPrint: boolean
  fileOutput: boolean
  logDir: string
}

const defaultConfig: LoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  prettyPrint: process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production',
  fileOutput: process.env.LOG_FILE === 'true',
  logDir: process.env.LOG_DIR || 'logs',
}

function ensureLogDir(logDir: string): void {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
}

function createFileTransport(logDir: string) {
  ensureLogDir(logDir)
  
  return pino.transport({
    target: 'pino/file',
    options: {
      destination: path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`),
    },
  })
}

function createPrettyTransport() {
  return pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  })
}

function createLogger(config: LoggerConfig = defaultConfig): pino.Logger {
  const transports: ReturnType<typeof pino.transport>[] = []

  if (config.prettyPrint) {
    transports.push(createPrettyTransport())
  }

  if (config.fileOutput) {
    transports.push(createFileTransport(config.logDir))
  }

  if (transports.length === 0) {
    return pino({ level: config.level })
  }

  if (transports.length === 1) {
    return pino({ level: config.level }, transports[0])
  }

  return pino(
    { level: config.level },
    pino.multistream(transports.map(t => ({ stream: t })))
  )
}

let loggerInstance: pino.Logger | null = null

export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger()
  }
  return loggerInstance
}

export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return getLogger().child(context)
}

export default getLogger()

export type { LogLevel, LoggerConfig }