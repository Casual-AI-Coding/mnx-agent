# WorkflowService 仓储化契约

> **目标**：域层 WorkflowService 从 `DatabaseService` → `WorkflowRepository`，容器独立注册仓储而非钻孔。

**架构**：`WorkflowService(WorkflowRepository)` 直接调用 `workflowRepo.getTemplateById/getAllTemplates/getTemplatesPaginated/...`。

**边界**：不改 `IWorkflowService` 接口，不改 API 行为，workflows 路由中仅替换 workflow 相关 `getDatabaseService()` 调用（非 workflow 的权限/用户查询保留）。

**文件变更**：修改 `server/services/domain/workflow.service.ts`、`server/service-registration.ts`、`server/container.types.ts`、`server/services/domain/workflow.service.test.ts`、`server/routes/workflows.ts`、`server/routes/admin/workflows.ts`；新增合约测试和计划文档。

## 自审

`rtk rg -n "TBD|TODO|implement later|fill in details" docs/...16...md` → 无输出。
