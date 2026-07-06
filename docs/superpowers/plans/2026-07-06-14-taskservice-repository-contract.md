# TaskService 仓储化契约计划

> 第十四阶段：消除 domain TaskService 对 DatabaseService 的依赖，改为直接依赖 TaskRepository + DeadLetterRepository。

**目标：** `server/services/domain/task.service.ts` 从 `constructor(DatabaseService)` → `constructor(TaskRepository, DeadLetterRepository)`。

---

## 架构

```
旧：TaskService(DatabaseService) → this.db.getAllTasks() → DatabaseService.taskService → old TaskService(TaskRepository) ✓
新：TaskService(TaskRepository, DeadLetterRepository) → this.taskRepo.listTasks() ✓
```

域层超载了 TaskRepository 操作 + DeadLetterQueue 操作。将两者拆为独立端口：`constructor(taskRepo, deadLetterRepo)`。

## 文件结构

| 文件 | 变更 |
|------|------|
| `server/services/domain/task.service.ts` | 修改：`constructor(TaskRepository, DeadLetterRepository)` |
| `server/services/domain/task.service.test.ts` | 修改：mock `TaskRepository` + `DeadLetterRepository` |
| `server/services/domain/__tests__/task-service-di-contract.test.ts` | 新增：源码契约测试 |
| `server/service-registration.ts` | 修改：inline 构造 `TaskRepository` + `DeadLetterRepository` |
| `docs/superpowers/plans/2026-07-06-14-taskservice-repository-contract.md` | 本计划 |

## 方法映射

**TaskRepository 调用：**
- `db.getAllTasks(filter)` → `taskRepo.listTasks(filter)`
- `db.getTaskById(id, ownerId)` → `taskRepo.getById(id, ownerId)`
- `db.createTask(data, ownerId)` → `taskRepo.create(data, ownerId)`
- `db.updateTask(id, data, ownerId)` → `taskRepo.update(id, data, ownerId)`
- `db.deleteTask(id, ownerId)` → `taskRepo.delete(id, ownerId)`
- `db.getPendingTasks(limit)` → `taskRepo.getPendingByJob(null, limit)`
- `db.getTaskCountsByStatus(ownerId)` → `taskRepo.getCountsByStatus(ownerId)`
- `db.getTasksByJobId(jobId, ownerId)` → `taskRepo.getByJobId(jobId, ownerId)`
- `db.markTaskRunning(id)` → `taskRepo.markRunning(id)`
- `db.markTaskCompleted(id, result, ownerId)` → `taskRepo.markCompleted(id, result, ownerId)`
- `db.markTaskFailed(id, error, ownerId)` → `taskRepo.markFailed(id, error, ownerId)`
- `db.incrementRetryCount(id)` → `taskRepo.updateStatus(id, 'pending', ..., ownerId)` — **注意：incrementRetryCount 在 TaskService 中是特殊语义，保留在 domain 层调用 taskRepo.update() 实现**

**DeadLetterRepository 调用：**
- `db.addToDeadLetterQueue(...)` → `deadLetterRepo.create(...)`
- `db.getDeadLetterQueue(ownerId, limit)` → `deadLetterRepo.getAll(ownerId, limit)`
- `db.getDeadLetterQueueById(id, ownerId)` → `deadLetterRepo.getById(id, ownerId)`
- `db.resolveDeadLetterQueueItem(id, resolution, ownerId)` → `deadLetterRepo.resolve(id, resolution, ownerId)`

## 容器注册

```typescript
container.registerSingleton(TOKENS.TASK_SERVICE, (c) => {
  const db = c.resolve<DatabaseService>(TOKENS.DATABASE)
  const conn = db.getConnection()
  return new TaskService(
    new TaskRepository(conn),
    new DeadLetterRepository(conn)
  )
})
```

## 边界

- 不改 `ITaskService` 接口、API 行为、路由
- 不改旧 DB `database/services/task-service.ts`
- 不改 `DlqService`
- 不新增 Repository token（inline 构造）
