# WebSocket Hook 合并实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三个重复的 Cron WebSocket 订阅 hook 收敛到一个可复用的 store 生命周期 hook，保持现有页面与 store API 行为不变。

**Architecture:** 第一批只做行为保持型重构：新增一个小型 hook 负责“认证水合完成且已登录时订阅，卸载或依赖变化时取消订阅”，三个现有公开 hook 继续保留名称并委托给新 hook。这样既消除重复，又不影响 `CronManagement` 和 `sharedImports` 的导入契约。

**Tech Stack:** React 18、TypeScript strict、Zustand、Vitest、`@testing-library/react`。

---

## 场景

### 场景 1：已水合且已登录时订阅

- Given：`useAuthStore()` 返回 `isHydrated: true` 与 `isAuthenticated: true`。
- When：渲染任一 WebSocket hook。
- Then：对应 store 的 `subscribeToWebSocket()` 被调用 1 次，`unsubscribeFromWebSocket()` 尚未调用。
- 验证文件：`src/hooks/useStoreWebSocketSubscription.test.ts`。

### 场景 2：未水合或未登录时不订阅

- Given：`useAuthStore()` 返回 `isHydrated: false` 或 `isAuthenticated: false`。
- When：渲染通用 WebSocket 订阅 hook。
- Then：`subscribeToWebSocket()` 与 `unsubscribeFromWebSocket()` 都不调用。
- 验证文件：`src/hooks/useStoreWebSocketSubscription.test.ts`。

### 场景 3：卸载时取消订阅

- Given：已水合且已登录，hook 已触发订阅。
- When：React hook unmount。
- Then：对应 store 的 `unsubscribeFromWebSocket()` 被调用 1 次。
- 验证文件：`src/hooks/useStoreWebSocketSubscription.test.ts`。

### 场景 4：原三个公开 hook 保持兼容

- Given：三个旧 hook 名称仍从原路径导出。
- When：分别渲染 `useCronJobsWebSocket`、`useTaskQueueWebSocket`、`useExecutionLogsWebSocket`。
- Then：分别调用对应 store 的订阅函数，调用契约与重构前一致。
- 验证文件：`src/hooks/useCronWebSocketHooks.test.ts`。

---

## 文件结构

- Create: `src/hooks/useStoreWebSocketSubscription.ts`
  - 只负责认证状态门控与订阅/取消订阅生命周期。
  - 不感知 Cron、TaskQueue、ExecutionLogs 的领域细节。
- Create: `src/hooks/useStoreWebSocketSubscription.test.ts`
  - 覆盖通用 hook 的订阅、不订阅、取消订阅行为。
- Create: `src/hooks/useCronWebSocketHooks.test.ts`
  - 覆盖三个旧公开 hook 仍映射到正确 store。
- Modify: `src/hooks/useCronJobsWebSocket.ts`
  - 保留 `useCronJobsWebSocket()` 名称，委托新 hook。
- Modify: `src/hooks/useTaskQueueWebSocket.ts`
  - 保留 `useTaskQueueWebSocket()` 名称，委托新 hook。
- Modify: `src/hooks/useExecutionLogsWebSocket.ts`
  - 保留 `useExecutionLogsWebSocket()` 名称，委托新 hook。
- Modify: `src/hooks/index.ts`
  - 导出新 hook 的类型/函数，保留原 `createWebSocketHook` 导出不变。

---

## Task 1: 编写通用订阅 hook 的失败测试

**Files:**
- Create: `src/hooks/useStoreWebSocketSubscription.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'

const subscribeToWebSocket = vi.fn()
const unsubscribeFromWebSocket = vi.fn()

const authenticatedState = {
  isHydrated: true,
  isAuthenticated: true,
} as const

const unauthenticatedState = {
  isHydrated: true,
  isAuthenticated: false,
} as const

function setAuthState(state: typeof authenticatedState | typeof unauthenticatedState): void {
  vi.mocked(useAuthStore).mockReturnValue(state)
}

beforeEach(() => {
  vi.clearAllMocks()
  setAuthState(authenticatedState)
})

describe('useStoreWebSocketSubscription', () => {
  it('subscribes when auth state is hydrated and authenticated', () => {
    renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).toHaveBeenCalledTimes(1)
    expect(unsubscribeFromWebSocket).not.toHaveBeenCalled()
  })

  it('does not subscribe when auth state is not authenticated', () => {
    setAuthState(unauthenticatedState)

    renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    expect(subscribeToWebSocket).not.toHaveBeenCalled()
    expect(unsubscribeFromWebSocket).not.toHaveBeenCalled()
  })

  it('unsubscribes when the hook unmounts after subscribing', () => {
    const { unmount } = renderHook(() =>
      useStoreWebSocketSubscription({
        subscribeToWebSocket,
        unsubscribeFromWebSocket,
      }),
    )

    unmount()

    expect(unsubscribeFromWebSocket).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test -- src/hooks/useStoreWebSocketSubscription.test.ts`

Expected: FAIL，原因是 `src/hooks/useStoreWebSocketSubscription.ts` 尚不存在。

- [ ] **Step 3: 提交测试红灯证据到记录**

将失败命令和核心失败信息记录在当前会话，不提交红灯代码。

---

## Task 2: 实现通用订阅 hook 并验证绿灯

**Files:**
- Create: `src/hooks/useStoreWebSocketSubscription.ts`
- Test: `src/hooks/useStoreWebSocketSubscription.test.ts`

- [ ] **Step 1: 写最小实现**

```typescript
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'

export interface StoreWebSocketSubscription {
  readonly subscribeToWebSocket: () => void
  readonly unsubscribeFromWebSocket: () => void
}

export function useStoreWebSocketSubscription(subscription: StoreWebSocketSubscription): void {
  const { isHydrated, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) return

    subscription.subscribeToWebSocket()
    return () => subscription.unsubscribeFromWebSocket()
  }, [isHydrated, isAuthenticated, subscription])
}
```

- [ ] **Step 2: 运行聚焦测试确认通过**

Run: `npm run test -- src/hooks/useStoreWebSocketSubscription.test.ts`

Expected: PASS。

- [ ] **Step 3: 运行 diagnostics**

Run: `lsp_diagnostics src/hooks/useStoreWebSocketSubscription.ts` 与 `lsp_diagnostics src/hooks/useStoreWebSocketSubscription.test.ts`

Expected: 无新增错误。

---

## Task 3: 编写旧公开 hook 兼容测试

**Files:**
- Create: `src/hooks/useCronWebSocketHooks.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCronJobsWebSocket } from './useCronJobsWebSocket'
import { useExecutionLogsWebSocket } from './useExecutionLogsWebSocket'
import { useTaskQueueWebSocket } from './useTaskQueueWebSocket'

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/cronJobs', () => ({
  useCronJobsStore: vi.fn(),
}))

vi.mock('@/stores/taskQueue', () => ({
  useTaskQueueStore: vi.fn(),
}))

vi.mock('@/stores/executionLogs', () => ({
  useExecutionLogsStore: vi.fn(),
}))

import { useAuthStore } from '@/stores/auth'
import { useCronJobsStore } from '@/stores/cronJobs'
import { useExecutionLogsStore } from '@/stores/executionLogs'
import { useTaskQueueStore } from '@/stores/taskQueue'

const cronSubscribe = vi.fn()
const cronUnsubscribe = vi.fn()
const taskSubscribe = vi.fn()
const taskUnsubscribe = vi.fn()
const logsSubscribe = vi.fn()
const logsUnsubscribe = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuthStore).mockReturnValue({ isHydrated: true, isAuthenticated: true })
  vi.mocked(useCronJobsStore).mockReturnValue({
    subscribeToWebSocket: cronSubscribe,
    unsubscribeFromWebSocket: cronUnsubscribe,
  })
  vi.mocked(useTaskQueueStore).mockReturnValue({
    subscribeToWebSocket: taskSubscribe,
    unsubscribeFromWebSocket: taskUnsubscribe,
  })
  vi.mocked(useExecutionLogsStore).mockReturnValue({
    subscribeToWebSocket: logsSubscribe,
    unsubscribeFromWebSocket: logsUnsubscribe,
  })
})

describe('Cron WebSocket hooks', () => {
  it('uses the cron jobs store subscription', () => {
    renderHook(() => useCronJobsWebSocket())

    expect(cronSubscribe).toHaveBeenCalledTimes(1)
    expect(taskSubscribe).not.toHaveBeenCalled()
    expect(logsSubscribe).not.toHaveBeenCalled()
  })

  it('uses the task queue store subscription', () => {
    renderHook(() => useTaskQueueWebSocket())

    expect(taskSubscribe).toHaveBeenCalledTimes(1)
    expect(cronSubscribe).not.toHaveBeenCalled()
    expect(logsSubscribe).not.toHaveBeenCalled()
  })

  it('uses the execution logs store subscription', () => {
    renderHook(() => useExecutionLogsWebSocket())

    expect(logsSubscribe).toHaveBeenCalledTimes(1)
    expect(cronSubscribe).not.toHaveBeenCalled()
    expect(taskSubscribe).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 运行测试确认当前兼容行为**

Run: `npm run test -- src/hooks/useCronWebSocketHooks.test.ts`

Expected: PASS。该测试是重构保护网，锁定旧 hook 对应 store 的映射。

---

## Task 4: 重构三个公开 hook 委托通用 hook

**Files:**
- Modify: `src/hooks/useCronJobsWebSocket.ts`
- Modify: `src/hooks/useTaskQueueWebSocket.ts`
- Modify: `src/hooks/useExecutionLogsWebSocket.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: 修改 `useCronJobsWebSocket.ts`**

```typescript
import { useCronJobsStore } from '@/stores/cronJobs'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

export function useCronJobsWebSocket(): void {
  const subscribeToWebSocket = useCronJobsStore((state) => state.subscribeToWebSocket)
  const unsubscribeFromWebSocket = useCronJobsStore((state) => state.unsubscribeFromWebSocket)

  useStoreWebSocketSubscription({ subscribeToWebSocket, unsubscribeFromWebSocket })
}
```

- [ ] **Step 2: 修改 `useTaskQueueWebSocket.ts`**

```typescript
import { useTaskQueueStore } from '@/stores/taskQueue'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

export function useTaskQueueWebSocket(): void {
  const subscribeToWebSocket = useTaskQueueStore((state) => state.subscribeToWebSocket)
  const unsubscribeFromWebSocket = useTaskQueueStore((state) => state.unsubscribeFromWebSocket)

  useStoreWebSocketSubscription({ subscribeToWebSocket, unsubscribeFromWebSocket })
}
```

- [ ] **Step 3: 修改 `useExecutionLogsWebSocket.ts`**

```typescript
import { useExecutionLogsStore } from '@/stores/executionLogs'
import { useStoreWebSocketSubscription } from './useStoreWebSocketSubscription'

export function useExecutionLogsWebSocket(): void {
  const subscribeToWebSocket = useExecutionLogsStore((state) => state.subscribeToWebSocket)
  const unsubscribeFromWebSocket = useExecutionLogsStore((state) => state.unsubscribeFromWebSocket)

  useStoreWebSocketSubscription({ subscribeToWebSocket, unsubscribeFromWebSocket })
}
```

- [ ] **Step 4: 修改 `src/hooks/index.ts` 导出新 hook**

```typescript
export { useStoreWebSocketSubscription, type StoreWebSocketSubscription } from './useStoreWebSocketSubscription'
```

- [ ] **Step 5: 运行聚焦测试**

Run: `npm run test -- src/hooks/useStoreWebSocketSubscription.test.ts src/hooks/useCronWebSocketHooks.test.ts`

Expected: PASS。

---

## Task 5: 验证与提交

**Files:**
- All changed files in this plan.

- [ ] **Step 1: 运行 LSP diagnostics**

Run diagnostics on:
- `src/hooks/useStoreWebSocketSubscription.ts`
- `src/hooks/useStoreWebSocketSubscription.test.ts`
- `src/hooks/useCronWebSocketHooks.test.ts`
- `src/hooks/useCronJobsWebSocket.ts`
- `src/hooks/useTaskQueueWebSocket.ts`
- `src/hooks/useExecutionLogsWebSocket.ts`
- `src/hooks/index.ts`

Expected: 无新增错误。

- [ ] **Step 2: 运行测试**

Run: `npm run test -- src/hooks/useStoreWebSocketSubscription.test.ts src/hooks/useCronWebSocketHooks.test.ts`

Expected: PASS。

- [ ] **Step 3: 运行构建**

Run: `npm run build`

Expected: exit code 0。

- [ ] **Step 4: 检查 git 状态与差异**

Run:

```bash
git status --short
git diff -- docs/superpowers/plans/2026-07-03-websocket-hook-consolidation.md src/hooks/useStoreWebSocketSubscription.ts src/hooks/useStoreWebSocketSubscription.test.ts src/hooks/useCronWebSocketHooks.test.ts src/hooks/useCronJobsWebSocket.ts src/hooks/useTaskQueueWebSocket.ts src/hooks/useExecutionLogsWebSocket.ts src/hooks/index.ts
git log --oneline -10
```

- [ ] **Step 5: 提交**

```bash
git add docs/superpowers/plans/2026-07-03-websocket-hook-consolidation.md src/hooks/useStoreWebSocketSubscription.ts src/hooks/useStoreWebSocketSubscription.test.ts src/hooks/useCronWebSocketHooks.test.ts src/hooks/useCronJobsWebSocket.ts src/hooks/useTaskQueueWebSocket.ts src/hooks/useExecutionLogsWebSocket.ts src/hooks/index.ts
git commit -m "refactor(cron): 收敛 WebSocket hook 订阅逻辑"
```

---

## 自检

- 方案覆盖：本计划只覆盖第一批低风险重复 hook 合并，不处理后端 DI、Cron API 拆分、`useMediaManagement` 拆分。
- 占位扫描：无 TBD/TODO/“稍后实现”等占位描述。
- 类型一致性：新增 `StoreWebSocketSubscription` 只暴露两个只读函数属性，不引入 `any`、类型断言、非空断言。
- 回滚策略：删除新增通用 hook 和两个测试文件，并还原三个旧 hook 文件即可回到原行为。
