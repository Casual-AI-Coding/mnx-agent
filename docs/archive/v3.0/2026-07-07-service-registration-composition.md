# 服务注册装配边界升级实施计划

> **执行约束：** 本次用户明确禁止 sub agent，因此所有步骤在当前会话内按顺序执行，并使用复选框（`- [ ]`）跟踪。

**目标：** 将 `server/service-registration.ts` 中重复的数据库连接与仓储实例化逻辑收敛到可测试的装配 helper，保持服务注册行为兼容。

**架构：** 新增 `server/service-registration/repository-factories.ts` 作为基础设施装配模块，只负责由具备 `getConnection()` 能力的数据库服务创建仓储对象；`registerServices()` 继续负责 token 注册和 singleton 生命周期，但通过 helper 表达仓储依赖。该切片不改容器运行时、不改 API 行为、不改领域服务业务语义。

**技术栈：** Express、TypeScript strict、Vitest、PostgreSQL、现有轻量 DI Container。

---

## 文件结构

- 新增：`server/service-registration/repository-factories.ts`
  - 基础设施装配 helper。
  - 输入具备 `getConnection()` 能力的最小数据库服务接口，输出具体 repository 或 repository 分组。
  - 不读取全局 container，不包含业务判断。
- 新增：`server/service-registration/__tests__/repository-factories.test.ts`
  - 用轻量 `DatabaseService` fixture 证明 factory 复用同一个 connection 并返回预期 repository 类。
- 修改：`server/service-registration.ts`
  - 导入 repository factory。
  - 将重复 `const db = c.resolve<DatabaseService>(TOKENS.DATABASE); const conn = db.getConnection(); new Repository(conn)` 改为 helper 调用。
  - 保留 `TOKENS`、`registerServices()`、getter 名称和注册顺序。
- 验证：`server/routes/__tests__/*-di-contract.test.ts`
  - 确认路由不退回直接 new repository 或直接 DB connection。

---

## 任务 1：仓储 factory RED 测试

**文件：**
- 新增：`server/service-registration/__tests__/repository-factories.test.ts`

- [x] **步骤 1：写失败测试**

```typescript
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseConnection } from '../../database/connection.js'
import type { DatabaseService } from '../../database/service-async.js'
import { CapacityRepository } from '../../repositories/capacity-repository.js'
import { DeadLetterRepository } from '../../repositories/deadletter-repository.js'
import { ExternalApiLogRepository } from '../../repositories/external-api-log.repository.js'
import { JobRepository } from '../../repositories/job-repository.js'
import { LogRepository } from '../../repositories/log-repository.js'
import { MaterialItemRepository } from '../../repositories/material-item-repository.js'
import { MaterialRepository } from '../../repositories/material-repository.js'
import { MediaRepository } from '../../repositories/media-repository.js'
import { PromptRepository } from '../../repositories/prompt-repository.js'
import { PromptTemplateRepository } from '../../repositories/prompt-template-repository.js'
import { SystemConfigRepository } from '../../repositories/system-config-repository.js'
import { TaskRepository } from '../../repositories/task-repository.js'
import { UserRepository } from '../../repositories/user-repository.js'
import { WebhookRepository } from '../../repositories/webhook-repository.js'
import { WorkflowRepository } from '../../repositories/workflow-repository.js'
import {
  createCapacityRepository,
  createExternalApiLogRepository,
  createExportRepositories,
  createJobRepository,
  createLogRepositories,
  createMaterialRepositories,
  createMediaRepository,
  createServiceNodePermissionRepositories,
  getDatabaseConnection,
  createSystemConfigRepository,
  createTaskRepositories,
  createTemplateRepository,
  createWebhookRepository,
  createWorkflowRepository,
} from '../repository-factories.js'

type DatabaseFixtureService = Pick<DatabaseService, 'getConnection'>

function createDatabaseFixture(): { database: DatabaseFixtureService; connection: DatabaseConnection } {
  const connection: DatabaseConnection = {
    query: vi.fn(async () => []),
    execute: vi.fn(async () => ({ changes: 0 })),
    transaction: async <T>(fn: (conn: DatabaseConnection) => Promise<T>) => fn(connection),
    close: vi.fn(async () => undefined),
    isPostgres: vi.fn(() => true),
  }
  const database = {
    getConnection: vi.fn(() => connection),
  }
  return { database, connection }
}

describe('repository factories', () => {
  it('creates single repositories from the database connection', () => {
    const { database, connection } = createDatabaseFixture()

    expect(createWorkflowRepository(database)).toBeInstanceOf(WorkflowRepository)
    expect(createJobRepository(database)).toBeInstanceOf(JobRepository)
    expect(createMediaRepository(database)).toBeInstanceOf(MediaRepository)
    expect(createWebhookRepository(database)).toBeInstanceOf(WebhookRepository)
    expect(createCapacityRepository(database)).toBeInstanceOf(CapacityRepository)
    expect(createTemplateRepository(database)).toBeInstanceOf(PromptTemplateRepository)
    expect(createSystemConfigRepository(database)).toBeInstanceOf(SystemConfigRepository)
    expect(createExternalApiLogRepository(database)).toBeInstanceOf(ExternalApiLogRepository)
    expect(getDatabaseConnection(database)).toBe(connection)
    expect(database.getConnection).toHaveBeenCalledTimes(9)
  })

  it('creates grouped repositories for services with multiple repository dependencies', () => {
    const { database } = createDatabaseFixture()

    const taskRepositories = createTaskRepositories(database)
    expect(taskRepositories.taskRepository).toBeInstanceOf(TaskRepository)
    expect(taskRepositories.deadLetterRepository).toBeInstanceOf(DeadLetterRepository)

    const logRepositories = createLogRepositories(database)
    expect(logRepositories.logRepository).toBeInstanceOf(LogRepository)
    expect(logRepositories.userRepository).toBeInstanceOf(UserRepository)

    const materialRepositories = createMaterialRepositories(database)
    expect(materialRepositories.materialRepository).toBeInstanceOf(MaterialRepository)
    expect(materialRepositories.materialItemRepository).toBeInstanceOf(MaterialItemRepository)
    expect(materialRepositories.promptRepository).toBeInstanceOf(PromptRepository)

    const exportRepositories = createExportRepositories(database)
    expect(exportRepositories.logRepository).toBeInstanceOf(LogRepository)
    expect(exportRepositories.mediaRepository).toBeInstanceOf(MediaRepository)

    const serviceNodePermissionRepositories = createServiceNodePermissionRepositories(database)
    expect(serviceNodePermissionRepositories.userRepository).toBeInstanceOf(UserRepository)
    expect(database.getConnection).toHaveBeenCalledTimes(5)
  })
})
```

- [x] **步骤 2：运行测试确认 RED**

运行：`npm run test:server -- server/service-registration/__tests__/repository-factories.test.ts`

预期：FAIL，原因是 `server/service-registration/repository-factories.ts` 尚不存在。

---

## 任务 2：实现仓储 factory

**文件：**
- 新增：`server/service-registration/repository-factories.ts`
- 测试：`server/service-registration/__tests__/repository-factories.test.ts`

- [x] **步骤 1：写最小实现**

```typescript
import type { DatabaseConnection } from '../database/connection.js'
import type { DatabaseService } from '../database/service-async.js'
import { CapacityRepository } from '../repositories/capacity-repository.js'
import { DeadLetterRepository } from '../repositories/deadletter-repository.js'
import { ExternalApiLogRepository } from '../repositories/external-api-log.repository.js'
import { JobRepository } from '../repositories/job-repository.js'
import { LogRepository } from '../repositories/log-repository.js'
import { MaterialItemRepository } from '../repositories/material-item-repository.js'
import { MaterialRepository } from '../repositories/material-repository.js'
import { MediaRepository } from '../repositories/media-repository.js'
import { PromptRepository } from '../repositories/prompt-repository.js'
import { PromptTemplateRepository } from '../repositories/prompt-template-repository.js'
import { SystemConfigRepository } from '../repositories/system-config-repository.js'
import { TaskRepository } from '../repositories/task-repository.js'
import { UserRepository } from '../repositories/user-repository.js'
import { WebhookRepository } from '../repositories/webhook-repository.js'
import { WorkflowRepository } from '../repositories/workflow-repository.js'

type RepositoryDatabase = Pick<DatabaseService, 'getConnection'>

function getConnection(database: RepositoryDatabase): DatabaseConnection {
  return database.getConnection()
}

export function createWorkflowRepository(database: RepositoryDatabase): WorkflowRepository {
  return new WorkflowRepository(getConnection(database))
}

export function createJobRepository(database: RepositoryDatabase): JobRepository {
  return new JobRepository(getConnection(database))
}

export function createTaskRepositories(database: RepositoryDatabase): {
  taskRepository: TaskRepository
  deadLetterRepository: DeadLetterRepository
} {
  const conn = getConnection(database)
  return {
    taskRepository: new TaskRepository(conn),
    deadLetterRepository: new DeadLetterRepository(conn),
  }
}

export function createLogRepositories(database: RepositoryDatabase): {
  logRepository: LogRepository
  userRepository: UserRepository
} {
  const conn = getConnection(database)
  return {
    logRepository: new LogRepository(conn),
    userRepository: new UserRepository(conn),
  }
}

export function createMediaRepository(database: RepositoryDatabase): MediaRepository {
  return new MediaRepository(getConnection(database))
}

export function createWebhookRepository(database: RepositoryDatabase): WebhookRepository {
  return new WebhookRepository(getConnection(database))
}

export function createCapacityRepository(database: RepositoryDatabase): CapacityRepository {
  return new CapacityRepository(getConnection(database))
}

export function createMaterialRepositories(database: RepositoryDatabase): {
  materialRepository: MaterialRepository
  materialItemRepository: MaterialItemRepository
  promptRepository: PromptRepository
} {
  const conn = getConnection(database)
  return {
    materialRepository: new MaterialRepository(conn),
    materialItemRepository: new MaterialItemRepository(conn),
    promptRepository: new PromptRepository(conn),
  }
}

export function createExportRepositories(database: RepositoryDatabase): {
  logRepository: LogRepository
  mediaRepository: MediaRepository
} {
  const conn = getConnection(database)
  return {
    logRepository: new LogRepository(conn),
    mediaRepository: new MediaRepository(conn),
  }
}

export function createExternalApiLogRepository(database: RepositoryDatabase): ExternalApiLogRepository {
  return new ExternalApiLogRepository(getConnection(database))
}

export function createTemplateRepository(database: RepositoryDatabase): PromptTemplateRepository {
  return new PromptTemplateRepository(getConnection(database))
}

export function createSystemConfigRepository(database: RepositoryDatabase): SystemConfigRepository {
  return new SystemConfigRepository(getConnection(database))
}

export function createServiceNodePermissionRepositories(database: RepositoryDatabase): {
  userRepository: UserRepository
} {
  return { userRepository: new UserRepository(getConnection(database)) }
}

export function getDatabaseConnection(database: RepositoryDatabase): DatabaseConnection {
  return getConnection(database)
}
```

- [x] **步骤 2：运行聚焦测试确认 GREEN**

运行：`npm run test:server -- server/service-registration/__tests__/repository-factories.test.ts`

预期：PASS。

- [x] **步骤 3：运行 diagnostics**

运行：`lsp_diagnostics server/service-registration/repository-factories.ts` 与 `lsp_diagnostics server/service-registration/__tests__/repository-factories.test.ts`

预期：无新增错误。

---

## 任务 3：接入 service-registration

**文件：**
- 修改：`server/service-registration.ts`
- 测试：`server/service-registration/__tests__/repository-factories.test.ts`

- [x] **步骤 1：导入 factory**

在 `server/service-registration.ts` 增加 import：

```typescript
import {
  createCapacityRepository,
  createExternalApiLogRepository,
  createExportRepositories,
  createJobRepository,
  createLogRepositories,
  createMaterialRepositories,
  createMediaRepository,
  createServiceNodePermissionRepositories,
  createSystemConfigRepository,
  createTaskRepositories,
  createTemplateRepository,
  createWebhookRepository,
  createWorkflowRepository,
  getDatabaseConnection,
} from './service-registration/repository-factories.js'
```

- [x] **步骤 2：替换重复装配**

将以下 singleton 回调改为调用 factory：

```typescript
container.registerSingleton(TOKENS.WORKFLOW_SERVICE, (c) => {
  return new WorkflowService(createWorkflowRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
})

container.registerSingleton(TOKENS.JOB_SERVICE, (c) => {
  return new JobService(createJobRepository(c.resolve<DatabaseService>(TOKENS.DATABASE)))
})

container.registerSingleton(TOKENS.TASK_SERVICE, (c) => {
  const repositories = createTaskRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
  return new TaskService(repositories.taskRepository, repositories.deadLetterRepository)
})

container.registerSingleton(TOKENS.LOG_SERVICE, (c) => {
  const repositories = createLogRepositories(c.resolve<DatabaseService>(TOKENS.DATABASE))
  return new LogService(
    repositories.logRepository,
    repositories.userRepository,
    c.resolve(TOKENS.EXTERNAL_API_LOG_REPOSITORY)
  )
})
```

同样替换 `MEDIA_SERVICE`、`WEBHOOK_SERVICE`、`CAPACITY_SERVICE`、`MATERIAL_SERVICE`、`EXPORT_SERVICE`、`SETTINGS_SERVICE`、`EXTERNAL_API_LOG_REPOSITORY`、`MEDIA_REPOSITORY`、`USER_SERVICE`、`TEMPLATE_SERVICE`、`SYSTEM_CONFIG_SERVICE`、`SERVICE_NODE_PERMISSION_SERVICE`。

- [x] **步骤 3：删除不再直接使用的 repository imports**

从 `server/service-registration.ts` 删除以下直接 repository import：

```typescript
ExternalApiLogRepository
JobRepository
CapacityRepository
LogRepository
MaterialRepository
MaterialItemRepository
PromptRepository
PromptTemplateRepository
SystemConfigRepository
MediaRepository
TaskRepository
UserRepository
WorkflowRepository
WebhookRepository
DeadLetterRepository
```

保留类型映射和 getter 需要的 service/repository 类型 import。如果某个 getter 返回类型仍需要具体 repository 类型，则改用 `import type`。

- [x] **步骤 4：运行聚焦测试**

运行：`npm run test:server -- server/service-registration/__tests__/repository-factories.test.ts server/__tests__/container-types.test.ts server/__tests__/container.test.ts`

预期：PASS。

---

## 任务 4：DI 契约与构建验证

**文件：**
- 验证：`server/service-registration.ts`
- 验证：`server/service-registration/repository-factories.ts`
- 验证：`server/routes/__tests__/*-di-contract.test.ts`

- [x] **步骤 1：运行 Route DI 契约测试**

运行：`npm run test:server -- server/routes/__tests__/auth-di-contract.test.ts server/routes/__tests__/media-di-contract.test.ts server/routes/__tests__/external-proxy-di-contract.test.ts server/routes/__tests__/settings-di-contract.test.ts server/routes/__tests__/workflows-di-contract.test.ts server/routes/__tests__/users-di-contract.test.ts server/routes/__tests__/admin-workflows-di-contract.test.ts server/routes/__tests__/external-api-logs-di-contract.test.ts`

预期：PASS。

- [x] **步骤 2：运行 diagnostics**

对以下改动文件运行 diagnostics：

- `server/service-registration.ts`
- `server/service-registration/repository-factories.ts`
- `server/service-registration/__tests__/repository-factories.test.ts`

预期：无新增错误。

- [x] **步骤 3：运行构建**

运行：`npm run build`

预期：PASS。

- [x] **步骤 4：自审禁止项**

检查 changed files：

- 无类型逃逸。
- 无 TypeScript 忽略指令。
- 无新增业务逻辑进入 repository factory。
- 无新增直接 SQL 或安全敏感日志。

---

## 任务 5：原子提交

**文件：**
- 提交文档：
  - `docs/superpowers/specs/2026-07-07-service-registration-composition-design.md`
  - `docs/superpowers/plans/2026-07-07-service-registration-composition.md`
- 提交实现：
  - `server/service-registration/repository-factories.ts`
  - `server/service-registration/__tests__/repository-factories.test.ts`
  - `server/service-registration.ts`

- [x] **步骤 1：按 git-master 检测仓库提交风格**

使用 `GIT_MASTER=1` 运行 git-master Phase 0 命令，并确认仓库采用中文 semantic 提交风格。

- [x] **步骤 2：提交文档**

Commit message:

```bash
GIT_MASTER=1 git add docs/superpowers/specs/2026-07-07-service-registration-composition-design.md docs/superpowers/plans/2026-07-07-service-registration-composition.md
GIT_MASTER=1 git commit -m "docs(architecture): 规划服务注册装配边界升级" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 3：提交实现**

Commit message:

```bash
GIT_MASTER=1 git add server/service-registration/repository-factories.ts server/service-registration/__tests__/repository-factories.test.ts server/service-registration.ts
GIT_MASTER=1 git commit -m "refactor(server): 收敛服务注册仓储装配" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

- [x] **步骤 4：提交后验证工作区**

运行：`GIT_MASTER=1 git status --short`

预期：无输出。
