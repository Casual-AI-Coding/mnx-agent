#!/usr/bin/env node

import { spawn, exec, execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const RUN_DIR = join(ROOT_DIR, '.run')
const PID_DIR = join(RUN_DIR, 'pids')
const LOG_DIR = join(RUN_DIR, 'logs')

// Service definitions
const SERVICES = {
  dev: {
    name: 'Dev 前端',
    port: 4311,
    pidFile: join(PID_DIR, 'dev.pid'),
    logFile: join(LOG_DIR, 'dev.log'),
    command: 'vite',
    args: ['--port', '4311', '--host', '0.0.0.0'],
    type: 'frontend',
  },
  prod: {
    name: 'Prod 前端',
    port: 4411,
    pidFile: join(PID_DIR, 'prod.pid'),
    logFile: join(LOG_DIR, 'prod.log'),
    command: 'vite',
    args: ['preview', '--port', '4411', '--host', '0.0.0.0'],
    type: 'frontend',
    requiresBuild: true,
  },
  backend: {
    name: 'Backend',
    port: 4511,
    pidFile: join(PID_DIR, 'backend.pid'),
    logFile: join(LOG_DIR, 'backend.log'),
    command: 'tsx',
    args: ['server/index.ts'],
    type: 'backend',
  },
}

const COMMANDS = {
  'start <target>': 'Start services (dev/prod/all)',
  'stop': 'Stop all services',
  'restart <target>': 'Restart services (dev/prod/all)',
  'log <target>': 'Tail logs (dev/prod/all)',
  'status': 'Show all service status',
  'sync': 'Sync static files to nginx directory',
}

// Helper functions
function log(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  console.log(`[${timestamp}] [mnx-dev] ${msg}`)
}

function error(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  console.error(`[${timestamp}] [mnx-dev] ERROR: ${msg}`)
  process.exit(1)
}

function ensureRunDirs() {
  if (!existsSync(RUN_DIR)) mkdirSync(RUN_DIR, { recursive: true })
  if (!existsSync(PID_DIR)) mkdirSync(PID_DIR, { recursive: true })
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function waitForPort(port, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      execSync(`curl -s -o /dev/null http://localhost:${port}`, { timeout: 1000 })
      return true
    } catch {}
  }
  return false
}

function killProcess(pid, timeout = 5000) {
  try {
    process.kill(pid, 'SIGTERM')
  } catch {}

  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (!isProcessRunning(pid)) return true
  }

  try {
    process.kill(pid, 'SIGKILL')
  } catch {}

  return !isProcessRunning(pid)
}

function getPid(serviceId) {
  const pidFile = SERVICES[serviceId].pidFile
  if (!existsSync(pidFile)) return null
  const pid = parseInt(readFileSync(pidFile, 'utf-8').trim())
  if (!isProcessRunning(pid)) {
    unlinkSync(pidFile)
    return null
  }
  return pid
}

function setPid(serviceId, pid) {
  writeFileSync(SERVICES[serviceId].pidFile, pid.toString())
}

function clearPid(serviceId) {
  const pidFile = SERVICES[serviceId].pidFile
  if (existsSync(pidFile)) unlinkSync(pidFile)
}

async function startService(serviceKey, skipIfRunning = false) {
  const service = SERVICES[serviceKey]
  ensureRunDirs()

  // Check if already running
  const runningPid = getPid(serviceKey)
  if (runningPid) {
    if (skipIfRunning) {
      log(`${service.name} already running (PID ${runningPid}) - skipped`)
      return runningPid
    }
    // Stop existing process first
    await stopService(serviceKey)
  }

  // Build if required (prod frontend)
  if (service.requiresBuild) {
    log(`Building ${service.name}...`)
    try {
      execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' })
      log(`Build complete`)
    } catch (err) {
      error(`Build failed: ${err.message}`)
    }
  }

  // Start process
  log(`Starting ${service.name} on port ${service.port}...`)

  const { createWriteStream } = require('fs')
  const logStream = createWriteStream(service.logFile, { flags: 'a' })

  const child = spawn(service.command, service.args, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ['ignore', logStream, logStream],
  })

  child.unref()

  const pid = child.pid
  setPid(serviceKey, pid)

  // Wait for port to be ready
  if (!waitForPort(service.port, 10000)) {
    error(`${service.name} failed to start on port ${service.port}`)
  }

  log(`${service.name} started (PID ${pid}) - http://localhost:${service.port}`)
  return pid
}

async function stopService(serviceKey) {
  const service = SERVICES[serviceKey]

  const pid = getPid(serviceKey)
  if (!pid) {
    log(`${service.name} not running - skipped`)
    return
  }

  log(`Stopping ${service.name} (PID ${pid})...`)

  if (killProcess(pid)) {
    clearPid(serviceKey)
    log(`${service.name} stopped`)
  } else {
    error(`Failed to stop ${service.name}`)
  }
}

async function stopAll() {
  log('Stopping all services...')

  for (const key of ['dev', 'prod', 'backend']) {
    await stopService(key)
  }

  log('All services stopped')
}

function getTargetServices(target) {
  switch (target) {
    case 'dev':
      return ['dev', 'backend']
    case 'prod':
      return ['prod', 'backend']
    case 'all':
      return ['prod', 'dev', 'backend']  // prod first for stable startup
    default:
      error(`Unknown target: ${target}. Use dev, prod, or all.`)
  }
}

async function startCommand(target) {
  ensureRunDirs()

  const services = getTargetServices(target)
  log(`Starting ${target} environment...`)

  for (const serviceId of services) {
    await startService(serviceId, true)
  }

  log(`${target} environment ready`)
}

async function restartCommand(target) {
  // Placeholder - Task 7 will implement
  log(`restart(${target}) placeholder - Task 7`)
}

async function statusCommand() {
  // Placeholder - Task 8 will implement
  log('status() placeholder - Task 8')
}

async function logCommand(target) {
  // Placeholder - Task 9 will implement
  log(`log(${target}) placeholder - Task 9`)
}

async function syncCommand() {
  // Placeholder - Task 10 will implement
  log('sync() placeholder - Task 10')
}

function printHelp() {
  console.log(`
Usage: mnx-dev <command> [target]

Commands:
${Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(20)} ${desc}`).join('\n')}

Targets:
  dev     Dev frontend (port 4311) + backend
  prod    Prod frontend (port 4411) + backend
  all     Dev + Prod + Backend (all services)

Examples:
  mnx-dev start dev      Start dev environment
  mnx-dev start prod     Build and start prod environment
  mnx-dev start all      Start both dev and prod
  mnx-dev stop           Stop all services
  mnx-dev status         Show all service status
  mnx-dev log dev        Tail dev + backend logs
  mnx-dev sync           Sync static files to nginx
`)
}

async function main() {
  // Placeholder - Task 11 will implement
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp()
    process.exit(0)
  }
  
  log('main() placeholder - Task 11 will implement full command routing')
  printHelp()
}

main().catch(err => {
  error(err.message)
})