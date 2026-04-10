# 服务执行节点-流程编排-定时调度 优化实施计划

> 创建时间: 2026-04-05
> 版本: v1.5
> 状态: 进行中

## 现状分析

### 已完成功能 ✅
1. **后端核心功能完善**:
   - Webhook 通知 (on_start/on_success/on_failure) 已实现
   - 执行状态持久化 (ExecutionStateManager)
   - Pause/Resume 功能已实现
   - 节点级 WebSocket 事件已实现
   - 模板版本管理已实现
   - DLQ 自动重试已实现

2. **UI 组件完善**:
   - ConfirmDialog 组件已完善 (支持 destructive variant 和 requireInput)
   - WebhookManagement 页面已实现 (但仍有 confirm() 问题)
   - DeadLetterQueue 页面已实现 (但仍有 confirm() 问题)

### 待优化问题 ⚠️

| 页面 | 问题 | 优先级 | 预计工时 |
|------|------|--------|----------|
| CronManagement | 使用原生 confirm() 而非 ConfirmDialog | P0 | 30min |
| WebhookManagement | 使用原生 confirm() 而非 ConfirmDialog | P0 | 20min |
| DeadLetterQueue | 使用原生 confirm() 而非 ConfirmDialog | P0 | 20min |
| WorkflowBuilder | 测试运行面板可增强 | P1 | 1h |
| CronManagement | 执行日志详情展示优化 | P1 | 1h |
| 系统整体 | Toast 通知统一化 | P2 | 30min |

---

## 实施任务

### P0: 确认对话框替换 (Critical)

#### P0-1: CronManagement.tsx 确认对话框
**文件**: `src/pages/CronManagement.tsx`
**问题**: 第637行和第828行使用原生 `confirm()`
**修改**:
- 导入 ConfirmDialog 组件
- 将删除确认替换为使用 ConfirmDialog
- 删除确认需要输入 "DELETE" 确认

#### P0-2: WebhookManagement.tsx 确认对话框
**文件**: `src/pages/WebhookManagement.tsx`
**问题**: 第541行使用原生 `confirm()`
**修改**:
- 导入 ConfirmDialog 组件
- 将删除确认替换为使用 ConfirmDialog
- 删除确认需要输入 "DELETE" 确认

#### P0-3: DeadLetterQueue.tsx 确认对话框
**文件**: `src/pages/DeadLetterQueue.tsx`
**问题**: 第526行使用原生 `confirm()`
**修改**:
- 导入 ConfirmDialog 组件
- 将删除确认替换为使用 ConfirmDialog
- 删除确认需要输入 "DELETE" 确认

### P1: UI/UX 优化 (Important)

#### P1-1: 执行日志详情优化
**文件**: `src/pages/CronManagement.tsx`
**优化内容**:
- 执行日志展开时显示更详细的节点执行信息
- 增加节点输入/输出 payload 预览
- 优化错误信息展示格式

#### P1-2: 工作流测试运行面板增强
**文件**: `src/components/workflow/TestRunPanel.tsx`, `src/pages/WorkflowBuilder.tsx`
**优化内容**:
- 测试运行时显示节点级别进度
- 支持中断正在运行的测试
- 显示每个节点的执行时间

### P2: 细节优化 (Nice to Have)

#### P2-1: Toast 通知统一
**检查范围**: 所有使用原生 `alert()` 的地方
**修改**: 替换为 toast.success() 或 toast.error()

---

## 执行顺序

```
P0 (并行执行)
├── P0-1: CronManagement 确认对话框
├── P0-2: WebhookManagement 确认对话框
└── P0-3: DeadLetterQueue 确认对话框
    ↓
P1 (可并行执行)
├── P1-1: 执行日志详情优化
└── P1-2: 工作流测试运行面板增强
    ↓
P2 (按需)
└── P2-1: Toast 通知统一检查
```

---

## 验证标准

### P0 验证
- [ ] CronManagement 删除任务时弹出 ConfirmDialog
- [ ] WebhookManagement 删除 webhook 时弹出 ConfirmDialog
- [ ] DeadLetterQueue 删除项目时弹出 ConfirmDialog
- [ ] 需要输入 "DELETE" 才能确认删除
- [ ] 取消操作不执行删除

### P1 验证
- [ ] 执行日志展开显示完整节点信息
- [ ] 工作流测试运行显示实时进度

---

## 提交记录

```
fix(ui): replace confirm() with ConfirmDialog in CronManagement
fix(ui): replace confirm() with ConfirmDialog in WebhookManagement
fix(ui): replace confirm() with ConfirmDialog in DeadLetterQueue
enhancement(ui): improve execution log detail view
enhancement(ui): enhance workflow test run panel
refactor(toast): replace all alert() with toast notifications
```
