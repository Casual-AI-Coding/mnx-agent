# MaterialService + ExportService 仓储化契约

> **目标**：域层 MaterialService 和 ExportService 从依赖 `DatabaseService` God Facade 改为依赖各自的 Repository，完成全部 8 个域服务的仓储化迁移。

**进度**：7/7 域服务 + ExportService = 8/8 全部完成仓储化。

---

## MaterialService

**架构**：`MaterialService(materialRepo, materialItemRepo, promptRepo)` 直接使用仓库方法。

**文件**：
- 修改 `server/services/domain/material.service.ts`
- 修改 `server/service-registration.ts`
- 新增 `server/services/domain/__tests__/material-service-contract.test.ts`

---

## ExportService

**架构**：`ExportService(logRepo, mediaRepo)` 直接使用 `LogRepository.getPaginated()` + `MediaRepository.list()`。

**文件**：
- 修改 `server/services/export-service.ts`
- 修改 `server/service-registration.ts`
- 修改 `server/services/__tests__/export-service.test.ts`

---

## 验证

```bash
rtk npm run test:server -- server/services/__tests__/export-service.test.ts \
  server/services/domain/__tests__/material-service-contract.test.ts \
  server/routes/__tests__/materials.test.ts server/routes/__tests__/prompts.test.ts
rtk npm run build
```
