#!/usr/bin/env node

import { spawn, exec, fork } from 'child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, createWriteStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const PID_FILE = join(ROOT_DIR, '.dev.pid')
const LOG_FILE = join(ROOT_DIR, '.dev.log')

const COMMANDS = {
  start: 'Start development servers (frontend + backend)',
  stop: 'Stop all development servers',
  status: 'Show status of running servers',
  log: 'Tail logs from all servers',
  restart: 'Restart all servers',
}

function log(msg) {
  console.log(`[dev] ${msg}`)
}

function error(msg) {
  console.error(`[dev] ERROR: ${msg}`)
  process.exit(1)
}

function getTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

async function start() {
  if (existsSync(PID_FILE)) {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim())
    if (isProcessRunning(pid)) {
      log('Servers already running. Use "dev stop" to stop first.')
      return
    } else {
      unlinkSync(PID_FILE)
    }
  }

  log('Starting development servers...')

  const cmd = `nohup npm run dev:full > ${LOG_FILE} 2>&1 &`
  
  exec(cmd, { cwd: ROOT_DIR }, (err, stdout, stderr) => {
    if (err) {
      error(`Failed to start: ${err.message}`)
      return
    }
  })

  await new Promise(resolve => setTimeout(resolve, 2000))

  const psCmd = `pgrep -f "concurrently|npm:dev|npm:server" | head -1`
  exec(psCmd, (err, stdout) => {
    if (!err && stdout.trim()) {
      const mainPid = parseInt(stdout.trim())
      writeFileSync(PID_FILE, mainPid.toString())
      log(`Started with PID ${mainPid}`)
    } else {
      log('Servers may have started')
    }
  })

  log('Frontend: http://localhost:4411')
  log('Backend:  http://localhost:4511')
}

async function stop() {
  if (!existsSync(PID_FILE)) {
    log('No servers running')
    return
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim())

  if (!isProcessRunning(pid)) {
    log('Servers not running (stale PID file)')
    unlinkSync(PID_FILE)
    return
  }

  log(`Stopping servers (PID ${pid})...`)

  exec(`pkill -f "concurrently|npm:dev|npm:server"`, (err) => {
    if (err) {
      log('Servers stopped')
    }
  })

  await new Promise(resolve => setTimeout(resolve, 1000))

  if (existsSync(PID_FILE)) {
    unlinkSync(PID_FILE)
  }
  log('Servers stopped')
}

async function status() {
  if (!existsSync(PID_FILE)) {
    log('Status: Not running')
    return
  }

  const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim())

  if (!isProcessRunning(pid)) {
    log('Status: Not running (stale PID file)')
    unlinkSync(PID_FILE)
    return
  }

  log(`Status: Running (PID ${pid})`)
  log('Frontend: http://localhost:4411')
  log('Backend:  http://localhost:4511')

  exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:4411', (err, stdout) => {
    if (!err && stdout === '200') {
      log('Frontend health: OK')
    } else {
      log('Frontend health: Not responding')
    }
  })

  exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:4511/api/health', (err, stdout) => {
    if (!err && stdout === '200') {
      log('Backend health: OK')
    } else {
      log('Backend health: Not responding')
    }
  })
}

async function tailLog() {
  if (!existsSync(LOG_FILE)) {
    log('No log file found. Start servers first.')
    return
  }

  log('Tailing logs (Ctrl+C to exit)...')
  log('─'.repeat(60))

  const tail = spawn('tail', ['-f', LOG_FILE], {
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

async function restart() {
  log('Restarting servers...')
  await stop()
  await new Promise(resolve => setTimeout(resolve, 1000))
  await start()
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function printHelp() {
  console.log(`
Usage: dev <command>

Commands:
${Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(10)} ${desc}`).join('\n')}

Examples:
  dev start     Start servers in background
  dev log       Tail logs
  dev stop      Stop servers
  dev status    Check if running
`)
}

async function main() {
  const [,, command] = process.argv

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    process.exit(0)
  }

  switch (command) {
    case 'start':
      await start()
      break
    case 'stop':
      await stop()
      break
    case 'status':
      await status()
      break
    case 'log':
      await tailLog()
      break
    case 'restart':
      await restart()
      break
    default:
      error(`Unknown command: ${command}. Use "dev help" for usage.`)
  }
}

main().catch(err => {
  error(err.message)
})