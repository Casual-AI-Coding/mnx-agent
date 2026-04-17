#!/usr/bin/env node

import { spawn, exec, execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, openSync } from 'fs'
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
    command: 'npx',
    args: ['vite', '--port', '4311', '--host', '0.0.0.0'],
    type: 'frontend',
  },
  prod: {
    name: 'Prod 前端',
    port: 4411,
    pidFile: join(PID_DIR, 'prod.pid'),
    logFile: join(LOG_DIR, 'prod.log'),
    command: 'npx',
    args: ['vite', 'preview', '--port', '4411', '--host', '0.0.0.0'],
    type: 'frontend',
    requiresBuild: true,
  },
  backend: {
    name: 'Backend',
    port: 4511,
    pidFile: join(PID_DIR, 'backend.pid'),
    logFile: join(LOG_DIR, 'backend.log'),
    command: 'npx',
    args: ['tsx', 'server/index.ts'],
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
  console.log(`[${timestamp}] [mnx-agent] ${msg}`)
}

function error(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  console.error(`[${timestamp}] [mnx-agent] ERROR: ${msg}`)
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

  const logFd = openSync(service.logFile, 'a')

  const child = spawn(service.command, service.args, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ['ignore', logFd, logFd],
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
  log(`Restarting ${target} environment...`)
  await stopAll()
  await new Promise(resolve => setTimeout(resolve, 1000))
  await startCommand(target)
  log(`${target} environment restarted`)
}

async function checkPortHealth(port) {
  try {
    execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}`, { timeout: 2000 })
    return true
  } catch {
    return false
  }
}

async function statusCommand() {
  log('Service status:')

  for (const [key, service] of Object.entries(SERVICES)) {
    const pid = getPid(key)
    const status = pid ? '运行中' : '停止'
    const pidInfo = pid ? ` (PID ${pid})` : ''
    const urlInfo = pid ? ` - http://localhost:${service.port}` : ''

    log(`${service.name}: ${status}${pidInfo}${urlInfo}`)

    if (pid) {
      const healthy = await checkPortHealth(service.port)
      log(`  Health check: ${healthy ? '✓ OK' : '✗ Not responding'}`)
    }
  }
}

async function logCommand(target) {
  const services = getTargetServices(target)
  const logFiles = services.map(key => SERVICES[key].logFile)

  // Check if any log files exist
  const existingLogs = logFiles.filter(f => existsSync(f))
  if (existingLogs.length === 0) {
    error('No log files found. Start services first.')
    return
  }

  log(`Tailing ${target} logs (Ctrl+C to exit)...`)
  log('─'.repeat(60))

  // Use tail -f on multiple files
  const tail = spawn('tail', ['-f', ...existingLogs], {
    stdio: 'inherit',
  })

  tail.on('error', (err) => {
    error(`Failed to tail logs: ${err.message}`)
  })

  process.on('SIGINT', () => {
    tail.kill()
    process.exit(0)
  })
}

async function syncCommand() {
  log('Building production frontend...')

  const build = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
  })

  await new Promise((resolve, reject) => {
    build.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Build failed with code ${code}`))
    })
    build.on('error', reject)
  })

  log('Build complete ✓')

  const targetDir = '/var/www/mnx-agent/assets'
  log(`Syncing to ${targetDir}...`)

  execSync(`rm -rf ${targetDir}/*`)
  execSync(`mkdir -p ${targetDir}`)
  execSync(`cp -r dist/assets/* ${targetDir}/`)
  execSync(`cp dist/index.html ${targetDir}/index.html`)

  log(`Synced ${targetDir} ✓`)
  log('─'.repeat(60))
  log('Production frontend ready at mnx.ogslp.top')
}

function printHelp() {
  console.log(`
Usage: mnx-agent <command> [target]

Commands:
${Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(20)} ${desc}`).join('\n')}

Targets:
  dev     Dev frontend (port 4311) + backend
  prod    Prod frontend (port 4411) + backend
  all     Dev + Prod + Backend (all services)

Examples:
  mnx-agent start dev      Start dev environment
  mnx-agent start prod     Build and start prod environment
  mnx-agent start all      Start both dev and prod
  mnx-agent stop           Stop all services
  mnx-agent status         Show all service status
  mnx-agent log dev        Tail dev + backend logs
  mnx-agent sync           Sync static files to nginx
`)
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'status'
  const target = args[1] || 'dev'

  // Validate command (extract base command from COMMANDS keys)
  const validCommands = Object.keys(COMMANDS).map(k => k.split(' ')[0])
  if (!validCommands.includes(command)) {
    error(`Unknown command: ${command}`)
    log(`Available commands: ${validCommands.join(', ')}`)
    process.exit(1)
  }

  // Validate target for commands that need it
  const needsTarget = ['start', 'restart', 'log']
  if (needsTarget.includes(command) && !['dev', 'prod', 'all'].includes(target)) {
    error(`Invalid target: ${target}`)
    log(`Valid targets: dev, prod, all`)
    process.exit(1)
  }

  try {
    switch (command) {
      case 'start':
        await startCommand(target)
        break
      case 'stop':
        await stopAll()
        break
      case 'restart':
        await restartCommand(target)
        break
      case 'status':
        await statusCommand()
        break
      case 'log':
        await logCommand(target)
        break
      case 'sync':
        await syncCommand()
        break
    }
  } catch (err) {
    error(`Command failed: ${err.message}`)
    process.exit(1)
  }
}

main()