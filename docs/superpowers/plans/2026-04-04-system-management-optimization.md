# 系统管理模块优化实施计划

> 创建时间: 2026-04-04
> 关联设计: @specs/system-management-optimization-design.md
> 预计工时: 14小时（串行）/ 7小时（并行）

## 任务总览

| Phase | 任务数 | 预计时间 | 状态 |
|-------|--------|----------|------|
| P0 - 严重修复 | 3 | 2.5h | 🔴 待开始 |
| P1 - 核心功能 | 4 | 5h | ⏸️ 等待P0 |
| P2 - UI优化 | 5 | 3h | ⏸️ 等待P1 |
| P3 - 可选增强 | 4 | 2.5h | ⏸️ 等待P2 |

---

## Phase 0: 严重问题修复 (P0)

### 任务P0-1: 邀请码PATCH接口

**目标**: 支持修改已创建邀请码的过期时间和使用次数

**实施步骤**:
1. 在`server/routes/invitation-codes.ts`添加PATCH路由
2. 创建Zod验证schema (updateInvitationCodeSchema)
3. 实现更新逻辑
4. 测试验证

**修改文件**:
- `server/routes/invitation-codes.ts` - 添加PATCH路由
- `server/database/service-async.ts` - 添加updateInvitationCode方法

**验证标准**:
- [ ] PATCH /api/invitation-codes/:id 返回200
- [ ] 无效邀请码ID返回404
- [ ] 非super用户返回403
- [ ] 数据库记录正确更新

**预计时间**: 45分钟

---

### 任务P0-2: 服务节点DELETE接口

**目标**: 支持删除废弃的服务节点配置

**实施步骤**:
1. 在`server/routes/admin/service-nodes.ts`添加DELETE路由
2. 检查节点是否被工作流引用
3. 如有引用则拒绝删除
4. 无引用则执行删除

**修改文件**:
- `server/routes/admin/service-nodes.ts` - 添加DELETE路由
- `server/database/service-async.ts` - 添加deleteServiceNode方法

**验证标准**:
- [ ] DELETE /api/admin/service-nodes/:id 返回200
- [ ] 被引用的节点返回409 Conflict
- [ ] 非super用户返回403
- [ ] 删除后数据库记录不存在

**预计时间**: 40分钟

---

### 任务P0-3: 删除确认Dialog增强

**目标**: 重要删除操作需要二次确认，防止误操作

**实施步骤**:
1. 创建`src/components/shared/ConfirmDialog.tsx`组件
2. 支持两种模式: 简单确认 / 输入确认
3. 在UserManagement删除用户时使用
4. 在InvitationCodes禁用邀请码时使用

**修改文件**:
- `src/components/shared/ConfirmDialog.tsx` - 新建组件
- `src/pages/UserManagement.tsx` - 替换删除Dialog
- `src/pages/InvitationCodes.tsx` - 替换禁用Dialog
- `src/components/shared/index.ts` - 导出新组件

**验证标准**:
- [ ] 点击删除弹出确认Dialog
- [ ] 输入"DELETE"后才能确认删除
- [ ] 取消操作不执行删除
- [ ] 组件可复用于其他页面

**预计时间**: 60分钟

---

## Phase 1: 核心功能补充 (P1)

### 任务P1-1: 批量操作功能

**目标**: 支持批量启用/禁用/删除用户

**实施步骤**:
1. 后端: 添加POST /api/users/batch路由
2. 前端: 在UserManagement添加checkbox列
3. 创建BatchOperationToolbar组件
4. 实现批量选择和操作逻辑

**修改文件**:
- `server/routes/users.ts` - 添加batch路由
- `src/pages/UserManagement.tsx` - 添加checkbox和工具栏
- `src/components/shared/BatchOperationToolbar.tsx` - 新建组件

**验证标准**:
- [ ] 可选择多个用户
- [ ] 批量启用/禁用成功
- [ ] 批量删除有确认Dialog
- [ ] 操作后列表正确刷新

**预计时间**: 90分钟

---

### 任务P1-2: 导出功能

**目标**: 支持导出用户列表和邀请码列表为CSV

**实施步骤**:
1. 创建ExportButton组件
2. 后端添加导出API或前端直接生成CSV
3. 在UserManagement和InvitationCodes添加导出按钮
4. 实现CSV生成和下载逻辑

**修改文件**:
- `src/components/shared/ExportButton.tsx` - 新建组件
- `src/pages/UserManagement.tsx` - 添加导出按钮
- `src/pages/InvitationCodes.tsx` - 添加导出按钮

**验证标准**:
- [ ] 点击导出下载CSV文件
- [ ] CSV内容包含所有筛选后的数据
- [ ] 文件名包含导出时间
- [ ] Excel可正确打开CSV

**预计时间**: 50分钟

---

### 任务P1-3: 密码重置功能

**目标**: 管理员可帮助用户重置密码

**实施步骤**:
1. 后端: 添加POST /api/users/:id/reset-password路由
2. 生成随机密码或接受管理员指定的密码
3. 前端: 在用户编辑Dialog添加重置密码按钮
4. 显示新密码供管理员转告用户

**修改文件**:
- `server/routes/users.ts` - 添加reset-password路由
- `src/pages/UserManagement.tsx` - 添加重置密码按钮
- `server/services/user-service.ts` - 添加resetPassword方法

**验证标准**:
- [ ] 点击重置密码弹出确认Dialog
- [ ] 确认后生成新密码并显示
- [ ] 用户可用新密码登录
- [ ] 审计日志记录密码重置操作

**预计时间**: 60分钟

---

### 任务P1-4: 全局配置管理

**目标**: 提供系统级配置管理界面

**实施步骤**:
1. 数据库: 创建system_config表
2. 后端: 创建/api/system-config路由
3. 前端: 创建SystemConfig页面
4. 添加路由和菜单项

**修改文件**:
- `server/database/schema-pg.ts` - 添加system_config表
- `server/routes/system-config.ts` - 新建路由
- `src/pages/SystemConfig.tsx` - 新建页面
- `src/App.tsx` - 添加路由
- `src/components/layout/Sidebar.tsx` - 添加菜单项

**验证标准**:
- [ ] 超级管理员可访问配置页面
- [ ] 可查看和修改配置项
- [ ] 修改后配置立即生效
- [ ] 配置变更有审计日志

**预计时间**: 120分钟

---

## Phase 2: UI/交互优化 (P2)

### 任务P2-1: Toast通知统一

**目标**: 所有操作反馈使用Toast替代alert

**实施步骤**:
1. 审查所有使用alert()的地方
2. 替换为toast.success()或toast.error()
3. 确保消息文案清晰友好

**修改文件**:
- `src/pages/UserManagement.tsx` - 替换alert
- `src/pages/InvitationCodes.tsx` - 替换alert
- `src/pages/ServiceNodeManagement.tsx` - 替换alert

**验证标准**:
- [ ] 所有alert()已被替换
- [ ] 成功操作显示绿色Toast
- [ ] 失败操作显示红色Toast
- [ ] Toast 3秒后自动消失

**预计时间**: 30分钟

---

### 任务P2-2: 表格分页

**目标**: 大数据量时分页展示，提升性能

**实施步骤**:
1. 创建Pagination组件
2. 修改UserManagement表格添加分页
3. 后端API支持page和limit参数
4. 默认每页20条

**修改文件**:
- `src/components/shared/Pagination.tsx` - 新建组件
- `src/pages/UserManagement.tsx` - 添加分页
- `server/routes/users.ts` - 支持分页参数

**验证标准**:
- [ ] 表格底部显示分页控件
- [ ] 可切换页码
- [ ] 可修改每页条数
- [ ] URL同步页码状态

**预计时间**: 60分钟

---

### 任务P2-3: 删除确认输入验证

**目标**: 高风险操作要求输入特定文字确认

**实施步骤**:
1. 增强ConfirmDialog组件支持input模式
2. 用户删除要求输入用户名确认
3. 邀请码禁用要求输入"DISABLE"确认

**修改文件**:
- `src/components/shared/ConfirmDialog.tsx` - 添加input模式
- `src/pages/UserManagement.tsx` - 使用input确认
- `src/pages/InvitationCodes.tsx` - 使用input确认

**验证标准**:
- [ ] Dialog显示输入框
- [ ] 输入不匹配时确认按钮禁用
- [ ] 输入匹配后才可确认

**预计时间**: 20分钟

---

### 任务P2-4: 设计token迁移

**目标**: 硬编码颜色改用CSS变量

**实施步骤**:
1. 识别所有硬编码颜色值
2. 替换为对应的CSS变量类名
3. 验证视觉效果一致

**修改文件**:
- `src/pages/CronManagement.tsx` - ServiceIcon颜色
- `src/pages/WorkflowBuilder.tsx` - 节点颜色
- 其他包含硬编码颜色的文件

**验证标准**:
- [ ] 所有硬编码颜色已替换
- [ ] 主题切换正常工作
- [ ] 视觉效果无变化

**预计时间**: 45分钟

---

### 任务P2-5: Select组件优化

**目标**: 优化下拉定位，移除inline style

**分析结论**: Select组件的inline style用于portal定位，这是合理的技术实现。如需优化可考虑使用@radix-ui/react-popover，但投入产出比不高。**决定保持现状**，记录为已知技术债务。

**预计时间**: 0分钟 (不实施)

---

## Phase 3: 可选增强 (P3)

### 任务P3-1: 审计日志快捷入口

**目标**: 从用户详情快速查看该用户的审计日志

**实施步骤**:
1. 在UserManagement用户行添加"查看日志"按钮
2. 点击跳转到审计日志页面并自动筛选该用户

**修改文件**:
- `src/pages/UserManagement.tsx` - 添加按钮
- `src/pages/AuditLogs.tsx` - 支持URL参数筛选

**预计时间**: 30分钟

---

### 任务P3-2: 邀请码详情Dialog

**目标**: 查看单个邀请码的使用记录

**实施步骤**:
1. 创建邀请码详情Dialog
2. 显示基本信息和使用列表
3. 添加点击行打开详情的功能

**修改文件**:
- `src/pages/InvitationCodes.tsx` - 添加详情Dialog

**预计时间**: 40分钟

---

### 任务P3-3: 用户头像上传

**目标**: 支持用户头像上传和显示

**实施步骤**:
1. 数据库: users表添加avatar_url字段
2. 后端: 添加头像上传API
3. 前端: 用户编辑Dialog添加头像上传

**修改文件**:
- `server/database/schema-pg.ts` - 添加字段
- `server/routes/users.ts` - 添加上传路由
- `src/pages/UserManagement.tsx` - 添加上传UI

**预计时间**: 60分钟

---

### 任务P3-4: 服务节点文档链接

**目标**: 为每个服务节点添加使用说明链接

**实施步骤**:
1. 数据库: service_node_permissions表添加doc_url字段
2. 前端: 节点卡片显示文档链接图标
3. 点击打开新标签页

**修改文件**:
- `server/database/schema-pg.ts` - 添加字段
- `src/pages/ServiceNodeManagement.tsx` - 显示链接

**预计时间**: 35分钟

---

## 并行执行图

```
┌─────────────────────────────────────────────────────────────┐
│                     Phase 0 (串行)                            │
│  P0-1 ──> P0-2 ──> P0-3                                      │
│  (邀请码PATCH) (节点DELETE) (确认Dialog)                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Phase 1 (并行)                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  P1-1    │  │  P1-2    │  │  P1-3    │  │  P1-4    │    │
│  │ 批量操作 │  │ 导出功能 │  │ 密码重置 │  │ 全局配置 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  可同时执行（修改不同文件）                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Phase 2 (并行)                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  P2-1    │  │  P2-2    │  │  P2-3    │  │  P2-4    │    │
│  │ Toast    │  │  分页    │  │ 输入确认 │  │ Token迁移│    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Phase 3 (按需)                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  P3-1    │  │  P3-2    │  │  P3-3    │  │  P3-4    │    │
│  │审计入口  │  │邀请码详情│  │头像上传  │  │文档链接  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 提交策略

每个任务完成后创建独立提交：

```
feat(invitation-codes): add PATCH endpoint for updating codes
feat(service-nodes): add DELETE endpoint for removing nodes
feat(ui): add ConfirmDialog component with input validation
feat(users): add batch operations (enable/disable/delete)
feat(export): add CSV export functionality
feat(users): add password reset by admin
feat(system-config): add global configuration management
refactor(toast): replace all alert() with toast notifications
feat(pagination): add table pagination component
feat(confirm): enhance ConfirmDialog with input validation
refactor(design): migrate hardcoded colors to design tokens
feat(audit): add quick access to user audit logs
feat(invitation-codes): add detail dialog with usage records
feat(users): add avatar upload functionality
feat(service-nodes): add documentation links
```

## 下一步行动

1. ✅ 设计文档已创建
2. ✅ 实施计划已创建
3. 🔄 开始执行Phase 0 (P0任务)

---

*本文档完成后归档至archive/目录*