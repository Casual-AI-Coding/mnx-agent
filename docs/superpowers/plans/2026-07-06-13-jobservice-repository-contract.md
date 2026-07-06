# JobService 仓储化契约计划

> 第十三阶段架构升级：按 SettingsService/LogService 正确模式，消除 domain JobService 对 DatabaseService God Facade 的依赖。

**目标：** 让 `server/services/domain/job.service.ts` 直接依赖 `JobRepository` 而非 `DatabaseService`，遵循 DDD Repository 模式。

---

## 架构

```
旧：JobService(DatabaseService) → this.db.getAllCronJobs() → DatabaseService.jobService → old JobService(JobRepository) ✓
新：JobService(JobRepository) → this.jobRepo.getAll() ✓
```

旧 DB `database/services/job-service.ts` 已正确依赖 `JobRepository`，domain 层包装了 `DatabaseService`。
本阶段将 domain 层改为直接依赖 `JobRepository`，跳过 God Facade。

## 文件结构

| 文件 | 变更 |
|------|------|
| `server/services/domain/job.service.ts` | 修改：`constructor(JobRepository)`，方法调用仓库替代 DB |
| `server/services/domain/job.service.test.ts` | 修改：mock `JobRepository` 替代 `DatabaseService` |
| `server/services/domain/__tests__/job-service-di-contract.test.ts` | 新增：源码契约测试 |
| `server/service-registration.ts` | 修改：构造 `new JobRepository(conn)` inline 传入 |
| `docs/superpowers/plans/2026-07-06-13-jobservice-repository-contract.md` | 新增：本计划 |

## 方法映射（Domain → Repository）

| Domain 方法 | 旧: `this.db.xxx()` | 新: `this.jobRepo.xxx()` |
|---|---|---|
| getAll | db.getAllCronJobs(ownerId) | jobRepo.getAll(ownerId) |
| getById | db.getCronJobById(id, ownerId) | jobRepo.getById(id, ownerId) |
| create | db.createCronJob(data, ownerId) | jobRepo.create(data, ownerId) |
| update | db.updateCronJob(id, data, ownerId) | jobRepo.update(id, data, ownerId) |
| delete | db.deleteCronJob(id, ownerId) | jobRepo.delete(id, ownerId) |
| toggle | db.toggleCronJobActive(id, ownerId) | jobRepo.toggleActive(id, ownerId) |
| getActive | db.getActiveCronJobs() | jobRepo.getActive() |
| getWithTag | db.getJobsByTag(tag) | jobRepo.getByTag(tag) |
| addTag | db.addJobTag(jobId, tag) | jobRepo.addTag(jobId, tag) |
| removeTag | db.removeJobTag(jobId, tag) | jobRepo.removeTag(jobId, tag) |
| getTags | db.getJobTags(jobId) | jobRepo.getTags(jobId) |
| getDependencies | db.getJobDependencies(jobId) | jobRepo.getDependencies(jobId) |
| getDependents | db.getJobDependents(jobId) | jobRepo.getDependents(jobId) |
| hasCircularDependency | BFS 用 db.getJobDependencies(current) | BFS 用 jobRepo.getDependencies(current) |
| getAllTags | db.getAllTags() | jobRepo.getAllTags() |
| updateRunStats | db.updateCronJobRunStats(...) | jobRepo.updateRunStats(...) |
| updateLastRun | db.updateCronJobLastRun(...) | jobRepo.updateLastRun(...) |

## 容器注册变更

```typescript
// 旧
container.registerSingleton(TOKENS.JOB_SERVICE, (c) => {
  return new JobService(c.resolve(TOKENS.DATABASE))
})

// 新
container.registerSingleton(TOKENS.JOB_SERVICE, (c) => {
  const db = c.resolve<DatabaseService>(TOKENS.DATABASE)
  const conn = db.getConnection()
  return new JobService(new JobRepository(conn))
})
```

## 边界

- 不改 `IJobService` 接口、API 行为、路由（cron/jobs.ts 已用 `getJobService()`）
- 不改旧 DB `database/services/job-service.ts`
- 不新增 Repository token（inline 构造，与 LogService 模式一致）
- 不改 `CronJob`/`CreateCronJob`/`UpdateCronJob`/`RunStats` 类型
- 不改 `validateCronExpression` 使用方式

## 验证

- RED: 契约测试（新旧均运行）
- GREEN: `rtk npm run test:server -- server/services/domain/job.service.test.ts server/services/domain/__tests__/job-service-di-contract.test.ts`
- LSP: `server/services/domain/job.service.ts`、测试文件
- Build: `rtk npm run build`
- Regression: `rtk npm run test:server -- server/routes/__tests__/workflows.test.ts server/__tests__/workflow-pagination.test.ts`
