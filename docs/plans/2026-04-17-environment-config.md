# Environment Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dev/prod frontend environment separation with Vite preview for prod and multi-service CLI management.

**Architecture:** Three independent services (dev frontend :4311, prod frontend :4411, backend :4511) managed by CLI with PID-based process tracking. Static files served by Nginx directly for performance.

**Tech Stack:** Node.js child_process, Vite CLI (dev + preview), PID files, shell commands

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `vite.config.ts` | Modify | Change dev server port from 4411 to 4311 |
| `scripts/dev.js` | Rewrite | Multi-service CLI with start/stop/restart/log/status/sync commands |
| `.gitignore` | Modify | Add `.run/` runtime directory |

---

## Task 1: Update Vite Dev Port

**Files:**
- Modify: `vite.config.ts:29-31`

- [ ] **Step 1: Change dev server port**

```typescript
// vite.config.ts:29-31
server: {
  port: 4311,  // Changed from 4411 to 4311 (dev frontend)
  host: '0.0.0.0',
  allowedHosts: true,
  proxy: {
    '/api': {
      target: 'http://localhost:4511',  // Keep backend port unchanged
      changeOrigin: true,
    },
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore(vite): change dev server port to 4311"
```

---

## Task 2: Add .run/ to Gitignore

**Files:**
- Modify: `.gitignore:66-70`

- [ ] **Step 1: Add .run/ directory**

```gitignore
# Dev CLI
.dev.pid
.dev.log
.run/         # Runtime directory for multi-service management
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .run/ to gitignore for runtime directory"
```

---

## Task 3: Rewrite scripts/dev.js - Core Structure

**Files:**
- Rewrite: `scripts/dev.js` (full file)

This task establishes the core structure with constants, helpers, and command routing.

- [ ] **Step 1: Write core structure and constants**

```javascript
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
```

- [ ] **Step 2: Add helper functions**

```javascript
function log(msg) {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  console.log(`[${timestamp}] [mnx-dev] ${msg}`)
}

function error(msg) {
  console.error(`[mnx-dev] ERROR: ${msg}`)
  process.exit(1)
}

function ensureDirectories() {
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

function getRunningPid(pidFile) {
  if (!existsSync(pidFile)) return null
  const pid = parseInt(readFileSync(pidFile, 'utf-8').trim())
  if (isProcessRunning(pid)) return pid
  unlinkSync(pidFile)
  return null
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

function getTargetServices(target) {
  switch (target) {
    case 'dev':
      return ['dev', 'backend']
    case 'prod':
      return ['prod', 'backend']
    case 'all':
      return ['prod', 'dev', 'backend']
    default:
      error(`Unknown target: ${target}. Use dev, prod, or all.`)
  }
}
```

- [ ] **Step 3: Add printHelp function**

```javascript
function printHelp() {
  console.log(`
Usage: node scripts/dev.js <command> [target]

Commands:
${Object.entries(COMMANDS).map(([cmd, desc]) => `  ${cmd.padEnd(25)} ${desc}`).join('\n')}

Targets:
  dev       Dev frontend (4311) + backend
  prod      Prod frontend (4411) + backend (builds first)
  all       All three services

Examples:
  node scripts/dev.js start dev    Start dev environment
  node scripts/dev.js start prod   Build + start prod environment
  node scripts/dev.js start all    Run dev + prod simultaneously
  node scripts/dev.js log all      Tail all logs
  node scripts/dev.js sync         Sync static files only
`)
}
```

- [ ] **Step 4: Commit structure**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): add core structure and constants"
```

---

## Task 4: Implement startService Function

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write startService function**

```javascript
async function startService(serviceKey) {
  const service = SERVICES[serviceKey]
  
  // Check if already running
  const runningPid = getRunningPid(service.pidFile)
  if (runningPid) {
    log(`${service.name} already running (PID ${runningPid}) - skipped`)
    return runningPid
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
  
  const logStream = existsSync(service.logFile) 
    ? require('fs').createWriteStream(service.logFile, { flags: 'a' })
    : require('fs').createWriteStream(service.logFile)
  
  const child = spawn(service.command, service.args, {
    cwd: ROOT_DIR,
    detached: true,
    stdio: ['ignore', logStream, logStream],
  })
  
  child.unref()
  
  const pid = child.pid
  writeFileSync(service.pidFile, pid.toString())
  
  // Wait for port to be ready
  if (!waitForPort(service.port, 10000)) {
    error(`${service.name} failed to start on port ${service.port}`)
  }
  
  log(`${service.name} started (PID ${pid}) - http://localhost:${service.port}`)
  return pid
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement startService function"
```

---

## Task 5: Implement stopService and stopAll Functions

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write stopService and stopAll functions**

```javascript
async function stopService(serviceKey) {
  const service = SERVICES[serviceKey]
  
  const pid = getRunningPid(service.pidFile)
  if (!pid) {
    log(`${service.name} not running - skipped`)
    return
  }
  
  log(`Stopping ${service.name} (PID ${pid})...`)
  
  if (killProcess(pid)) {
    if (existsSync(service.pidFile)) unlinkSync(service.pidFile)
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement stopService and stopAll functions"
```

---

## Task 6: Implement start Command

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write start command implementation**

```javascript
async function start(target) {
  ensureDirectories()
  
  const services = getTargetServices(target)
  
  log(`Starting ${target} environment...`)
  
  // Special order for 'all': prod first, then dev, then backend
  const order = target === 'all' 
    ? ['prod', 'dev', 'backend'] 
    : services
  
  for (const key of order) {
    await startService(key)
  }
  
  log(`${target} environment ready`)
  
  // Print access info
  if (target === 'dev') {
    log('Dev frontend: http://localhost:4311')
    log('Backend API:  http://localhost:4511')
  } else if (target === 'prod') {
    log('Prod frontend: http://localhost:4411 (内网验证)')
    log('公网访问:      http://mnx.ogslp.top')
    log('Backend API:  http://localhost:4511')
  } else if (target === 'all') {
    log('Dev frontend:  http://localhost:4311')
    log('Prod frontend: http://localhost:4411 (内网验证)')
    log('公网访问:      http://mnx.ogslp.top')
    log('Backend API:  http://localhost:4511')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement start command with target support"
```

---

## Task 7: Implement restart Command

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write restart command implementation**

```javascript
async function restart(target) {
  log(`Restarting ${target} environment...`)
  
  // Stop services in reverse order
  const services = getTargetServices(target)
  const stopOrder = target === 'all' 
    ? ['backend', 'dev', 'prod'] 
    : [...services].reverse()
  
  for (const key of stopOrder) {
    await stopService(key)
  }
  
  // Wait for ports to be released
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Start in proper order
  await start(target)
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement restart command"
```

---

## Task 8: Implement status Command

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write status command implementation**

```javascript
async function status() {
  log('Service Status:')
  log('─'.repeat(60))
  
  for (const [key, service] of Object.entries(SERVICES)) {
    const pid = getRunningPid(service.pidFile)
    const status = pid ? '运行中' : '已停止'
    const pidInfo = pid ? `PID ${pid}` : ''
    const url = `http://localhost:${service.port}`
    
    // Health check
    let health = '✗'
    if (pid) {
      try {
        execSync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, { timeout: 2000 })
        health = '✓'
      } catch {
        health = '?'
      }
    }
    
    log(`${service.name.padEnd(15)} ${status.padEnd(10)} ${pidInfo.padEnd(15)} ${url} ${health}`)
  }
  
  log('─'.repeat(60))
  
  // Summary
  const runningCount = Object.values(SERVICES).filter(s => getRunningPid(s.pidFile)).length
  log(`Total: ${runningCount}/${Object.keys(SERVICES).length} services running`)
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement status command with health checks"
```

---

## Task 9: Implement log Command

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write log command implementation**

```javascript
async function tailLog(target) {
  const services = getTargetServices(target)
  const logFiles = services.map(key => SERVICES[key].logFile)
  
  // Check if any log file exists
  const existingLogs = logFiles.filter(f => existsSync(f))
  if (existingLogs.length === 0) {
    log('No log files found. Start services first.')
    return
  }
  
  log(`Tailing logs for ${target} (Ctrl+C to exit)...`)
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
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement log command for multi-file tailing"
```

---

## Task 10: Implement sync Command

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write sync command implementation**

```javascript
async function sync() {
  log('Syncing static files to nginx directory...')
  
  const NGINX_DIR = '/var/www/mnx-agent/assets'
  
  // Build first
  log('Building frontend...')
  try {
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' })
  } catch (err) {
    error(`Build failed: ${err.message}`)
  }
  
  // Sync to nginx directory
  log('Copying files to nginx directory...')
  try {
    execSync(`rm -rf ${NGINX_DIR}/*`, { stdio: 'inherit' })
    execSync(`cp -r ${join(ROOT_DIR, 'dist')}/* ${NGINX_DIR}/`, { stdio: 'inherit' })
    log('Static files synced successfully')
  } catch (err) {
    error(`Sync failed: ${err.message}. Check permissions on ${NGINX_DIR}`)
  }
  
  // Verify
  const files = execSync(`ls -la ${NGINX_DIR}`, { encoding: 'utf-8' })
  log(`Files synced:\n${files}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): implement sync command for static file deployment"
```

---

## Task 11: Implement Main Entry Point

**Files:**
- Continue: `scripts/dev.js`

- [ ] **Step 1: Write main function and entry point**

```javascript
async function main() {
  const [,, command, target] = process.argv
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp()
    process.exit(0)
  }
  
  switch (command) {
    case 'start':
      if (!target) error('Missing target. Use: start dev, start prod, or start all')
      await start(target)
      break
    case 'stop':
      await stopAll()
      break
    case 'restart':
      if (!target) error('Missing target. Use: restart dev, restart prod, or restart all')
      await restart(target)
      break
    case 'log':
      if (!target) error('Missing target. Use: log dev, log prod, or log all')
      await tailLog(target)
      break
    case 'status':
      await status()
      break
    case 'sync':
      await sync()
      break
    default:
      error(`Unknown command: ${command}. Use "help" for usage.`)
  }
}

main().catch(err => {
  error(err.message)
})
```

- [ ] **Step 2: Commit**

```bash
git add scripts/dev.js
git commit -m "feat(dev-cli): complete main entry point and command routing"
```

---

## Task 12: Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Test dev environment**

```bash
node scripts/dev.js start dev
node scripts/dev.js status
curl http://localhost:4311  # Should return HTML
curl http://localhost:4511/api/health  # Should return health status
node scripts/dev.js stop
```

- [ ] **Step 2: Test prod environment**

```bash
node scripts/dev.js start prod
node scripts/dev.js status
curl http://localhost:4411  # Should return HTML
node scripts/dev.js stop
```

- [ ] **Step 3: Test all environments**

```bash
node scripts/dev.js start all
node scripts/dev.js status
curl http://localhost:4311  # Dev frontend
curl http://localhost:4411  # Prod frontend
node scripts/dev.js stop
```

- [ ] **Step 4: Test sync command**

```bash
node scripts/dev.js sync
ls -la /var/www/mnx-agent/assets/
```

---

## Self-Review Checklist

| Check | Result |
|-------|--------|
| **Spec coverage** | ✅ All spec requirements covered: dev/prod ports, CLI commands, static sync, PID management |
| **Placeholder scan** | ✅ No TBD/TODO, all code complete |
| **Type consistency** | ✅ Function names consistent throughout: startService, stopService, getTargetServices, etc. |

---

*Plan created: 2026-04-17*