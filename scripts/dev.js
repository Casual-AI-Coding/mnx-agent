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

// Placeholder functions for remaining tasks (will be implemented in Task 4-11)
async function startService(serviceId, skipIfRunning = false) {
  // Placeholder - Task 4 will implement
  log(`startService(${serviceId}) placeholder - Task 4`)
}

async function stopService(serviceId) {
  // Placeholder - Task 5 will implement
  log(`stopService(${serviceId}) placeholder - Task 5`)
}

async function stopAll() {
  // Placeholder - Task 5 will implement
  log('stopAll() placeholder - Task 5')
}

async function startCommand(target) {
  // Placeholder - Task 6 will implement
  log(`start(${target}) placeholder - Task 6`)
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