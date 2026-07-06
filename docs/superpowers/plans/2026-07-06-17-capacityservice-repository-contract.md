# CapacityService 仓储化契约

> **目标**：域层 CapacityService 从依赖 `DatabaseService` God Facade 改为依赖 `CapacityRepository`，遵循 LogService/JobService/TaskService/MediaService/WorkflowService 已确立的仓储化模式。

**架构**：`CapacityService(capacityRepo: CapacityRepository)` 直接使用 `getAll/getByService/upsert/updateCapacity/decrementCapacity`，不再透传 `DatabaseService`。

**边界**：
- 不改 ICapacityService 接口（5 方法签名不变）
- 不改 API 路径/请求体/响应格式/状态码
- capacity 路由已全部使用 `getCapacityService()`，无需改路由
- 不新增 token（复用既有 `TOKENS.CAPACITY_SERVICE`）
- 不改 `DatabaseService` 内部遗留委托方法

---

## 文件

| 操作 | 文件 |
|------|------|
| 修改 | `server/services/domain/capacity.service.ts` |
| 修改 | `server/service-registration.ts` (L182-184 + import) |
| 修改 | `server/services/domain/capacity.service.test.ts` |
| 新增 | `server/services/domain/__tests__/capacity-service-contract.test.ts` |

---

## 方法映射

| 旧 (DatabaseService) | 新 (CapacityRepository) |
|---|---|
| `this.db.getAllCapacityRecords()` | `this.capacityRepo.getAll()` |
| `this.db.getCapacityByService(t)` | `this.capacityRepo.getByService(t)` |
| `this.db.upsertCapacityRecord(t,d)` | `this.capacityRepo.upsert(t,d)` |
| `this.db.updateCapacity(t,r)` | `this.capacityRepo.updateCapacity(t,r)` |
| `this.db.decrementCapacity(t,a)` | `this.capacityRepo.decrementCapacity(t,a)` |

---

## 验证

```bash
rtk npm run test:server -- server/services/domain/__tests__/capacity-service-contract.test.ts \
  server/services/domain/capacity.service.test.ts \
  server/routes/__tests__/capacity.test.ts
rtk npm run build
```
