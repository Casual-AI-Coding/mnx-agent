# Testing Standards

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

## 1. 测试金字塔

```
        /\
       /E2E\
      /------\
     /集成测试\
    /----------\
   /  单元测试  \
  /--------------\
```

| 层级 | 测试对象 | 覆盖目标 |
|------|---------|----------|
| 单元测试 | Repository / Domain Service | 业务逻辑 |
| 集成测试 | Route + Service + Repository | 组件协作 |
| E2E | 完整流程 | 端到端 |

---

## 2. 覆盖率标准

覆盖率配置见 `vitest.config.ts`（前端）和 `vitest.server.config.ts`（后端）。

| 指标 | 后端（硬阈值） | 前端（目标） |
|------|---------------|-------------|
| Lines | ≥ 80% | > 70% |
| Functions | ≥ 80% | > 70% |
| Branches | ≥ 80% | > 70% |
| Statements | ≥ 80% | > 70% |
| 新增代码 | 100% | 100% |

运行覆盖率检查：

```bash
npm run test:coverage
```

此命令同时运行前端和后端覆盖率测试。后端测试使用 `vitest.server.config.ts`，配置硬阈值 80%；前端测试使用 `vitest.config.ts`，当前未设置硬阈值，以目标 > 70% 为准。

---

## 3. 测试文件命名

### 3.1 位置约定

| 类型 | 位置 | 命名 |
|------|------|------|
| 后端测试 | `server/**/*.test.ts` | `*.test.ts` |
| 前端测试 | `src/**/*.test.{ts,tsx}` | `*.test.{ts,tsx}` |

### 3.2 测试函数命名

```typescript
describe('getMediaById', () => {
  it('should return media when id exists', () => { ... })
  it('should throw NotFoundError when id not exists', () => { ... })
})
```

格式：`it('should {expected behavior} when {condition}', ...)`

---

## 4. Mock 策略

### 4.1 外部 API Mock

Mock MiniMax API 调用：

```typescript
vi.mock('@/lib/minimax', () => ({
  minimaxClient: {
    text: {
      generate: vi.fn().mockResolvedValue({ data: { text: 'mock' } }),
    },
  },
}))
```

### 4.2 数据库 Mock

Mock Repository 接口：

```typescript
const mockDb = {
  getMediaById: vi.fn(),
  createMedia: vi.fn(),
}
```

### 4.3 God Class Mock

必须 mock 单例或全局对象：

```typescript
// Mock pino logger
vi.mock('pino', () => ({
  default: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
  }),
}))
```

---

## 5. 测试数据管理

### 5.1 独立性原则

每个测试独立数据，互不依赖：

```typescript
beforeEach(async () => {
  // 每个测试前创建独立数据
  const job = await db.createCronJob({ ... })
  testData.jobId = job.id
})

afterEach(async () => {
  // 每个测试后清理
  await db.deleteCronJob(testData.jobId)
})
```

### 5.2 Teardown 规则

- 测试后清理所有创建的资源
- Mock 在 `afterEach` 中重置
- 不留脏数据影响后续测试

---

## 6. 测试优先级

### 6.1 必须测试的场景

| 场景 | 原因 |
|------|------|
| 边界条件 | 空值、最大值、负数 |
| 错误路径 | 404、权限不足、无效输入 |
| 核心业务逻辑 | Repository、Service 层 |
| 集成点 | Route + Service 协作 |

### 6.2 可跳过的情况

| 场景 | 原因 |
|------|------|
| 简单 getter | 无逻辑 |
| 纯 UI 组件 | 已通过 E2E 覆盖 |
| 配置常量 | 无逻辑 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |