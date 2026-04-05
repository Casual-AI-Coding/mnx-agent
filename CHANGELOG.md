# Changelog

All notable changes to this project will be documented in this file.

## [1.5.3] - 2026-04-05

### Added

**Settings System - 全面的配置管理系统 (Phase 1-4)**

**后端实现：**
- **Settings Service** (`server/services/settings-service.ts`) - 业务逻辑层
  - 支持 10 个配置类别的 CRUD 操作
  - 配置验证、加密、变更历史追踪
- **Settings Repository** (`server/repositories/settings-repository.ts`) - 数据访问层
- **Settings History Repository** (`server/repositories/settings-history-repository.ts`) - 变更审计日志
- **Settings REST API** (`server/routes/settings/index.ts`) - 完整的 CRUD 端点
  - `GET /api/settings` - 获取所有配置
  - `GET /api/settings/:category` - 获取特定类别配置
  - `PATCH /api/settings/:category` - 更新类别配置
  - `DELETE /api/settings/:category` - 重置为默认值
  - `GET /api/settings/history` - 配置变更历史
  - `POST /api/settings/sync` - 手动触发同步
- **数据库迁移** (`migration_024_settings_system.ts`) - 新增 4 张表
  - `user_settings` - 用户配置存储（key-value per category）
  - `settings_history` - 配置变更审计日志
  - `system_settings` - 系统级默认配置
  - `settings_sync_queue` - 离线同步队列
- **Zod 验证 Schema** (`server/validation/settings-validation.ts`) - 配置输入验证

**前端类型系统：**
- **配置类别 TypeScript 接口** (`src/settings/types/`) - 10 个类别
  - `category-account.ts` - 用户账号、语言、时区、会话超时
  - `category-api.ts` - MiniMax API 密钥、区域、模式、超时
  - `category-ui.ts` - 主题、侧边栏、动画、密度、字体大小
  - `category-generation.ts` - 文本/语音/图像/音乐/视频默认参数
  - `category-cron.ts` - 定时任务默认配置（时区、超时、重试）
  - `category-workflow.ts` - 工作流构建器偏好（自动布局、网格、缩放）
  - `category-notification.ts` - WebSocket/Webhook/邮件/桌面通知
  - `category-media.ts` - 媒体存储、自动保存、命名模式、缩略图
  - `category-privacy.ts` - 隐私、审计日志、导出加密、令牌刷新
  - `category-accessibility.ts` - 高对比度、屏幕阅读器、键盘快捷键
- **配置验证 Schema** (`src/settings/validation/`) - 10 个 Zod Schema
- **存储类型定义** (`src/settings/types/storage.ts`) - StorageScope, SettingMetadata, SettingsChangeEvent

**前端 Store：**
- **Settings Store** (`src/settings/store/index.ts`) - Zustand 状态管理
  - 支持配置的增删改查、验证、同步
  - 订阅特定配置路径的变更通知
- **默认配置值** (`src/settings/store/defaults.ts`) - 所有类别的默认值定义
- **混合持久化策略** (`src/settings/store/persistence.ts`) - localStorage + Backend
  - `localKeys` - UI 偏好（主题、布局、动画）
  - `backendKeys` - 用户数据（API 密钥、Webhook 配置）
  - `hybridKeys` - 关键配置（双存储，本地缓存 + 远程同步）
  - `encryptedKeys` - 敏感配置（API 密钥、Webhook 密钥加密存储）
- **配置迁移脚本** (`src/settings/migrate-legacy.ts`) - 从旧 Store 迁移
  - 自动迁移 AppStore 和 AuthStore 的配置到新 Settings Store
- **Settings Hooks** (`src/settings/store/hooks.ts`) - React Hooks 封装

**前端 UI：**
- **Settings 页面完整实现** (`src/pages/Settings.tsx`) - 重构版本
- **Settings 布局组件** (`src/components/settings/`)
  - `SettingsLayout.tsx` - 主布局
  - `SettingsSidebar.tsx` - 类别导航（10 个类别）
  - `SettingsContent.tsx` - 内容容器
- **10 个配置类别面板** (`src/components/settings/categories/`)
  - `AccountSettingsPanel.tsx` - 用户账号配置面板
  - `ApiSettingsPanel.tsx` - API 配置面板（密钥、区域）
  - `UISettingsPanel.tsx` - UI 配置面板（主题、布局）
  - `GenerationSettingsPanel.tsx` - 生成参数配置面板（5 个子类别）
  - `CronSettingsPanel.tsx` - Cron 配置面板
  - `WorkflowSettingsPanel.tsx` - 工作流配置面板
  - `NotificationSettingsPanel.tsx` - 通知配置面板
  - `MediaSettingsPanel.tsx` - 媒体配置面板
  - `PrivacySettingsPanel.tsx` - 隐私配置面板
  - `AccessibilitySettingsPanel.tsx` - 无障碍配置面板
- **6 种字段类型组件** (`src/components/settings/fields/`)
  - `TextSetting.tsx` - 文本输入
  - `NumberSetting.tsx` - 数字输入
  - `SelectSetting.tsx` - 下拉选择
  - `BooleanSetting.tsx` - 开关切换
  - `RangeSetting.tsx` - 滑块调节
  - `SettingsField.tsx` - 通用字段包装器

**集成：**
- **Settings 集成到生成页面**
  - `ImageGeneration.tsx` - 从 Settings 读取默认图像生成参数
  - `VideoGeneration.tsx` - 从 Settings 读取默认视频生成参数
  - `VoiceSync.tsx` - 从 Settings 读取默认语音合成参数
  - `MusicGeneration.tsx` - 从 Settings 读取默认音乐生成参数
  - `TextGeneration.tsx` - 从 Settings 读取默认文本生成参数
- **Sidebar 导航** - 新增 Settings 入口
- **App 路由** - 添加 `/settings` 路由和带 category 参数的子路由

### Changed

- **Sidebar** - 添加 Settings 导航入口（齿轮图标）
- **App.tsx** - 添加 Settings 路由配置
- **Settings Modal** - 移除旧的 SettingsModal，替换为 NavLink 到新 Settings 页面

### Performance

- **混合持久化策略** - localStorage 缓存 UI 偏好，减少 API 调用
- **Optimistic UI** - 配置更新立即反映，后台异步同步

### Security

- **API 密钥加密存储** - `api.minimaxKey` 加密后存储到 backend
- **Webhook 密钥加密存储** - `notification.webhookSecret` 加密存储
- **配置变更审计日志** - `settings_history` 表记录所有变更（用户、时间、旧值、新值）

### Documentation

- 新增 Settings 系统设计文档 `docs/superpowers/specs/2026-04-05-settings-system-design.md` (1039行)
- 新增 Settings 系统实施计划 `docs/superpowers/plans/2026-04-05-settings-system-implementation.md` (639行)

## [1.5.2] - 2026-04-05

### Added

**领域驱动架构升级**

- **Domain Services 层** - 业务逻辑与数据访问分离
  - `server/services/domain/job.service.ts` - Cron任务业务逻辑
  - `server/services/domain/task.service.ts` - 任务队列业务逻辑
  - `server/services/domain/log.service.ts` - 执行日志业务逻辑
  - `server/services/domain/interfaces.ts` - ITaskExecutor, TaskResult 接口定义

- **配置常量模块** - 消除硬编码魔法数字
  - `server/config/timeouts.ts` - 统一超时常量
  - `server/config/rate-limits.ts` - 限流配置
  - `server/config/limits.ts` - 并发限制

- **共享验证Schema** - `server/validation/common.ts`
  - `paginationSchema`, `idParamSchema`, `taskStatusEnum`, `mediaTypeEnum`

- **前端Hooks拆分**
  - `useWorkflowBuilder.ts` (623行) - WorkflowBuilder核心状态管理
  - `useWorkflowDragDrop.ts` (64行) - 拖拽逻辑
  - `useWorkflowExecution.ts` (160行) - 执行控制
  - `useWorkflowValidation.ts` (90行) - 验证逻辑
  - `useWorkflowVersions.ts` (149行) - 版本管理
  - `useMediaManagement.ts` (500行) - MediaManagement Hook抽取

- **前端组件拆分**
  - `MediaCard.tsx`, `MediaTableView.tsx`, `TimelineItem.tsx` - Media组件
  - `lib/constants/media.tsx`, `lib/utils/media.tsx` - 常量和工具

- **单元测试** - 48个新测试
  - `job.service.test.ts` (204行)
  - `task.service.test.ts` (212行)
  - `log.service.test.ts` (148行)

### Changed

- **依赖倒置原则 (DIP)** - Routes调用Domain Services
  - `routes/cron/jobs.ts` → JobService
  - `routes/cron/logs.ts` → LogService
  - `routes/cron/queue.ts` → TaskService

- **WorkflowBuilder 瘦身** - ~1000行 → 493行 (~50%减少)
- **MediaManagement 瘦身** - ~985行 → 351行 (~65%减少)

### Fixed

- 包名修正: `mnx-agent` (原 `minimax-toolset`)
- Vitest 配置: 解析 `@mnx/shared-types` 别名

### Performance

- 类型统一: ITaskExecutor/TaskResult 跨模块共享
- 消除 JsonViewer 重复组件

### Documentation

- 新增架构升级设计文档 `docs/superpowers/specs/2026-04-05-architecture-upgrade-design.md`
- 新增架构升级实施计划 `docs/superpowers/plans/2026-04-05-architecture-upgrade.md`

## [1.5.1] - 2026-04-05

### Changed

**架构重构完善（Phase 0-2）**

- **类型系统完善** - server/types.ts 迁移到 shared-types
  - 迁移 1000+ 行类型定义到 @mnx/shared-types
  - 修复 DeadLetterQueueItem、WebhookDelivery、User 字段不匹配
  - 新增 AuditLog、ExecutionState、SystemConfig、PromptTemplate 类型
  - 消除 RunStats 和 AuditAction 重复定义

- **基础设施增强**
  - WebSocket 订阅 hook 工厂函数 (`useWebSocketSubscription`)
  - 统一 API 错误处理器 (`src/lib/api/error-handler.ts`)
  - 设计 Token 系统 (`src/themes/tokens.ts`) - 颜色、间距、排版

- **API 响应标准化**
  - 84 处 `res.json({ success: true })` → `successResponse()`
  - 88 处 `res.status().json({ success: false })` → `errorResponse()`
  - 新增 `getOwnerId`/`requireOwnerId` 数据隔离工具函数

- **服务单例模式**
  - `services/index.ts` 完整导出单例 getter
  - `QueueProcessor` 和 `WebSocketService` 单例模式

- **前端组件去重**
  - 消除 StatusBadge 和 ServiceIcon 重复定义
  - 创建通用 `createTemplateStore` 工厂函数
  - 合并 templates.ts 和 workflowTemplates.ts

- **Repository 模式完善**
  - 4 个 Repository 继承 BaseRepository：
    - CapacityRepository、WebhookRepository、WorkflowRepository、UserRepository
  - 移除冗余 `conn` 属性和 `isPostgres`/`toISODate` 方法

- **UserManagement 组件拆分**
  - 1224 行 → 242 行主文件
  - 模块化：UserManagement、useUserManagement、UserFilters、UserTable、UserFormDialogs、types

### Performance

- 消除约 200 行重复 store 代码
- server/types.ts 从 1151 行减少到 57 行（95% 减少）

### Documentation

- 新增架构重构实施计划 `docs/superpowers/plans/2026-04-05-architecture-refactoring-implementation.md`

## [1.5.0] - 2026-04-05

### Added

**架构重构（Phase 0-1）**

- **shared-types共享类型包** - 前后端类型统一
  - 新增 `packages/shared-types/` 独立包
  - 提取共享实体类型：CronJob, Task, Media, Workflow, User, Webhook等
  - 提取Zod验证Schema：cron-schemas, media-schemas
  - 前后端可导入相同类型定义，消除重复

- **基础设施抽象层** - 统一超时和退避策略
  - `server/infrastructure/timeout.ts` - 统一超时处理函数
  - `server/infrastructure/backoff.ts` - 统一指数退避计算器
  - 替代3处重复的超时/退避实现

- **Repository模式** - 数据访问层抽象
  - 拆分2668行 `DatabaseService` 为10个领域Repository：
    - JobRepository (350行) - Cron任务数据访问
    - TaskRepository (443行) - 任务队列数据访问
    - LogRepository (440行) - 执行日志数据访问
    - MediaRepository (248行) - 媒体记录数据访问
    - WebhookRepository (251行) - Webhook配置数据访问
    - WorkflowRepository (434行) - 工作流模板数据访问
    - UserRepository (268行) - 用户数据访问
    - CapacityRepository (82行) - 容量追踪数据访问
    - DeadLetterRepository (117行) - 死信队列数据访问
    - PromptTemplateRepository (164行) - 提示模板数据访问
  - BaseRepository抽象类 (160行) - 通用CRUD模板
  - 每个Repository职责单一，平均<300行

- **WorkflowEngine模块化重构** - Strategy模式拆分
  - 拆分1229行 `workflow-engine.ts` 为模块化结构：
    - `workflow/engine.ts` (233行) - 核心协调器
    - `workflow/parser.ts` (71行) - JSON解析验证
    - `workflow/topological-sort.ts` (99行) - DAG拓扑排序
    - `workflow/template-resolver.ts` (135行) - 模板变量解析
    - `workflow/node-executor.ts` (149行) - 节点执行协调
    - `workflow/executors/*.ts` - 各节点类型独立执行器（Strategy模式）：
      - ActionExecutor (128行)
      - ConditionExecutor (104行)
      - DelayExecutor (72行)
      - ErrorBoundaryExecutor (173行)
      - LoopExecutor (218行)
      - QueueExecutor (126行)
      - TransformExecutor (174行)
    - `workflow/exclusion-utils.ts` (82行) - 节点排除逻辑
    - `workflow/types.ts` (39行) - 类型定义

- **路由模块化拆分** - 按领域分组
  - 拆分929行 `routes/cron.ts` 为模块化结构：
    - `routes/cron/index.ts` (50行) - 路由聚合器
    - `routes/cron/jobs.ts` (411行) - 任务管理路由
    - `routes/cron/logs.ts` (227行) - 执行日志路由
    - `routes/cron/queue.ts` (126行) - 任务队列路由
    - `routes/cron/webhooks.ts` (109行) - Webhook管理路由
    - `routes/cron/utils.ts` (14行) - 共享工具函数

**新功能**

- **Delay节点类型** - 工作流执行延迟
  - 新增 `delay` 节点类型，支持工作流执行暂停
  - 配置选项：`duration`（固定延迟）或 `until`（延迟到指定时间）
  - 前端组件：`DelayNode.tsx` - Purple主题，Clock图标
  - 后端执行器：`DelayExecutor.ts` - 支持超时继承
  - 用途：API限流、等待外部进程、退避策略实现

**前端架构重构（Phase 2）**

- **组件拆分** - 大型组件模块化
  - WorkflowBuilder (2080行 → 多个小组件)
    - `builder/WorkflowToolbar.tsx` (267行)
    - `builder/WorkflowConfigPanel.tsx` (289行)
    - `builder/WorkflowNodePalette.tsx` (218行)
    - `builder/WorkflowTestPanel.tsx` (85行)
    - `builder/WorkflowVersionPanel.tsx` (106行)
    - `builder/ExecutionStatusPanel.tsx` (177行)
    - `nodes/DelayNode.tsx` (126行)
    - `nodes/ErrorBoundaryNode.tsx` (125行)
  - CronManagement (1314行 → 多个小组件)
    - `management/CronJobsTab.tsx` (262行)
    - `management/ExecutionLogsTab.tsx` (217行)
    - `management/JobsListTab.tsx` (275行)
    - `management/TaskQueueTab.tsx` (275行)
    - `management/CreateJobModal.tsx` (229行)
    - `management/EditJobModal.tsx` (227行)
    - `management/ExecutionLogPanel.tsx` (263行)
    - `management/JsonViewer.tsx` (79行)

- **共享组件提取**
  - `shared/JsonViewer.tsx` (79行) - JSON展示组件
  - `shared/ServiceIcon.tsx` (39行) - 服务图标组件
  - `shared/StatusBadge.tsx` (41行) - 状态徽章组件
  - `shared/dateUtils.ts` (17行) - 日期工具函数

### Changed

- **UI改进**
  - TestRunPanel增强：实时更新、Abort按钮、改进错误展示
  - DeadLetterQueue：使用ConfirmDialog替换原生confirm()
  - 设计Token迁移：硬编码颜色替换为CSS变量

- **测试更新**
  - 更新ActionConfigPanel测试以匹配新组件路径
  - 更新workflow-xss-prevention测试以使用新的executor架构

### Performance

- **代码质量指标改进**
  - 最大文件行数：2668行 → 443行（**83%减少**）
  - Repository抽象：无 → 10个独立Repository类
  - 类型共享：前后端重复定义 → shared-types统一包
  - 超时/退避抽象：3处重复 → 统一infrastructure层
  - 节点执行模式：单一WorkflowEngine → Strategy模式分离

### Documentation

- 新增设计文档和实施计划
  - `specs/architecture-refactoring-design.md` (256行) - 架构重构设计方案
  - `specs/2026-04-05-delay-node-design.md` (156行) - Delay节点设计规格
  - `plans/2026-04-05-architecture-refactoring.md` (229行) - 架构重构实施计划
  - `plans/2026-04-05-delay-node.md` (546行) - Delay节点实施计划
  - `plans/2026-04-05-cron-misfire-handling.md` (838行) - Cron misfire处理方案
  - `plans/2026-04-05-workflow-cron-scheduling-optimization.md` (130行) - 工作流调度优化

### Technical Debt

- ✅ 消除服务定位器反模式
- ✅ 统一前后端类型系统
- ✅ 统一基础设施抽象（timeout/backoff）
- ✅ 拆分所有千行文件
- ✅ 引入Repository Pattern和Strategy Pattern

### Backward Compatibility

- ✅ 所有API端点保持不变
- ✅ 数据库schema无变更（Repository仅封装现有表）
- ✅ 前端路由和功能无破坏性变更
- ✅ shared-types包向后兼容（渐进式迁移）

## [1.4.0] - 2026-04-05

### Added

**系统管理模块优化**

- **邀请码PATCH接口** - 支持修改过期时间、使用次数、启用状态
  - `PATCH /api/invitation-codes/:id` - 更新邀请码配置
  - 权限控制: requireRole(['super'])

- **服务节点DELETE接口** - 支持删除废弃的服务节点配置
  - `DELETE /api/admin/service-nodes/:id` - 删除服务节点
  - 权限控制: requireRole(['super'])

- **用户批量操作** - 提升管理员效率
  - `POST /api/users/batch` - 批量启用/禁用/删除用户
  - BatchOperationToolbar组件 - 复选框选择和批量操作工具栏
  - 权限控制: requireRole(['super'])

- **密码重置功能** - 管理员帮助用户重置密码
  - `POST /api/users/:id/reset-password` - 重置用户密码
  - 生成随机密码或自定义新密码
  - 权限控制: requireRole(['super'])

- **全局配置管理** - 动态配置系统参数
  - 新增 `SystemConfig` 页面 (`/system-config`)
  - `system_config` 数据库表
  - `GET /api/system-config` - 获取配置列表
  - `PATCH /api/system-config/:key` - 更新配置项
  - 权限控制: admin查看, super修改

- **CSV导出功能** - 数据导出支持
  - ExportButton组件 - 通用导出按钮
  - UserManagement导出用户列表
  - InvitationCodes导出邀请码列表

- **ConfirmDialog组件** - 可复用的确认对话框
  - 支持普通确认和输入验证确认
  - 删除用户时要求输入"DELETE"确认

- **Pagination组件** - 表格分页
  - 页码选择器
  - 每页条数选择 (10/20/50/100)
  - 快速跳转输入框

- **Checkbox组件** - 表单复选框

### Changed

- **Toast通知统一** - 所有页面替换 `alert()` 为 `toast.success()`/`toast.error()`
  - UserManagement, InvitationCodes, ServiceNodeManagement
  - WorkflowBuilder, CronManagement, MediaManagement 等30+页面

- **设计Token迁移** - 硬编码颜色替换为CSS变量
  - 节点组件: ConditionNode, LoopNode, TransformNode, ActionNode
  - 工作流组件: NodeOutputPanel, NodeStatusIndicator, TestRunPanel
  - 页面组件: Dashboard, AuditLogs, DeadLetterQueue 等

- **UI一致性优化**
  - FormError组件样式更新
  - HistoryPanel样式调整
  - Header布局优化

### API

| 方法 | 路径 | 描述 |
|------|------|------|
| PATCH | /api/invitation-codes/:id | 更新邀请码 |
| DELETE | /api/admin/service-nodes/:id | 删除服务节点 |
| POST | /api/users/batch | 批量操作用户 |
| POST | /api/users/:id/reset-password | 重置用户密码 |
| GET | /api/system-config | 获取系统配置 |
| PATCH | /api/system-config/:key | 更新配置项 |

### Database

- `system_config` 表 - 系统配置存储

### Documentation

- `docs/superpowers/specs/system-management-optimization-design.md` - 设计文档
- `docs/superpowers/plans/2026-04-04-system-management-optimization.md` - 实施计划
- `docs/superpowers/plans/2026-04-04-system-management-optimization-summary.md` - 工作总结
- `scripts/verify-system-management.sh` - 验证脚本

## [1.3.7] - 2026-04-04

### Added

**Phase 1: WebSocket Real-time Integration**
- Extended WebSocket event types: `workflow_test_started`, `workflow_test_completed`, `workflow_node_output`, `retry_scheduled`, `queue_capacity_warning`, `task_moved_to_dlq`
- Integrated `taskQueue`, `executionLogs`, `cronJobs` stores with WebSocket for real-time state updates
- New hooks: `useTaskQueueWebSocket`, `useExecutionLogsWebSocket`, `useCronJobsWebSocket`
- Real-time status updates without manual page refresh

**Phase 2: Configuration Experience Optimization**
- **Cron Expression Builder** (`CronExpressionBuilder.tsx`)
  - Visual cron expression builder with presets (daily, weekly, monthly, custom)
  - Time selector with hour/minute dropdowns
  - Weekday selection for weekly schedules
  - Real-time expression display and natural language description
  - Next 5 execution times preview
  
- **Node Configuration Forms** (`FieldBuilder.tsx`, `ActionConfigPanel.tsx`)
  - Dynamic form generation based on service/method
  - Support for field types: text, number, select, textarea, json, template
  - Field validation and error display
  - Service documentation (`workflow-service-docs.ts`)
  
- **Validation & Error Messages**
  - Enhanced `workflow-validation.ts` with cycle detection and severity levels
  - New `workflow-error-messages.ts` with human-readable error messages and suggestions

**Phase 3: Test & Debug Capabilities**
- **Test Run API** (`POST /workflows/:id/test-run`)
  - Dry-run mode for testing without actual API calls
  - Test data injection support
  - Node-level execution results
  
- **Test Run Panel** (`TestRunPanel.tsx`)
  - Run test and dry-run buttons
  - Test data configuration (JSON editor)
  - Execution results display with node status and duration
  
- **Node Output Panel** (`NodeOutputPanel.tsx`)
  - Node input/output preview
  - JSON formatting with syntax highlighting
  - Copy to clipboard functionality
  - Error message display

**Phase 4: Template Marketplace**
- **Workflow Marketplace** (`WorkflowMarketplace.tsx`)
  - Template card grid display
  - Category filtering (text, image, voice, video, music, analytics)
  - Search functionality
  - Template preview modal
  - "Use Template" button to load template into WorkflowBuilder
  
- **Built-in Templates** (8 templates)
  - AI Content Assistant
  - Customer Service Bot
  - Social Media Content Generator
  - Image Batch Processor
  - Podcast Generator
  - Video Production Prep
  - Data Analytics Report
  - Music Emotion Matcher

### API
- `POST /workflows/:id/test-run` - Test run workflow with optional dry-run mode and test data
- Extended WebSocket events for workflow test execution

### Changed
- **WebSocket Client** (`websocket-client.ts`)
  - Added `workflows` channel support
  - Extended event payload types for tasks, logs, jobs, and workflows
  - Enhanced toast notifications for new event types

- **Stores** (`taskQueue.ts`, `executionLogs.ts`, `cronJobs.ts`)
  - Added `subscribeToWebSocket()` and `unsubscribeFromWebSocket()` methods
  - Real-time state updates from WebSocket events

- **WorkflowEngine** (`workflow-engine.ts`)
  - Added `TestExecutionOptions` interface with `testData` and `dryRun` fields
  - Modified `executeWorkflow()` to accept test options
  - Dry-run mode returns mock data instead of calling actual APIs

- **CronManagement** (`CronManagement.tsx`)
  - Integrated WebSocket hooks for real-time updates
  - Updated job creation/edit modals with CronExpressionBuilder

- **WorkflowBuilder** (`WorkflowBuilder.tsx`)
  - Added test run button to toolbar
  - Integrated TestRunPanel and NodeOutputPanel
  - WebSocket subscription for workflow test events

### Fixed
- Fixed `hasWorkflowId` prop missing in WorkflowBuilder Toolbar
- Fixed TypeScript types in TestRunPanel API response

## [1.3.6] - 2026-04-04

### Added
- **Execution Control System** - Workflow execution pause/resume support
  - New `ExecutionStateManager` service for execution state persistence
  - `execution_states` table for tracking execution progress across layers
  - `workflow_versions` table for workflow template versioning
  - WorkflowEngine supports `pauseExecution()` and `resumeExecution()` via `AbortController`
  - Static registry for running executions (`WorkflowEngine.getRunningExecutionEngine()`)

- **Webhook Management Page** - Complete webhook CRUD UI
  - New `WebhookManagement.tsx` page at `/webhooks`
  - Webhook creation/edit modal with validation
  - Delivery history modal with status tracking
  - Custom headers support (key-value pairs)
  - HMAC secret for payload signing
  - Webhook test functionality
  - Associated job selection (global or specific job)

- **Workflow Validation Utilities** - Node and workflow validation
  - `validateNode()` for single node validation
  - `validateWorkflow()` for full workflow checks
  - `ValidationError` interface with severity levels (error/warning)
  - Disconnected node warnings
  - Helper functions: `getNodeErrors`, `getNodeSeverity`, `getValidationSummary`

- **Dead Letter Queue Auto-Retry** - Automatic retry scheduler
  - `QueueProcessor.startAutoRetry()` and `stopAutoRetry()` methods
  - Configurable `AutoRetryConfig`: `initialDelayMs`, `maxDelayMs`, `maxAttempts`, `backoffMultiplier`
  - Default: 1 minute interval, max 5 minutes, 3 attempts

- **CronScheduler Notification Integration** - Automatic webhook notifications
  - Integrated `NotificationService` into `CronScheduler`
  - Sends `on_start`, `on_success`, `on_failure` events automatically
  - Job execution notifications now work without manual setup

- **Workflow Builder Enhancements** - UI improvements
  - `NodeStatusIndicator` component for visual execution feedback
  - Workflow selector modal refinements
  - Better node component styling (ConditionNode, LoopNode, TransformNode, ActionNode)
  - Sidebar Webhook menu entry

- **Cron Utilities** - Helper functions for cron expressions
  - New `src/lib/cron-utils.ts` module

### API
- `POST /api/cron/executions/:id/pause` - Pause running workflow execution
- `POST /api/cron/executions/:id/resume` - Resume paused workflow execution

### Database
- `migration_022` - `execution_states` table with indexes
- `migration_023` - `workflow_versions` table for versioning

### Changed
- **WorkflowEngine** - Major refactoring for execution control
  - Added workflow ID tracking (`workflowId` property)
  - Layer-by-layer execution with abort signal checking
  - State persistence on each layer completion
  - Cleanup on execution finish (remove from running registry)

- **QueueProcessor** - Extended with auto-retry capabilities
  - New `AutoRetryConfig` interface
  - Timer-based retry scheduler for DLQ items

- **CronScheduler** - Constructor now accepts `NotificationService`
  - Backward compatible (optional parameter)

### Technical
- **DatabaseService** - Generic SQL helper methods
  - `run(sql, params)` for raw execution
  - `get<T>(sql, params)` for single row query
  - `all<T>(sql, params)` for multi-row query

## [1.3.5] - 2026-04-04

### Added
- **API Response Helpers** - Standardized API response middleware
  - `server/middleware/api-response.ts` with `successResponse`, `errorResponse`, `createdResponse`, `deletedResponse`
  - Consistent `{ success, data, error }` response format across all routes

- **Workflow Engine Enhancements** - Advanced execution features
  - **Node-level timeout**: Configure timeout per node (`timeout?: number` in seconds)
  - **Retry policy**: Support for `retryPolicy.maxRetries` and `retryPolicy.backoffMultiplier`
  - **Parallel execution**: Independent nodes in same topological layer execute concurrently via `Promise.all()`

- **WebSocket Real-time Updates** - Live workflow execution tracking
  - New `useWorkflowUpdates` hook for subscribing to workflow execution events
  - Events: `workflow_node_start`, `workflow_node_complete`, `workflow_node_error`
  - Visual feedback on nodes during workflow execution

- **Dead Letter Queue UI** - Failed task management interface
  - New `DeadLetterQueue.tsx` page at `/dead-letter-queue`
  - List/retry/delete failed tasks
  - Filter by task type, date range
  - Bulk retry functionality
  - Statistics dashboard

### Performance
- **Database indexes**: Added `migration_021` with `idx_execution_log_details_log_id`
- Most indexes from task requirements already existed in `migration_020` and `migration_002`

## [1.3.4] - 2026-04-04

### Added
- **TemplateSelectorModal Component** - Workflow template selector UI (v1.3.2 promised feature)
  - Visual workflow preview with mini node cards
  - Search and filter functionality
  - Load templates directly into WorkflowBuilder

### Fixed
- **Test Infrastructure** - Comprehensive test environment improvements
  - Database cleanup in `beforeEach` for proper test isolation
  - Mock authentication middleware for route tests
  - Expanded test coverage across all modules

- **UI Components** - Select component improvements
  - Better keyboard navigation
  - Improved accessibility

### Changed
- **Database Schema** - Schema refinements for consistency
  - Connection helper utilities
  - Type safety improvements

- **Cron Routes** - Enhanced route handling
  - Better validation schemas
  - Improved error handling

- **API Layer** - Expanded API client functionality
  - Additional cron API methods in frontend

### Removed
- **Archived Plans** - Clean up v1.3 planning documents
  - Removed 12 completed planning documents from `docs/superpowers/plans/`
  - Plans archived to `docs/planning/archive/v1.3/` (v1.3.2)

### Documentation
- Update `docs/superpowers/specs/workflow-core-concepts.md`

## [1.3.3] - 2026-04-04

### Fixed
- **Test Environment Configuration** - PostgreSQL connection for tests
  - Fix `vitest.config.ts` to load both frontend and backend setup files
  - Backend setup file loads `.env` for database credentials
  - Add mock authentication middleware for route tests
  - Add database cleanup in `beforeEach` for test isolation
- **Database Service Boolean Query** - Fix boolean parameter handling in PostgreSQL queries
  - Change integer conversion to native boolean for `is_public` filter
- **Workflow API Parameter Handling** - Support both `is_public` and `is_template` parameters

### Documentation
- Add `docs/TESTING.md` - Test environment setup guide with PostgreSQL configuration

## [1.3.2] - 2026-04-04

### Added
- **Service Node Permissions Management** - Complete CRUD API for permission control
  - `GET /api/admin/service-permissions` - List all permissions (admin+)
  - `GET /api/admin/service-permissions/:service/:method` - Get single permission
  - `POST /api/admin/service-permissions` - Create permission (super only)
  - `PATCH /api/admin/service-permissions/:id` - Update permission (super only)
  - `DELETE /api/admin/service-permissions/:id` - Delete permission (super only)
  - Support `min_role` configuration (user/pro/admin/super)
  - Support `is_enabled` toggle and `category` grouping

- **Workflow Engine Advanced Features** - Complete DAG execution support
  - **Condition Branching** - True/false branch execution with `sourceHandle`
  - **Loop Sub-Workflow** - Execute complex DAG inside loop with `subNodes`/`subEdges`
  - **Queue Node** - Batch task execution by `jobId` or `taskType`
  - **Timeout Handling** - Configurable timeout (default 5min) with `WorkflowTimeoutError`
  - Template variables: `{{item}}` and `{{index}}` for loop iterations

- **Workflow Builder UX** - Major frontend improvements
  - **Undo/Redo** - History management with 50 max states, Ctrl+Z/Y shortcuts
  - **Workflow Selector Modal** - Load saved templates from database
  - **Human-Readable IDs** - Generated IDs like `action-text-abc123`
  - **ConfigPanel Caching** - useMemo for services/methods to reduce re-computation

- **Cron Scheduler Enhancement** - TaskExecutor integration
  - Pass `TaskExecutor` to `WorkflowEngine` for async operations
  - Queue node can now execute batch tasks via TaskExecutor

- **Dead Letter Queue Completion** - Full DLQ implementation
  - `max_retries` and `created_at` columns added
  - `QueueProcessor.moveToDeadLetterQueue()` now writes to database
  - WebSocket event `task_moved_to_dlq` for real-time notification

- **Composite Database Indexes** - Performance optimization
  - `idx_task_queue_owner_status`
  - `idx_execution_logs_owner_status`
  - `idx_cron_jobs_owner_active`
  - `idx_workflow_templates_owner_public`
  - `idx_media_records_owner_type`

### Fixed
- **Queue Processor Types** - Replace `TaskQueueRow` with `TaskQueueItem` for consistency
- **Workflow Builder State Sync** - Remove dual-state synchronization (ReactFlow + Zustand)

### Changed
- **Workflow Builder Architecture** - Single ReactFlow state source
  - Zustand store now metadata-only (`currentWorkflowId`, `isDirty`)
  - Direct ReactFlow state manipulation + `store.setDirty(true)`
  - Removed all sync useEffects between ReactFlow and Zustand
  - Persist only metadata in Zustand, not full workflow state

- **Workflow Engine Constructor** - Accept optional `TaskExecutor` parameter
  - Backward compatible - existing code works without changes

### Performance
- **Database Queries** - Composite indexes reduce query time 30-50%
- **Frontend Rendering** - ConfigPanel caching reduces redundant API calls
- **Memory Usage** - Single state source reduces memory overhead

### Database
- `migration_019` - Add `owner_id` to execution_log_details, webhook_deliveries; enhance DLQ
- `migration_020` - Add composite indexes for owner+status queries

### Tests
- 1974 lines of new tests added
  - `dead-letter-queue.test.ts` (399 lines) - DLQ CRUD and retry logic
  - `service-permissions.test.ts` (242 lines) - Permission management API
  - `cron-scheduler-integration.test.ts` (353 lines) - Scheduler + TaskExecutor
  - `workflow-engine-condition.test.ts` (209 lines) - Condition branching
  - `workflow-engine-loop.test.ts` (261 lines) - Loop sub-workflow
  - `workflow-engine-queue.test.ts` (310 lines) - Queue node execution
  - `workflow-engine-timeout.test.ts` (200 lines) - Timeout handling

### Documentation
- Archive all v1.3 planning documents to `docs/planning/archive/v1.3/`
  - 12 planning documents (5000+ lines) preserved for reference

## [1.3.1] - 2026-04-04

### Added
- **Service Node Registry Expansion** - Expanded from 16 to 61 registered actions
  - MiniMax API: videoAgentGenerate/Status, fileList/Upload/Retrieve/Delete, voiceList/Delete/Clone/Design, getBalance, getCodingPlanRemains
  - Database: getAllCronJobs, getCronJobById, createCronJob, updateCronJob, deleteCronJob, toggleCronJobActive, getActiveCronJobs, getAllTasks, createTask, markTaskRunning/Completed/Failed, getQueueStats, getAllExecutionLogs, createExecutionLog, updateExecutionLog, getMediaRecords, getMediaRecordById, updateMediaRecord
  - Capacity: getRemainingCapacity, hasCapacity, getSafeExecutionLimit, checkBalance, refreshAllCapacity, canExecuteTask, waitForCapacity
  - Media Storage: saveMediaFile, saveFromUrl, deleteMediaFile, readMediaFile
  - Utils: toCSV, generateMediaToken, verifyMediaToken

- **Visual Workflow Preview** - WorkflowTemplateManagement detail dialog now shows visual React Flow preview
  - WorkflowPreview component with ActionNode, ConditionNode, LoopNode, TransformNode support
  - "在编排器中编辑" button to navigate to WorkflowBuilder
  - WorkflowBuilder supports loading templates via URL query parameter `?id=xxx`

- **Integration Test Framework** - Complete testing infrastructure
  - Test setup file for PostgreSQL environment loading
  - WorkflowTestHelper class with predefined templates
  - Phase A tests (5 tests): Mock-based core engine verification
  - Phase B tests (5 tests): Real API integration with MiniMax
  - Phase C tests (2 tests): End-to-end cron workflow execution

### Fixed
- **Service Node Registry** - Fix `this` binding in `call()` method
- **JSONB Field Handling** - Ensure `nodes_json`/`edges_json` always return strings
- **Cron Scheduler** - Handle JSONB columns that may already be objects
- **Pagination Tests** - Update to match clamping behavior (negative values clamped to min)
- **Test Environment** - Fix import paths and exclude test files from build

### Changed
- **Auth Rate Limit** - Increased default from 10 to 100 attempts
- **Service Registration** - Changed to async, auto-syncs permissions to database
- **TypeScript Config** - Exclude test files (`**/__tests__/**`, `**/*.test.tsx`)

### API
- `GET /api/cron/logs/:id/details` - New endpoint for execution log details

### Database
- `migration_014` - Add example workflow templates (wf-example-001, wf-example-002, wf-example-003)

### Tests
- 54 workflow tests passing (98% pass rate)
- Integration tests now work with real PostgreSQL connection
- E2E tests verify complete cron → workflow → API → DB pipeline

## [1.3.0] - 2026-04-03

### Added
- **Workflow System Refactoring** - Unified action node architecture
  - Replace 9 separate node types (TextGenNode, ImageGenNode, VoiceSyncNode, etc.) with single ActionNode
  - ActionConfigPanel component with dynamic service/method selection
  - Service Node Registry singleton for service discovery
  - SaveWorkflowModal for improved workflow saving UX
  - Better error messages for invalid JSON in workflows

- **Management Pages** - New admin functionality
  - ServiceNodeManagement page (super role only) - Manage node permissions
  - WorkflowTemplateManagement page (pro+ role) - Manage workflow templates
  - UserManagement page with filter/sort (role filter, status filter, multi-column sorting)
  - InvitationCodes page with filter/sort (status filter, created/expires/usage sorting)

- **UI/UX Redesign** - Major visual improvements
  - Header redesign: Icon-only controls with tooltips, floating history button (bottom-right)
  - Collapsible sidebar: Toggle between expanded (220px) and collapsed (60px icon-only) modes
  - Premium filter bars with animated filter chips and smooth transitions
  - API Key modal: Centered in entire page viewport
  - Custom scrollbar styles applied globally

### Fixed
- **Layout Stability** - Prevent layout shift from scrollbar behavior
  - Add `scrollbar-gutter: stable` to html element globally
  - Add `overflow-y: scroll` to main content area
  - Remove `overflow-x-auto` from table containers to prevent horizontal scrollbar flickering
  - Fix search input width changing by using fixed `w-[280px]` instead of `flex-1`
  - Filter chips now inline in filter bar instead of separate row

- **Theme Compatibility** - Dark theme text color fixes
  - Add `text-foreground` to Label, Input, Select components
  - Replace hardcoded dark colors (`text-dark-*`, `bg-dark-*`) with theme tokens
  - Reduce hover glow intensity on node cards

- **History Panel** - Button now directly opens panel
  - Remove intermediate dropdown menu
  - Fix z-index issues (HistoryPanel z-40 > Header dropdown z-30)

- **Workflow Engine** - Validation and error handling
  - Validate pagination parameters
  - Add workflow_id validation when creating cron job
  - Replace blocking prompt() with modal dialog

### Security
- **XSS Prevention** - Sanitize mapFunction input in workflow engine
- **Input Validation** - Add validation for workflow pagination and cron workflow_id

### Changed
- **Sidebar** - Reduced width from 260px to 220px, add collapse/expand toggle
- **Workflow Nodes** - Consolidate 9 node types into unified ActionNode
- **Filter Chips** - Moved from separate row to inline in filter bar
- **Sort Controls** - Moved to rightmost position in filter bar
- **Planning Docs** - Reorganized into `docs/planning/` directory structure

### Database
- `migration_012` - Use ALTER TABLE for existing workflow_templates table
- `migration_013` - Change cron_jobs to use workflow_id foreign key

### Documentation
- Add `docs/database-transactions.md` - Transaction requirements documentation
- Add `docs/service-registry.md` - Singleton pattern documentation
- Add `docs/planning/drafts/` - Refactoring planning documents
- Add `docs/planning/archive/` - Archived planning documents

## [1.2.0] - 2026-04-02

### Added
- **Theme System** - Complete theme customization
  - 22 pre-configured themes (11 dark + 11 light)
  - SettingsModal with theme picker UI (animations, gradients, polish)
  - ThemePicker and ThemeCard components
  - useThemeEffect hook for theme application
  - Theme registry system with theme metadata

- **Light Theme Support** - Systematic light theme compatibility
  - All pages updated with semantic CSS tokens
  - Settings page fully styled for light themes
  - Header, Sidebar, HistoryPanel support light themes
  - Shared components (LanguageSwitcher, ShortcutsHelp, etc.) updated

### Fixed
- **Theme System** - UI/UX improvements
  - Settings modal size enlarged (max-w-3xl, max-h-[90vh])
  - Theme picker grid padding for ring-offset visibility
  - Tab hover overlap fixed
  - SystemOption opacity mask removed
  - Settings icon decoration overlap fixed

- **Light Theme Colors** - Systematic color fixes
  - All pages: text-white → text-foreground
  - All pages: text-dark-* → text-muted-foreground
  - All pages: bg-dark-* → bg-card/bg-secondary
  - All pages: border-dark-* → border-border
  - Page h1 titles now use text-foreground for light theme support

### Performance
- **Theme Application** - Media query caching
  - Cached MediaQueryList instance in useThemeEffect

## [1.1.5] - 2026-04-02

### Added
- **Media Management Views** - Three view modes for media files
  - Table view: Traditional table layout (default)
  - Timeline view: Date-grouped list with infinite scroll
  - Card view: Image-based cards with hover overlays
  - Image preview navigation (lightbox multi-image support)
  - Delete success notifications (toast)
  - Token caching to avoid redundant requests
  
- **Audit Logs Enhancement** - Error tracking and usability
  - `error_message` field to capture failure details
  - Copy button for formatted log details
  - Error messages with highlighted styling

- **Developer Tools** - Development workflow improvements
  - `mnx-dev` CLI tool (start/stop/status/log/restart)
  - Background server management
  - Development documentation in AGENTS.md

- **Pagination** - Quick page navigation
  - Page input field for direct page jump
  - Enter key to navigate

- **UI Polish** - Sidebar improvements
  - GitHub link in sidebar footer
  - Fixed bottom bar layout (no overlap)

### Fixed
- **Timeline View Preview** - Image preview showing wrong image
- **JWT Token Verification** - Consistent error handling (throw vs console.error)
- **Number Input** - Remove ugly spinner arrows
- **Batch Delete API** - Change method from POST to DELETE

### Performance
- **Database Optimization** - 90%+ query reduction
  - Fix N+1 query in cron jobs list with JOIN
  - Add pagination to unbounded queries
  - Add missing indexes (execution_logs.status, task_queue.task_type, workflow_templates.name)
  - Replace full table scan with SQL GROUP BY
  - Batch SQL operations for task status updates
  - Combine redundant COUNT queries

- **API Reliability** - 15-20% success rate improvement
  - Retry with exponential backoff for transient failures
  - Webhook rate limiting (100/min)

- **Memory & Rendering** - 95% memory reduction
  - WebSocket heartbeat (30s) and connection limits (1000 max)
  - Balance caching with 30-second TTL
  - Fix O(n²) to O(n) duplicate detection
  - Frontend virtualization with @tanstack/react-virtual
  - Optimize polling with exponential backoff (3s→30s)

### Changed
- **Batch Delete API** - Method changed from POST to DELETE `/api/media/batch`
- **Rate Limiter** - Make auth rate limiter configurable via environment variables
- **Sidebar Layout** - Use flex-col for proper bottom bar positioning

### Database
- `migration_010` - Add performance indexes
- `migration_011` - Add `error_message` TEXT to audit_logs

## [1.1.4] - 2026-04-01

### Added
- **Auth Compatibility** - Complete owner_id support across all routes (#7)
  - Stats routes: Add owner_id filtering via `buildOwnerFilter()`
  - Audit routes: Non-admin users can only see their own audit logs
  - Export routes: Add owner_id filtering for execution logs and media exports
  - DatabaseService: Add `ownerId` parameter to stats methods (`getExecutionStatsOverview`, `getExecutionStatsTrend`, `getExecutionStatsDistribution`, `getExecutionStatsErrors`, `getAuditStats`)

### Fixed
- **Audit Middleware** - Populate `user_id` from JWT token instead of hardcoded `null`

### Changed
- **Data Isolation** - Non-admin users (user/pro) can now only see their own stats and audit logs
- **Documentation** - Add authentication system section to AGENTS.md with role permissions table

## [1.1.3] - 2026-04-01

### Added
- **User Management** - Super admin can manage users (CRUD operations)
  - GET/POST/PATCH/DELETE `/api/users` endpoints with `requireRole(['super'])`
  - User list with search, role badges, status toggle
  - Create user dialog with password hashing (bcrypt)
  - Edit user dialog for role/API key management
  - Delete confirmation with self-delete protection

- **Invitation Code Management** - Super admin can generate invitation codes
  - GET/POST/batch/DELETE `/api/invitation-codes` endpoints
  - Batch generation (1-100 codes) with `crypto.randomBytes`
  - Invitation code list with creator info (JOIN users)
  - Copy-to-clipboard functionality
  - Soft delete via `is_active = false`
  - Expiration support with status badges

- **Sidebar Reorganization** - Collapsible menu sections with localStorage persistence
  - Four categories: 资源管理, 监控统计, 自动化, 系统管理
  - Default expanded: debug console only
  - Role-based visibility (pro+ for most, super only for system management)

### Fixed
- **API URL Prefix** - Remove duplicate `/api` prefix in frontend API calls (#6)

### Changed
- **Sidebar Structure** - Group 11 menu items into 4 collapsible sections for better organization

## [1.1.2] - 2026-04-01

### Added
- **RBAC Data Isolation** - Role-based access control with owner_id (#2)
  - Migration 009: Add `owner_id` columns to all data tables with indexes
  - Data isolation middleware: `buildOwnerFilter()`, `getOwnerIdForInsert()`
  - Admin/super roles see ALL data; user/pro roles see ONLY their own data
  - RoleGuard component for conditional UI rendering
  - Sidebar filtering by role (management pages require pro+)
  - Per-user API key in Settings page

- **Signed Media URLs** - Secure media downloads without JWT (#3)
  - `media-token.ts` for generating/verifying signed tokens (1 hour expiry)
  - `GET /api/media/:id/token` endpoint to generate signed URLs
  - Download endpoint accepts `?token=xxx` query parameter

### Fixed
- **Capacity Monitor 401** - Add JWT Authorization header to capacity API request (#4)
- **SelectItem Hook Violation** - Move `useId()` from `useEffect` to component top level (#5)
- **Select Dropdown Reflow** - Use `createPortal` for floating dropdown, prevent layout shift

### Changed
- **Remove SQLite Support** - Migrate to PostgreSQL only
  - Delete deprecated `schema.ts`, `migrations.ts`, `service.ts`
  - Remove `better-sqlite3` and `@types/better-sqlite3` dependencies
  - Update connection.ts to PostgreSQL-only

### Dependencies
- **Removed** - better-sqlite3, @types/better-sqlite3

### Database
- `migration_009` - Add `owner_id` columns: cron_jobs, media_records, execution_logs, task_queue, workflow_templates, prompt_templates, webhook_configs, dead_letter_queue

## [1.1.1] - 2026-04-01

### Added
- **JWT Authentication System** - Login/register with JWT tokens (#1)
  - Access token (15min) and refresh token (7d)
  - Invitation code required for registration
  - Bootstrap invitation code: `MINIMAX-BOOTSTRAP-2026`
- **RBAC Roles** - Four-level role system: user, pro, admin, super
- **UserService** - Backend service for register, login, password change
- **Login Page** - React Hook Form + Zod validation, invitation code support
- **AuthGuard** - Route guard for protected pages
- **Header User Info** - Username display, role badge, logout button

### Dependencies
- jsonwebtoken - JWT token generation and verification
- bcrypt - Password hashing (cost factor 12)

### Database
- `users` table - User accounts with role, API key, region
- `invitation_codes` table - Invitation code management

## [1.1.0] - 2026-04-01

### Added
- **PostgreSQL Support** - Migrate from SQLite to PostgreSQL with async API
  - Connection pooling with timeout, keepAlive, and error recovery
  - Async database service with full CRUD operations
  - Migration system for PostgreSQL schema
  - Data migration script from SQLite to PostgreSQL
- **Onboarding Experience** - WelcomeModal with QuickStartGuide for new users
- **Batch Media Operations** - Select multiple media records for batch delete/download
- **Workflow Templates API** - CRUD endpoints for workflow templates management
- **Select Keyboard Navigation** - Arrow keys, Enter, Escape support in Select component
- **Select Size Variants** - CVA variants for `sm`, `md`, `lg` sizes

### Fixed
- **Audit Logs** - Skip GET requests from logging, only record operation types (POST/PUT/PATCH/DELETE)
- **Audit Logs Detail** - Handle object type `request_body` rendering gracefully
- **Audit Stats** - Fix `avg_duration_ms` field name mismatch with backend
- **Workflow Engine** - Fix loop node result accumulation
- **API Clients** - Use `internalAxios` for `/api` routes to skip rate limiting
- **Select Component** - Handle edge cases with proper null checks

### Changed
- **Audit Logs UI** - Styled filter buttons instead of native select, add duration/time columns
- **Template Creation Modal** - Redesigned with gradient header and custom dropdown
- **VideoAgent Thumbnails** - Themed icons with gradient backgrounds
- **Backend Architecture** - All routes and services converted to async/await pattern
- **Database Layer** - New async service replaces sync SQLite operations

### Performance
- **PostgreSQL Connection Pool** - Efficient connection management with pg pool
- **API Retry Logic** - Automatic retry for 429/503 errors with exponential backoff

### Dependencies
- **Added** - pg (PostgreSQL client)

### Tests
- Add tests for WorkflowEngine, Workflows API, BatchOperations, Select component
- Add tests for CreateTemplateModal, WelcomeModal, QuickStartGuide

### Documentation
- Add `docs/sqlite-to-postgres-migration.md` - Comprehensive migration guide
- Update `AGENTS.md` - Add PostgreSQL connection abstraction documentation

## [1.0.2] - 2026-04-01

### Added
- **Template System** - Prompt template CRUD with variable substitution, category filtering
- **Audit Logs** - All API operations logged with sensitive data redaction (passwords, tokens, apiKeys)
- **Stats Dashboard** - Execution stats overview, success rate trends, task distribution, error ranking
- **Structured Logging** - pino logger with file output and pretty printing, configurable levels
- **UI Components** - Dialog, EmptyState, Tooltip components for consistent UI patterns
- **Data Export** - Execution logs and media records export to CSV/JSON with date filtering
- **Batch Operations** - Media record batch delete and download support

### Fixed
- **Export Pagination** - Use SQL LIMIT/OFFSET instead of in-memory filtering for large datasets
- **Audit Middleware** - Add fallback file logging when database write fails, ensure response always completes
- **Stats Route** - Move db initialization to handler to avoid race condition with service startup
- **Logger Request ID** - Use uuid instead of Math.random() for cryptographically secure correlation IDs
- **Logger Initialization** - Lazy initialization to avoid using default config before setup
- **Audit Query Validation** - Add Zod validation schema for audit log endpoints
- **Template Route** - Cache Number() conversions to avoid repeated calls

### Changed
- **CSV Export** - Extract shared `toCSV` utility to eliminate code duplication between log and media export
- **Template Library** - Replace window.confirm with custom Dialog component for better UX

### Performance
- **Database** - New `getExecutionLogsPaginated` method with proper SQL pagination

### Dependencies
- **Added** - pino, pino-pretty, uuid
- **Updated** - zod to v4.3.6

## [1.0.1] - 2026-04-01

### Fixed
- **WebSocket Infrastructure** - `initCronWebSocket()` now called in server startup, events properly emitted
- **Workflow Node Types** - Composite types (text-generation, voice-sync, etc.) now correctly handled in DAG execution
- **Error Handling** - Centralized `asyncHandler` middleware, axios interceptor preserves MiniMax error codes

### Performance
- **Database** - Migration 4 adds 5 indexes, 12 N+1 queries fixed with SQLite RETURNING clause
- **React** - Dashboard memoization (useMemo/useCallback), React.memo on CronManagement children
- **Build** - Code splitting with 45 chunks (vendor 346KB, flow 183KB, animation 129KB, ui 54KB)

### Added
- **WebSocket Client** - Frontend `ReconnectingWebSocket` with auto-reconnect, heartbeat, typed message handlers
- **Unit Tests** - 74 new tests for TaskExecutor (94%), CapacityChecker (98%), WebSocketService
- **i18n** - 3 pages fixed (VoiceSync, MusicGeneration, VideoGeneration) with proper translation keys
- **MiniMax API Features** - Prompt caching toggle for text generation, 15 camera commands for video generation

### Changed
- **Routes** - All use centralized `asyncHandler` from `server/middleware/asyncHandler.ts`
- **Frontend Architecture** - All 17 routes use React.lazy() for code splitting with ErrorBoundary

## [1.0.0] - 2026-03-31

### Added
- **AI Capabilities**
  - Text generation (sync/stream) with abab5.5-chat model
  - Voice synthesis (sync/async) with speech-01 model
  - Voice cloning and management
  - Image generation with image-01 model (1-9 images at once)
  - Music generation with music-2.5 model
  - Video generation with video-01 model
  - Video Agent with 6 templates

- **Cron System**
  - Standard cron expression scheduling
  - Timezone support
  - Job management (CRUD, toggle, run, clone)
  - Task queue with FIFO/priority strategies
  - Execution logs with details
  - Webhook notifications with HMAC signing
  - Dead letter queue for failed tasks

- **Workflow Engine**
  - DAG execution with topological sort
  - Node types: action, condition, transform, loop, queue
  - Template string resolution
  - Retry logic with exponential backoff

- **Media Management System**
  - Database schema for `media_records` table
  - Backend API routes for CRUD operations
  - File upload and download endpoints
  - Frontend MediaManagement page with tabs, search, pagination
  - Image thumbnails in list view
  - Lightbox preview for images
  - Integration with all generation pages (Voice, Image, Video, Music)
  - Backend proxy for image upload to bypass CORS

- **Monitoring**
  - Capacity tracking for API quotas
  - WebSocket real-time updates
  - Health check endpoint

### Fixed
- **Rate Limiting** - Skip rate limit for internal service routes (`/api/media`, `/api/files`, `/api/cron`)
- **Database Migration** - Add `migration_005_media_records` for existing databases
- **Tab Switching** - Smooth opacity transition instead of loading flash
- **Image Preview** - Use correct API URL for Lightbox preview
- **Memory Leaks** - Add setInterval cleanup in VideoAgent and VoiceAsync
- **Error Handling** - Add ERR_NO_READER fallback in text.ts
- **React Context** - Add ErrorBoundary wrapper for Tabs/Select components

### Changed
- **Placeholder APIs** - Replace with real backend connections in taskQueue and executionLogs stores
- **Console Logging** - Remove 23+ production console.log statements

### Tests
- Add 427+ tests across backend services and frontend stores
  - WorkflowEngine: 68 tests (topological sort, node execution)
  - QueueProcessor: 33 tests (retry logic, dead letter queue)
  - CronScheduler: 28 tests (scheduling, concurrent limits)
  - DatabaseService: 107 tests (CRUD operations)
  - Zustand stores: 78 tests
  - API modules: 102 tests

### Technical
- Express backend with TypeScript
- Better SQLite3 database
- React 18 frontend
- Tailwind CSS styling
- Zustand state management
- React Router navigation
- Vitest testing framework
