# 系统管理模块优化设计文档

> 创建时间: 2026-04-04
> 状态: 活跃
> 负责人: Sisyphus

## 一、背景与目标

### 1.1 现状分析

当前系统管理模块包含3个核心页面：
- **用户管理** - 用户CRUD、角色分配、状态管理
- **邀请码管理** - 批量生成、使用限制、过期管理
- **节点权限管理** - 服务节点权限配置

### 1.2 问题识别

通过代码审查和功能测试，识别出以下问题：

**严重级别（P0）- 必须修复**
1. 邀请码管理缺少PATCH接口 - 无法修改已创建邀请码的过期时间或使用次数
2. 服务节点管理缺少DELETE接口 - 无法删除废弃的服务节点配置
3. 用户删除操作无二次确认 - 存在误删风险

**功能缺失（P1）- 核心功能**
1. 缺少批量操作 - 无法批量启用/禁用/删除
2. 缺少导出功能 - 无法导出Excel/CSV报表
3. 用户管理缺少密码重置 - 管理员无法帮助用户重置密码
4. 缺少全局配置管理 - API限流、功能开关等无法动态配置

**体验优化（P2）- 交互改进**
1. 使用alert()而非Toast通知 - 不够专业
2. 表格无分页 - 数据量大时性能问题
3. 删除确认Dialog缺少输入验证 - 重要操作应要求输入确认
4. 硬编码颜色值 - 应使用设计tokens
5. Select组件使用inline style - 应使用Floating UI

**可选增强（P3）- 锦上添花**
1. 审计日志快捷入口
2. 邀请码使用详情查看
3. 用户头像上传
4. 服务节点文档链接

### 1.3 优化目标

1. **完整性** - 补全缺失的API接口和前端功能
2. **易用性** - 提升管理员的操作效率
3. **安全性** - 增加操作确认和审计
4. **一致性** - 统一UI交互模式

## 二、设计方案

### 2.1 架构原则

1. **最小改动原则** - 在现有架构基础上扩展，不重构核心逻辑
2. **一致性原则** - 遵循现有的UI模式和代码风格
3. **渐进增强原则** - 按优先级逐步实现，每步可独立验证

### 2.2 技术方案

#### P0 - 严重问题修复

**任务P0-1: 邀请码PATCH接口**
- 后端: 在`server/routes/invitation-codes.ts`添加PATCH路由
- 验证: 使用Zod验证请求体
- 权限: requireRole(['super'])
- 可更新字段: max_uses, expires_at, is_active

**任务P0-2: 服务节点DELETE接口**
- 后端: 在`server/routes/admin/service-nodes.ts`添加DELETE路由
- 级联检查: 删除前检查是否有工作流引用
- 权限: requireRole(['super'])

**任务P0-3: 删除确认Dialog增强**
- 前端: 创建可复用的ConfirmDialog组件
- 功能: 支持输入确认（输入"DELETE"确认）
- 应用: UserManagement删除用户时使用

#### P1 - 核心功能补充

**任务P1-1: 批量操作**
- 前端: 在UserManagement添加checkbox选择和BatchOperationToolbar
- 操作类型: 批量启用、批量禁用、批量删除
- 后端: 添加POST /api/users/batch路由

**任务P1-2: 导出功能**
- 前端: 创建ExportButton组件
- 格式: CSV（兼容Excel）
- 应用: 所有管理页面添加导出按钮

**任务P1-3: 密码重置**
- 后端: 添加POST /api/users/:id/reset-password路由
- 功能: 生成随机密码或允许管理员设置新密码
- 通知: 可选发送邮件通知用户

**任务P1-4: 全局配置管理**
- 新增页面: SystemConfig页面
- 数据库: 创建system_config表
- 配置项: API限流阈值、功能开关、系统公告等

#### P2 - UI/交互优化

**任务P2-1: Toast通知统一**
- 替换: 所有alert()改用toast.success()/toast.error()
- 使用: sonner库（已安装）

**任务P2-2: 表格分页**
- 前端: 添加Pagination组件
- 后端: 修改列表API支持page和limit参数
- 默认: 每页20条

**任务P2-3: 删除确认输入**
- 增强ConfirmDialog组件
- 支持要求输入特定文字确认
- 应用: 删除用户、删除邀请码等高风险操作

**任务P2-4: 设计token迁移**
- 目标: 将硬编码颜色改为CSS变量
- 文件: CronManagement.tsx, WorkflowBuilder.tsx等
- 示例: `text-blue-400` → `text-primary`

**任务P2-5: Select组件优化**
- 方案: 使用@radix-ui/react-popover替代inline style
- 或: 保持现有实现，inline style用于portal定位是合理的

### 2.3 数据库变更

**新增表: system_config**
```sql
CREATE TABLE system_config (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id)
);
```

**修改表: invitation_codes**
- 无需修改，现有字段已支持PATCH

### 2.4 API设计

**新增接口清单**

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| PATCH | /api/invitation-codes/:id | 更新邀请码 | super |
| DELETE | /api/admin/service-nodes/:id | 删除服务节点 | super |
| POST | /api/users/batch | 批量操作用户 | super |
| POST | /api/users/:id/reset-password | 重置密码 | super |
| GET | /api/system-config | 获取配置列表 | admin |
| PATCH | /api/system-config/:key | 更新配置 | super |
| GET | /api/users/export | 导出用户列表 | super |
| GET | /api/invitation-codes/export | 导出邀请码 | super |

## 三、实施计划

### 3.1 里程碑

**M1: P0修复 (第1周)**
- 完成所有P0任务
- 通过安全审查

**M2: P1核心功能 (第2-3周)**
- 完成所有P1任务
- 用户验收测试

**M3: P2体验优化 (第4周)**
- 完成所有P2任务
- 性能测试

**M4: P3可选增强 (按需)**
- 根据用户反馈决定是否实施

### 3.2 验收标准

**功能验收**
- 所有新增API通过单元测试
- 所有前端功能通过E2E测试
- 手动测试无阻塞问题

**性能验收**
- 页面加载时间 < 2s
- 列表查询响应时间 < 500ms
- 批量操作(100条)响应时间 < 3s

**安全验收**
- 所有API有权限控制
- 敏感操作有审计日志
- 通过SQL注入测试

## 四、风险评估

### 4.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 数据库迁移失败 | 低 | 高 | 使用事务，备份后执行 |
| API权限漏洞 | 中 | 高 | 代码审查 + 自动化测试 |
| 性能退化 | 低 | 中 | 添加性能监控 |

### 4.2 进度风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 需求变更 | 高 | 中 | 模块化设计，易于调整 |
| 依赖升级 | 低 | 低 | 锁定依赖版本 |

## 五、后续规划

### 5.1 近期迭代
- 完成P0/P1任务
- 收集用户反馈

### 5.2 中期规划
- 完成P2/P3任务
- 探索更多管理功能

### 5.3 长期愿景
- 构建完善的企业级管理后台
- 支持更多运维功能（日志分析、性能监控等）

---

*本文档持续更新，如有重大变更需同步更新plans目录下的实施计划*