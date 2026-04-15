# MiniMax AI Toolset 功能增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 MiniMax AI API 工具集添加 7 个核心功能增强，提升用户体验和系统可维护性

**Architecture:** 
- 后端遵循现有 Express + better-sqlite3 架构，使用迁移系统扩展数据库
- 前端使用 React + Zustand 状态管理，遵循 shadcn/ui 组件风格
- 每个功能独立实现，但共享基础设施（UI组件库、导出服务、日志系统）

**Tech Stack:** Express, TypeScript, better-sqlite3, React 18, Zustand, Tailwind CSS, pino, Recharts

---

## 功能 1：模板系统（高优先级）

### 技术方案
- 后端：创建 `prompt_templates` 数据库表，提供 CRUD API 端点
- 前端：保留现有本地存储作为"个人收藏"，新增全局模板库功能
- 支持变量插值：使用 `{{variable}}` 语法，前端提供变量替换 UI

### 任务分解

#### 后端任务
1. **创建数据库迁移** - 文件: `server/database/migrations.ts`
   - 添加 migration_006_prompt_templates
   - 创建 prompt_templates 表（id, name, content, category, variables_json, is_public, created_by, created_at, updated_at）
   - 创建 template_tags 表用于分类

2. **扩展数据库类型定义** - 文件: `server/database/types.ts`
   - 定义 PromptTemplate, TemplateTag 接口
   - 定义 CreatePromptTemplate, UpdatePromptTemplate DTO
   - 定义 TemplateCategory 枚举（text, image, music, video）

3. **扩展数据库服务层** - 文件: `server/database/service.ts`
   - 实现 getPromptTemplates(filters) 查询方法
   - 实现 getPromptTemplateById(id) 获取单条
   - 实现 createPromptTemplate(data) 创建方法
   - 实现 updatePromptTemplate(id, data) 更新方法
   - 实现 deletePromptTemplate(id) 删除方法
   - 实现 searchTemplates(query) 搜索方法

4. **创建验证 Schema** - 文件: `server/validation/template-schemas.ts`
   - 定义 createTemplateSchema（name必填、content必填、category枚举）
   - 定义 updateTemplateSchema
   - 定义 listTemplatesQuerySchema
   - 定义 templateIdParamsSchema

5. **创建模板路由** - 文件: `server/routes/templates.ts`
   - GET /templates - 列表查询（支持分类、搜索、公开/私有筛选）
   - GET /templates/:id - 获取单条
   - POST /templates - 创建模板
   - PUT /templates/:id - 更新模板
   - DELETE /templates/:id - 删除模板
   - POST /templates/:id/clone - 克隆模板（复制到个人收藏）

6. **注册路由到主应用** - 文件: `server/index.ts`
   - 添加 app.use('/api/templates', templatesRouter)

7. **编写后端测试** - 文件: `server/routes/__tests__/templates.test.ts`
   - 测试 CRUD 操作
   - 测试搜索功能
   - 测试克隆功能

#### 前端任务
1. **创建模板状态管理** - 文件: `src/stores/templates.ts`
   - 定义 PromptTemplate 接口（与后端一致）
   - 定义 TemplatesState（templates, isLoading, filters）
   - 实现 fetchTemplates(), createTemplate(), updateTemplate(), deleteTemplate() 方法
   - 实现本地缓存，避免重复请求

2. **创建 API 客户端** - 文件: `src/lib/api/templates.ts`
   - 实现 listTemplates(params)
   - 实现 getTemplate(id)
   - 实现 createTemplate(data)
   - 实现 updateTemplate(id, data)
   - 实现 deleteTemplate(id)
   - 实现 cloneTemplate(id)

3. **创建模板列表页面** - 文件: `src/pages/TemplateLibrary.tsx`
   - 展示全局模板列表（卡片式布局）
   - 支持分类筛选（tabs）
   - 支持搜索功能
   - 支持克隆到本地收藏
   - 显示变量列表和预览

4. **创建模板编辑器组件** - 文件: `src/components/templates/TemplateEditor.tsx`
   - 模板名称、内容输入
   - 分类选择（dropdown）
   - 变量提取和配置（自动识别 {{var}}）
   - 公开/私有切换

5. **创建模板预览组件** - 文件: `src/components/templates/TemplatePreview.tsx`
   - 显示模板内容
   - 变量高亮显示
   - 变量值输入（实时替换预览）
   - 应用到生成页面的按钮

6. **创建变量插值工具** - 文件: `src/lib/template-utils.ts`
   - 实现 extractVariables(content) 提取 {{var}} 变量
   - 实现 interpolateTemplate(content, variables) 替换变量
   - 实现 validateVariables(content, values) 验证变量完整性

7. **增强现有生成页面** - 文件: `src/pages/TextGeneration.tsx`, `ImageGeneration.tsx` 等
   - 添加模板选择按钮（弹出模板预览）
   - 点击模板后自动填充到输入框
   - 支持变量快速替换

8. **添加路由配置** - 文件: `src/App.tsx` 或路由配置文件
   - 添加 /templates 路径

9. **添加导航菜单项** - 文件: `src/components/layout/Sidebar.tsx`
   - 添加"模板库"菜单项

10. **编写前端测试** - 文件: `src/components/templates/__tests__/TemplateEditor.test.tsx`
    - 测试变量提取
    - 测试变量替换
    - 测试模板 CRUD

#### 数据库任务
1. **执行迁移** - 自动通过重启服务器触发
   - 确认 prompt_templates 表创建成功
   - 确认索引创建成功

### 依赖关系
- 独立功能，无其他功能依赖
- UI组件缺口功能（Modal）可提升用户体验，但非必须

### 预估工作量
- 后端: 4小时
- 前端: 6小时
- 数据库: 0.5小时
- **总计: 10.5小时**

---

## 功能 2：媒体批量操作（高优先级）

### 技术方案
- 后端：参考现有 cron bulk 操作模式，添加批量删除、批量下载、批量标签 API
- 前端：实现多选 UI（checkbox），批量操作按钮组，批量下载使用 JSZip 打包
- 已有基础：`batchDeleteSchema` 已定义但未使用

### 任务分解

#### 后端任务
1. **扩展数据库服务层** - 文件: `server/database/service.ts`
   - 实现 batchSoftDeleteMediaRecords(ids[]) 批量软删除
   - 实现 batchGetMediaRecords(ids[]) 批量获取记录
   - 实现 batchAddTags(ids[], tag) 批量添加标签（依赖功能3）

2. **扩展验证 Schema** - 文件: `server/validation/media-schemas.ts`
   - 已有 batchDeleteSchema，确认可用
   - 新增 batchDownloadSchema = z.object({ ids: z.array(z.string()).min(1).max(100) })
   - 新增 batchTagSchema = z.object({ ids: z.array(z.string()).min(1).max(100), tag: z.string() })

3. **添加批量删除路由** - 文件: `server/routes/media.ts`
   - POST /media/batch/delete - 批量软删除
   - 返回 { success: true, data: { deleted: count } }

4. **添加批量下载路由** - 文件: `server/routes/media.ts`
   - POST /media/batch/download - 批量下载打包
   - 使用 archiver 库打包为 ZIP
   - 返回 ZIP 文件流

5. **添加批量标签路由** - 文件: `server/routes/media.ts`（依赖功能3）
   - POST /media/batch/tag - 批量添加标签
   - 返回 { success: true, data: { tagged: count } }

6. **安装依赖库** - 命令: `npm install archiver`
   - 用于 ZIP 打包

7. **编写后端测试** - 文件: `server/routes/__tests__/media-batch.test.ts`
   - 测试批量删除
   - 测试批量下载
   - 测试批量标签

#### 前端任务
1. **添加多选状态管理** - 文件: `src/pages/MediaManagement.tsx`
   - 添加 selectedIds: string[] 状态
   - 添加 isSelected(id) 判断方法
   - 添加 toggleSelect(id) 方法
   - 添加 selectAll() 方法
   - 添加 clearSelection() 方法

2. **添加复选框列** - 文件: `src/pages/MediaManagement.tsx`
   - 表头添加全选复选框
   - 每行添加复选框
   - 使用现有 Input 组件或创建 Checkbox 组件

3. **创建批量操作按钮组** - 文件: `src/pages/MediaManagement.tsx`
   - 显示位置：表头上方或底部固定栏
   - 显示选中数量统计
   - 批量删除按钮（带确认对话框）
   - 批量下载按钮（显示下载进度）
   - 批量标签按钮（依赖功能3）

4. **实现批量删除逻辑** - 文件: `src/pages/MediaManagement.tsx`
   - 调用 API: POST /api/media/batch/delete
   - 显示确认对话框（"确定删除 X 个文件？"）
   - 删除成功后清除选中状态

5. **实现批量下载逻辑** - 文件: `src/pages/MediaManagement.tsx`
   - 调用 API: POST /api/media/batch/download
   - 显示下载进度提示
   - 自动触发浏览器下载 ZIP 文件

6. **创建批量确认对话框** - 文件: `src/components/shared/BatchConfirmDialog.tsx`
   - 显示操作类型（删除/下载/标签）
   - 显示选中数量
   - 确认/取消按钮

7. **优化表格 UI** - 文件: `src/pages/MediaManagement.tsx`
   - 选中行高亮显示
   - 批量操作栏固定在底部
   - 选中状态持久化（切换分页时清除）

8. **编写前端测试** - 文件: `src/pages/__tests__/MediaManagement-batch.test.tsx`
   - 测试多选逻辑
   - 测试批量删除
   - 测试批量下载

#### 数据库任务
- 无需新增表，依赖功能3的标签表

### 依赖关系
- 批量标签依赖功能3（媒体标签系统）
- 批量下载依赖 archiver 库安装
- 可先实现批量删除（无依赖），后实现批量下载和标签

### 预估工作量
- 后端: 2.5小时（批量删除1h + 批量下载1.5h）
- 前端: 4小时
- 数据库: 0小时
- **总计: 6.5小时**

---

## 功能 3：执行统计仪表板（高优先级）

### 技术方案
- 后端：基于 execution_logs 表，提供聚合统计 API（成功率、耗时分布、任务分布、费用）
- 前端：使用 Recharts 库绘制趋势图、饼图、柱状图
- 额外：可能需要 MiniMax API 费用计算逻辑

### 任务分解

#### 后端任务
1. **扩展数据库服务层** - 文件: `server/database/service.ts`
   - 实现 getExecutionStats(params) 聚合统计方法
     - 时间范围筛选
     - 成功/失败率计算
     - 平均耗时计算
   - 实现 getExecutionTrend(params) 趋势数据方法
     - 按天/周/月分组
     - 返回时间序列数据
   - 实现 getTaskTypeDistribution() 任务类型分布方法
   - 实现 getTopErrors() 错误排行榜方法

2. **创建统计路由** - 文件: `server/routes/stats.ts`
   - GET /stats/overview - 总览统计（成功率、总任务数、平均耗时）
   - GET /stats/trend - 趋势数据（按时间分组）
   - GET /stats/distribution - 任务类型分布
   - GET /stats/errors - 错误统计
   - GET /stats/cost - 费用统计（需 MiniMax API 费率）

3. **编写后端测试** - 文件: `server/routes/__tests__/stats.test.ts`
   - 测试聚合查询
   - 测试趋势计算
   - 测试分布统计

#### 前端任务
1. **安装图表库** - 命令: `npm install recharts`
   - 用于数据可视化

2. **创建统计状态管理** - 文件: `src/stores/stats.ts`
   - 定义 StatsState（overview, trend, distribution, isLoading）
   - 实现 fetchOverview(), fetchTrend(), fetchDistribution() 方法

3. **创建 API 客户端** - 文件: `src/lib/api/stats.ts`
   - 实现 getOverview()
   - 实现 getTrend(params)
   - 实现 getDistribution()
   - 实现 getErrors()
   - 实现 getCost()

4. **创建统计仪表板页面** - 文件: `src/pages/StatsDashboard.tsx`
   - 页面标题：执行统计
   - 时间范围选择器（今日/本周/本月/自定义）
   - 四个统计卡片（成功率、总任务数、平均耗时、总费用）

5. **创建成功率趋势图组件** - 文件: `src/components/stats/SuccessRateChart.tsx`
   - 使用 Recharts LineChart
   - 显示成功率和失败率双线
   - X轴：时间，Y轴：百分比

6. **创建任务类型分布图组件** - 文件: `src/components/stats/TaskTypeChart.tsx`
   - 使用 Recharts PieChart
   - 显示 text/voice/image/music/video 分布
   - 显示数量和百分比

7. **创建耗时分布图组件** - 文件: `src/components/stats/DurationChart.tsx`
   - 使用 Recharts BarChart
   - 显示耗时区间分布（0-1s, 1-5s, 5-30s, >30s）

8. **创建错误排行榜组件** - 文件: `src/components/stats/ErrorRanking.tsx`
   - 显示 Top 10 错误类型
   - 显示错误次数和占比

9. **创建费用追踪组件** - 文件: `src/components/stats/CostTracker.tsx`
   - 显示费用趋势图
   - 显示费用明细表（按任务类型）

10. **添加路由配置** - 文件: `src/App.tsx`
    - 添加 /stats 路径

11. **添加导航菜单项** - 文件: `src/components/layout/Sidebar.tsx`
    - 添加"执行统计"菜单项

12. **编写前端测试** - 文件: `src/pages/__tests__/StatsDashboard.test.tsx`
    - 测试数据加载
    - 测试图表渲染

#### 数据库任务
- 无需新增表，使用现有 execution_logs 和 execution_log_details 表

### 依赖关系
- 独立功能
- 费用统计需要 MiniMax API 费率配置（可能需要在 Settings 页面添加）

### 预估工作量
- 后端: 3小时
- 前端: 5小时
- 数据库: 0小时
- **总计: 8小时**

---

## 功能 4：UI 组件缺口（中优先级）

### 技术方案
- 基于 shadcn/ui 风格，补充缺失的核心组件
- 使用 CVA 处理变体，保持与现有 Button.tsx 一致的设计模式
- 组件：Modal/Dialog、Tooltip、DropdownMenu、Empty State

### 任务分解

#### 后端任务
- 无后端任务

#### 前端任务
1. **创建 Dialog 组件** - 文件: `src/components/ui/Dialog.tsx`
   - 使用 CVA 定义变体（default, destructive）
   - DialogOverlay（背景遮罩）
   - DialogContent（内容容器）
   - DialogHeader, DialogTitle, DialogDescription
   - DialogFooter（底部按钮区）
   - 支持动画过渡（fade in/out）

2. **创建 Dialog 测试** - 文件: `src/components/ui/Dialog.test.tsx`
   - 测试打开/关闭
   - 测试确认/取消回调

3. **创建 Tooltip 组件** - 文件: `src/components/ui/Tooltip.tsx`
   - TooltipProvider, TooltipRoot
   - TooltipTrigger, TooltipContent
   - 支持 placement（top, bottom, left, right）
   - 支持延迟显示（delayShow, delayHide）

4. **创建 Tooltip 测试** - 文件: `src/components/ui/Tooltip.test.tsx`
   - 测试显示/隐藏
   - 测试位置

5. **创建 DropdownMenu 组件** - 文件: `src/components/ui/DropdownMenu.tsx`
   - DropdownMenuTrigger
   - DropdownMenuContent
   - DropdownMenuItem
   - DropdownMenuSeparator
   - DropdownMenuLabel
   - 支持键盘导航（Arrow Up/Down, Enter, Esc）

6. **创建 DropdownMenu 测试** - 文件: `src/components/ui/DropdownMenu.test.tsx`
   - 测试打开/关闭
   - 测试菜单项点击
   - 测试键盘导航

7. **创建 Empty State 组件** - 文件: `src/components/ui/EmptyState.tsx`
   - 图标区域（支持自定义图标）
   - 标题和描述文本
   - 操作按钮区域（可选）
   - 使用 CVA 定义变体（default, compact）

8. **创建 Empty State 测试** - 文件: `src/components/ui/EmptyState.test.tsx`
   - 测试渲染
   - 测试按钮点击

9. **重构现有删除确认对话框** - 文件: `src/pages/MediaManagement.tsx`
   - 替换现有 DeleteConfirmDialog 为新 Dialog 组件
   - 提升代码复用性

10. **添加 Tooltip 到按钮** - 文件: `src/pages/MediaManagement.tsx` 等页面
    - 为操作按钮添加 Tooltip 提示（删除、下载、预览等）
    - 替换现有 title 属性

11. **使用 Empty State** - 文件: `src/pages/MediaManagement.tsx` 等页面
    - 替换现有空状态提示文本为新 EmptyState 组件
    - 提升视觉一致性

### 依赖关系
- 无依赖，可独立实现
- 后续功能（模板系统、批量操作）可使用这些组件提升体验

### 预估工作量
- 前端: 6小时（Dialog 1.5h + Tooltip 1h + DropdownMenu 2h + EmptyState 0.5h + 重构 1h）
- **总计: 6小时**

---

## 功能 5：数据导出（中优先级）

### 技术方案
- 后端：创建通用导出服务，支持 CSV 和 JSON 格式
- 前端：提供导出按钮，支持格式选择、字段选择
- 导出范围：执行日志、媒体记录、任务配置

### 任务分解

#### 后端任务
1. **创建导出服务** - 文件: `server/services/export-service.ts`
   - 实现 exportToCSV(data, fields) CSV 格式化
   - 实现 exportToJSON(data) JSON 格式化
   - 实现 streamExport(data, format, res) 流式输出
   - 字段映射和转换逻辑

2. **创建导出路由** - 文件: `server/routes/export.ts`
   - POST /export/execution-logs - 导出执行日志
     - 参数：format(csv/json), startDate, endDate, fields[]
   - POST /export/media-records - 导出媒体记录
     - 参数：format, type, source, fields[]
   - POST /export/cron-jobs - 导出任务配置
     - 参数：format, fields[]
   - 返回文件流，自动触发浏览器下载

3. **扩展验证 Schema** - 文件: `server/validation/export-schemas.ts`
   - 定义 exportFormatSchema = z.enum(['csv', 'json'])
   - 定义 exportExecutionLogsSchema
   - 定义 exportMediaRecordsSchema
   - 定义 exportCronJobsSchema

4. **注册导出路由** - 文件: `server/index.ts`
   - 添加 app.use('/api/export', exportRouter)

5. **编写后端测试** - 文件: `server/services/__tests__/export-service.test.ts`
   - 测试 CSV 格式化
   - 测试 JSON 格式化
   - 测试流式输出

#### 前端任务
1. **创建导出配置对话框** - 文件: `src/components/shared/ExportDialog.tsx`
   - 格式选择（CSV/JSON）
   - 字段选择（复选框列表）
   - 时间范围选择（日历组件）
   - 导出按钮
   - 显示导出进度提示

2. **创建导出 API 客户端** - 文件: `src/lib/api/export.ts`
   - 实现 exportExecutionLogs(params)
   - 实现 exportMediaRecords(params)
   - 实现 exportCronJobs(params)
   - 处理文件下载响应

3. **添加导出按钮到执行日志页面** - 文件: `src/pages/CronManagement.tsx` 或相关日志页面
   - 顶部工具栏添加"导出"按钮
   - 点击打开 ExportDialog

4. **添加导出按钮到媒体管理页面** - 文件: `src/pages/MediaManagement.tsx`
   - 顶部工具栏添加"导出"按钮
   - 支持导出当前筛选结果

5. **添加导出按钮到任务管理页面** - 文件: `src/pages/CronManagement.tsx`
   - 任务列表页面添加"导出配置"按钮

6. **编写前端测试** - 文件: `src/components/shared/__tests__/ExportDialog.test.tsx`
   - 测试字段选择
   - 测试导出触发

#### 数据库任务
- 无需新增表，使用现有数据查询

### 依赖关系
- 依赖功能4（Dialog 组件）用于导出配置对话框
- 可使用现有数据，无需额外迁移

### 预估工作量
- 后端: 2.5小时
- 前端: 3小时
- 数据库: 0小时
- **总计: 5.5小时**

---

## 功能 6：结构化日志（中优先级）

### 技术方案
- 引入 pino 日志库，替换散落的 console.log
- 配置日志级别（debug, info, warn, error）
- 支持文件输出和 stdout
- 创建日志中间件记录 HTTP 请求

### 任务分解

#### 后端任务
1. **安装 pino 日志库** - 命令: `npm install pino pino-pretty`
   - pino: 核心日志库
   - pino-pretty: 开发环境美化输出

2. **创建日志配置** - 文件: `server/lib/logger.ts`
   - 创建 logger 实例
   - 配置日志级别（从环境变量读取）
   - 配置输出目标（开发环境 stdout + pretty，生产环境文件）
   - 定义日志格式（timestamp, level, message, context）

3. **替换 console.log** - 文件: 所有 server 文件
   - server/services/*.ts - 替换 console.log 为 logger.info
   - server/routes/*.ts - 替换 console.error 为 logger.error
   - server/database/*.ts - 替换 console.log 为 logger.debug
   - 添加结构化上下文（service, method, params）

4. **创建 HTTP 日志中间件** - 文件: `server/middleware/logger-middleware.ts`
   - 记录请求方法、路径、参数
   - 记录响应状态码、耗时
   - 记录错误信息（如果失败）

5. **注册日志中间件** - 文件: `server/index.ts`
   - 在所有路由前添加 loggerMiddleware

6. **创建日志文件配置** - 文件: `.env` 和 `server/config.ts`
   - LOG_LEVEL=info（默认）
   - LOG_FILE=./logs/app.log（生产环境）
   - LOG_MAX_SIZE=10m（文件大小限制）
   - LOG_MAX_FILES=5（文件数量限制）

7. **创建日志目录** - 命令: `mkdir -p logs`
   - 生产环境日志存储目录

8. **编写日志测试** - 文件: `server/lib/__tests__/logger.test.ts`
   - 测试日志级别
   - 测试日志输出格式

#### 前端任务
- 无前端任务（后端基础设施）

#### 数据库任务
- 无需新增表

### 依赖关系
- 无依赖，基础设施功能
- 后续审计日志功能可复用 logger

### 预估工作量
- 后端: 3小时
- 前端: 0小时
- 数据库: 0小时
- **总计: 3小时**

---

## 功能 7：审计日志（低优先级）

### 技术方案
- 创建 audit_logs 表记录用户操作
- 后端：审计中间件，自动记录 CRUD 操作
- 前端：审计日志查询页面（管理员可见）

### 任务分解

#### 后端任务
1. **创建数据库迁移** - 文件: `server/database/migrations.ts`
   - 添加 migration_007_audit_logs
   - 创建 audit_logs 表（id, user_id, action, resource_type, resource_id, details_json, ip_address, user_agent, created_at）
   - 创建索引 idx_audit_logs_user_id, idx_audit_logs_created_at

2. **扩展数据库类型定义** - 文件: `server/database/types.ts`
   - 定义 AuditLog 接口
   - 定义 AuditAction 枚举（create, update, delete, execute, export）
   - 定义 CreateAuditLog DTO

3. **扩展数据库服务层** - 文件: `server/database/service.ts`
   - 实现 createAuditLog(data) 创建方法
   - 实现 getAuditLogs(filters) 查询方法
   - 实现 getUserAuditLogs(userId) 用户操作历史

4. **创建审计中间件** - 文件: `server/middleware/audit-middleware.ts`
   - 拦截 POST/PUT/DELETE 请求
   - 自动提取操作信息（action, resource）
   - 提取用户信息（IP, User-Agent）
   - 写入 audit_logs 表
   - 异步执行，不影响主流程性能

5. **注册审计中间件** - 文件: `server/index.ts`
   - 在路由后添加 auditMiddleware（避免健康检查等噪音）

6. **创建审计日志路由** - 文件: `server/routes/audit.ts`
   - GET /audit/logs - 查询审计日志（管理员权限）
   - GET /audit/logs/:id - 获取单条详情
   - GET /audit/user/:userId - 用户操作历史

7. **编写后端测试** - 文件: `server/middleware/__tests__/audit-middleware.test.ts`
   - 测试自动记录
   - 测试查询功能

#### 前端任务
1. **创建审计日志状态管理** - 文件: `src/stores/audit.ts`
   - 定义 AuditLogState
   - 实现 fetchAuditLogs() 方法

2. **创建审计日志 API 客户端** - 文件: `src/lib/api/audit.ts`
   - 实现 getAuditLogs(params)
   - 实现 getAuditLogDetails(id)
   - 实现 getUserAuditLogs(userId)

3. **创建审计日志查询页面** - 文件: `src/pages/AuditLogs.tsx`
   - 时间范围筛选
   - 操作类型筛选
   - 用户筛选
   - 资源类型筛选
   - 表格展示（时间、用户、操作、资源、详情）

4. **创建审计详情对话框** - 文件: `src/components/audit/AuditDetailDialog.tsx`
   - 显示完整操作详情
   - 显示 IP 地址和 User-Agent

5. **添加路由配置** - 文件: `src/App.tsx`
   - 添加 /audit 路径（管理员路由）

6. **添加导航菜单项** - 文件: `src/components/layout/Sidebar.tsx`
   - 添加"审计日志"菜单项（管理员可见）

7. **编写前端测试** - 文件: `src/pages/__tests__/AuditLogs.test.tsx`
   - 测试列表加载
   - 测试筛选功能

#### 数据库任务
1. **执行迁移** - 自动通过重启服务器触发
   - 确认 audit_logs 表创建成功

### 依赖关系
- 依赖功能6（结构化日志）的 logger
- 依赖功能4（Dialog 组件）用于详情对话框

### 预估工作量
- 后端: 3小时
- 前端: 2.5小时
- 数据库: 0.5小时
- **总计: 6小时**

---

## 实现顺序与并行机会

### 第一阶段：基础设施（可并行）
- **功能6：结构化日志** - 独立实现，无依赖
- **功能4：UI组件缺口** - 独立实现，无依赖

**并行策略：** 可同时开发，功能6专注后端，功能4专注前端

### 第二阶段：核心功能（部分并行）
- **功能1：模板系统** - 独立实现，可使用功能4的 Dialog
- **功能2：媒体批量操作** - 批量删除无依赖，批量下载和标签有依赖

**并行策略：** 功能1和功能2的批量删除部分可并行开发

### 第三阶段：数据与监控（部分并行）
- **功能3：执行统计仪表板** - 独立实现
- **功能5：数据导出** - 依赖功能4的 Dialog

**并行策略：** 功能3可独立开发，功能5需等待功能4完成

### 第四阶段：审计（最后）
- **功能7：审计日志** - 依赖功能6和功能4

---

## 总工作量评估

| 功能 | 后端 | 前端 | 数据库 | 总计 |
|------|------|------|--------|------|
| 1. 模板系统 | 4h | 6h | 0.5h | 10.5h |
| 2. 媒体批量操作 | 2.5h | 4h | 0h | 6.5h |
| 3. 执行统计仪表板 | 3h | 5h | 0h | 8h |
| 4. UI组件缺口 | 0h | 6h | 0h | 6h |
| 5. 数据导出 | 2.5h | 3h | 0h | 5.5h |
| 6. 结构化日志 | 3h | 0h | 0h | 3h |
| 7. 审计日志 | 3h | 2.5h | 0.5h | 6h |
| **总计** | **18h** | **26.5h** | **1h** | **45.5h** |

**建议团队配置：**
- 1个后端开发：18小时 ≈ 2.5天
- 1个前端开发：26.5小时 ≈ 3.5天
- 总开发周期：约 1周（考虑并行和依赖）

---

## 风险与注意事项

1. **数据库迁移风险**
   - 所有迁移需在测试环境验证
   - 生产部署需备份现有数据库

2. **API 限流考虑**
   - 批量操作可能触发 MiniMax API 限流
   - 建议添加速率控制机制

3. **费用统计准确性**
   - MiniMax API 费率可能变动
   - 建议在 Settings 页面提供费率配置入口

4. **日志性能影响**
   - 结构化日志可能影响性能
   - 建议生产环境使用异步日志写入

5. **审计日志存储**
   - 高频操作可能产生大量审计记录
   - 建议添加定期清理机制（保留90天）

---

## 验收标准

### 功能1：模板系统
- 用户可创建、编辑、删除模板
- 支持变量插值并正确替换
- 模板可在生成页面快速应用

### 功能2：媒体批量操作
- 支持多选和全选
- 批量删除成功且数据一致
- 批量下载打包完整文件

### 功能3：执行统计仪表板
- 统计数据准确（与数据库一致）
- 图表正确渲染且响应式
- 时间范围筛选有效

### 功能4：UI组件缺口
- 所有组件遵循 shadcn/ui 风格
- Dialog 支持动画过渡
- Tooltip 位置正确
- DropdownMenu 支持键盘导航

### 功能5：数据导出
- CSV 格式正确（Excel 可打开）
- JSON 格式正确（可解析）
- 导出文件完整下载

### 功能6：结构化日志
- 所有 console.log 已替换
- 日志级别正确分类
- 生产环境日志写入文件

### 功能7：审计日志
- CRUD 操作自动记录
- 审计数据完整（包含 IP、User-Agent）
- 查询页面正确展示

---

**Plan complete and saved to `docs/plans/2026-04-01-feature-enhancements.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach would you like to use?**