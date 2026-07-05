# Requirement Pools

> 需求池 - 按日期收集所有需求

---

## ID 编号规则

> 需求 ID 采用 `R-XXX` 格式，数字连续递增。

**编号原则**:
- 新需求使用当前最大 ID + 1
- 删除的需求 ID 直接移除，不保留空号
- ID 连续编号，便于追踪和引用

**当前 ID 范围**: R-001 ~ R-025（共 25 个需求）

---

## 2026-04-14

**汇总**: 12 个需求 | 已完成: 0 | 待办: 12

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| R-001 | 公告管理 | Admin | P3 | v2.7 | 待办 |
| R-002 | 资源管理完善 | Admin | P3 | v2.3 | 已完成 |
| R-003 | 云端备份 | Data | P1 | v2.8 | 待办 |
| R-004 | 审计日志补充 | Security | P1 | v2.1 | 待办 |
| R-005 | Dashboard 运营总览 | UX | P2 | v3.2 | 待办 |
| R-006 | 工作流/DLQ 投产验证 | QA | P1 | v4.0 | 待办 |
| R-007 | 性能优化 | Performance | P4 | v3.1 | 待办 |
| R-008 | 前端环境分离 | DevOps | P4 | v2.0 | 待办 |
| R-009 | 请求回放与参数复用 | UX | P2 | v2.6 | 已完成 |
| R-010 | 新手引导 Tour | UX | P2 | v3.5 | 待办 |
| R-011 | 帮助中心 | UX | P2 | v3.4 | 待办 |
| R-012 | 移动端适配 | UX | P4 | v3.0 | 部分完成 |

### R-001 - 公告管理
- **描述**: 应用公告发布、公告管理界面，支持系统级通知推送
- **现状**: 无公告功能
- **范围**: `server/routes/admin/announcements.ts` + `src/pages/Admin/Announcements.tsx`

### R-002 - 资源管理完善
- **描述**: 素材管理增强、素材使用统计、模板管理重构
- **现状**: v2.3.x 系列收口完成 — Prompt 列表查询 API（v2.3.1）、媒体管理增强、测试隔离性修复（v2.3.2）
- **范围**: `server/routes/media.ts` 统计 API + `src/pages/MediaManagement.tsx` 统计面板 + `server/routes/prompts.ts` 查询端点

### R-003 - 云端备份
- **描述**: media 数据云端备份，扩展本地快照脚本到 Backblaze B2/Cloudflare R2
- **现状**: 有 `scripts/media-snapshot-backup.sh` 本地脚本
- **范围**: 扩展脚本 + `server/services/backup-service.ts`

### R-004 - 审计日志补充
- **描述**: 添加更多上下文信息（API 响应时间、完整请求参数等）
- **现状**: 审计日志基础字段，缺少响应时间和完整参数
- **范围**: `server/middleware/audit-middleware.ts` + `server/database/schema.ts` 字段扩展

### R-005 - Dashboard 运营总览
- **描述**: 将首页从快捷入口升级为运营总览，展示 API 使用量、配额状态、失败率、平均耗时、最近失败任务、DLQ 摘要、容量风险、系统健康状态和常用操作入口
- **现状**: 有 `Dashboard.tsx`，包含欢迎弹窗、快捷入口、本地 usage/history 与 WebSocket recent activity，但缺少真实后端统计、失败摘要、容量风险和系统健康聚合
- **范围**: `src/pages/Dashboard.tsx` 重构 + `server/routes/stats.ts` 统计 API 扩展 + Cron/Workflow/DLQ/Capacity 摘要接口

### R-006 - 工作流/DLQ 投产验证
- **描述**: 验证工作流引擎、定时任务、死信队列实际可用，编写使用文档
- **现状**: 功能实现但未经验证
- **范围**: 测试用例 + 使用文档 + 生产环境验证 checklist

### R-007 - 性能优化
- **描述**: 下载上传改异步/WebSocket、后端性能优化、数据库索引/查询优化
- **现状**: 上传下载同步阻塞
- **范围**: `server/routes/media.ts` + 数据库索引优化 + 前端懒加载

### R-008 - 前端环境分离
- **描述**: dev/生产环境分离，Feature flags 支持
- **现状**: 无环境分离
- **范围**: `vite.config.ts` + 环境变量配置 + feature flags 服务

### R-009 - 请求回放与参数复用
- **描述**: 从审计日志安全回放允许的请求；从生成历史一键恢复 prompt、模型、尺寸、风格、音色等参数，支持微调后重新生成
- **现状**: 已完成。v2.6.0 新增 `history-replay.ts` 提供标准参数快照基础设施；HistoryPanel 中 replayable 的条目显示「复用参数」按钮；AuditLogDetail 中放行的图片生成 POST 请求显示「复用参数」按钮（含敏感字段自动隐藏）；Image/Music/Video/Text 四个生成页面创建任务时自动附加参数快照
- **范围**: `src/lib/history-replay.ts` + `src/stores/history.ts` + `src/components/layout/HistoryPanel.tsx` + `src/pages/AuditLogs/AuditLogDetail.tsx` + `src/pages/ImageGeneration.tsx` + `src/pages/MusicGeneration.tsx` + `src/pages/VideoGeneration.tsx` + `src/pages/TextGeneration.tsx`

### R-010 - 新手引导 Tour
- **描述**: 首次登录时的功能介绍引导，帮助用户快速上手
- **现状**: WelcomeModal 有简单欢迎，无 Tour
- **范围**: `src/components/TourGuide.tsx` + 各页面步骤配置

### R-011 - 帮助中心
- **描述**: 内置 FAQ、API 文档链接、常见错误解决方案
- **现状**: 无帮助中心
- **范围**: `src/pages/HelpCenter.tsx` + FAQ 数据源

### R-012 - 移动端适配
- **描述**: 基础功能的移动端可用（查看状态、简单操作）
- **现状**: 无响应式优化
- **范围**: Tailwind 响应式优化 + 移动端布局组件

---

## 2026-04-15

**汇总**: 9 个需求 | 已完成: 4 | 待办: 5

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| R-013 | 结构化日志 + Trace ID | Monitoring | P0 | v2.5 | 已完成 |
| R-014 | 错误追踪集成 | Monitoring | P0 | v2.5 | 已完成 |
| R-015 | Rate Limiting 管理界面 | Admin | P1 | v3.3 | 待办 |
| R-016 | 全局通知中心与 Toast 治理 | UX | P1 | v3.2 | 待办 |
| R-017 | 资源置顶功能 | UX | P2 | v2.7 | 待办 |
| R-018 | API Playground | DevTools | P1 | v4.1 | 待办 |
| R-019 | Prompt模板版本管理 | Content | P3 | v2.4 | 已完成 |
| R-020 | 错误码速查表 | Help | P2 | v3.4 | 待办 |
| R-021 | 资源集成 | Content | P2 | v2.4 | 已完成 |

### R-013 - 结构化日志 + Trace ID
- **描述**: 所有日志携带唯一 Trace ID，支持跨服务请求追踪
- **现状**: 已完成请求级 Trace ID 生成/传播；日志、审计日志和外部 API 审计共享同一 trace_id
- **范围**: `server/lib/logger.ts` + 所有路由注入 trace ID

### R-014 - 错误追踪集成
- **描述**: 集成 Sentry/ErrorBit，异常自动上报并聚合分析
- **现状**: 已完成 Sentry 错误追踪集成；后端 5xx 异常按需上报并携带 trace/user/request 上下文，前端 SDK 初始化后捕获 React ErrorBoundary 渲染异常
- **范围**: `server/lib/error-tracking.ts` + 前端 SDK

### R-015 - Rate Limiting 管理界面
- **描述**: 管理员可在 UI 查看/调整各服务的速率限制，无需改代码
- **现状**: `rate-limits.ts` 纯静态配置，无 UI
- **范围**: `server/routes/admin/rate-limits.ts` + `src/pages/Admin/RateLimits.tsx`

### R-016 - 全局通知中心与 Toast 治理
- **描述**: 统一通知中心，聚合 WebSocket 推送、API 错误、系统公告、DLQ、容量告警和任务失败事件；Toast 只承载高优先级即时提醒，并支持去重、节流、已读状态和点击跳转
- **现状**: 已有 sonner wrapper (`toast.ts`)；WebSocket 事件和页面操作各自 toast，缺少统一 store、通知列表、事件分级和去重策略
- **范围**: `src/stores/notification.ts` + `src/components/NotificationCenter.tsx` + WebSocket 事件分级/去重 + Header 通知入口 + 后续可选持久化 API

### R-017 - 资源置顶功能
- **描述**: 用户可将常用资源（模板、工作流、媒体）置顶展示，支持快速访问
- **现状**: 收藏功能已实现（FavoriteButton.tsx + is_favorite），但无置顶功能
- **范围**: 数据表添加 is_pinned 字段 + 列表页置顶排序 + 置顶按钮组件

### R-018 - API Playground
- **描述**: 交互式 API 调试界面，支持参数配置、实时响应查看、一键生成 Python/JS 调用代码
- **现状**: 无类似功能
- **范围**: `src/pages/Playground.tsx` + 各服务调试组件 + `src/components/CodeSnippetGenerator.tsx`

### R-019 - Prompt模板版本管理
- **描述**: prompt_templates 表添加版本字段，支持版本历史对比、版本回滚
- **现状**: `prompt_template_versions` 表已完成；`prompt_templates` 补充 `owner_id`；版本创建/列表/对比/回滚 API 已完成；TemplateLibrary 页面已集成版本管理弹窗
- **范围**: `prompt_templates` 表扩展 + 版本历史 API + `src/pages/TemplateLibrary.tsx` 版本对比 UI

### R-020 - 错误码速查表
- **描述**: 系统错误码参考文档，包含 MiniMax API 错误码、系统内部错误码、外部供应商错误、常见原因和修复建议，并在失败 toast/通知/日志详情中提供跳转
- **现状**: 无系统级错误码参考；错误信息分散在 API 响应、日志和页面提示中
- **范围**: 可合并到 R-011 帮助中心，或单独 `src/pages/ErrorCodes.tsx`；补充错误码数据源、搜索、分类和详情锚点

### R-021 - 资源集成
- **描述**: 将素材、Prompt模板、工作流模板集成到各生成功能中使用，支持快速引用已有资源
- **现状**: 已在文本、图像、音乐、视频、语音同步、语音异步、歌词、视频智能体生成页面接入资源引用入口
- **范围**: 各生成页面添加资源选择器 + 复用素材/模板/工作流 API + 生成历史与媒体 metadata 使用追踪

---

## 2026-04-18

**汇总**: 2 个需求 | 已完成: 1 | 待办: 1

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| R-022 | 用量监控完善 | Monitoring | P2 | v3.2 | 待办 |
| R-023 | 歌词生成 | Content | P1 | v2.2 | 已完成 |

### R-022 - 用量监控完善
- **描述**: 用量监控页面展示 API 使用量统计、配额消耗趋势、各服务调用占比、历史用量对比，并与 Dashboard 运营总览共享关键指标
- **现状**: `/token` 路由和 `TokenMonitor.tsx` 已有本地 usage/history、手动余额和简易图表雏形，但未接入真实后端统计、配额趋势和服务占比
- **范围**: `src/pages/TokenMonitor.tsx` + `server/routes/stats.ts` 统计 API 扩展 + Dashboard 指标复用

### R-023 - 歌词生成
- **描述**: 调试台新增歌词生成功能页面，支持 AI 辅助歌词创作、歌词优化、风格建议
- **现状**: 音乐生成有歌词输入，但无独立的歌词生成功能
- **范围**: `src/pages/LyricsGeneration.tsx` + `server/routes/lyrics.ts` + 歌词生成 API

---

## 2026-04-25

**汇总**: 2 个需求 | 已完成: 0 | 待办: 2

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| R-024 | OpenAI Image-2 外部调试 | DevTools | P1 | v2.2.6 | 已完成 |
| R-025 | 补充完善系统配置功能 | Admin | P2 | v2.5 | 已完成 |

### R-024 - OpenAI Image-2 外部调试
- **描述**: 增加外部供应商 OpenAI，接入 chatgpt-image-2 / gpt-image-2 模型的图片生成调试功能，用于直接验证外部图片生成 API 参数、响应和媒体保存链路
- **现状**: 调试台目前以 MiniMax 能力为主，缺少外部供应商调试入口，也缺少 OpenAI Image-2 图片生成调试页面
- **范围**: 调试台新增一级菜单「外部调试」和二级菜单「OpenAI Image-2」；参考现有 MiniMax 图片、音乐生成调试页实现可调参数表单、响应预览和浏览器本地缓存；前端浏览器直接调用 `https://mikuapi.org/v1/images/generations`，不经过后端代理；后端提供外部调用日志的创建和更新能力，发起时记录请求元数据，响应返回后更新状态、耗时、错误和 token 用量等摘要信息，避免回传大体积 base64；前端将 image-2 返回的 base64 解码为 png 展示，并按 MiniMax 图片生成类似流程上传图片文件、保存媒体记录

### R-025 - 补充完善系统配置功能
- **描述**: 将代理域名白名单从硬编码迁移到 `system_config` 动态配置，支持 super 用户在 SystemConfig 页面动态管理允许访问的域名；同时完善 system_config 的 CRUD 体验（如批量更新、配置校验、默认值重置等）
- **现状**: 已完成。migration 037 将 `proxy.allowed_hosts` 写入 `system_config` 种子数据；白名单从静态常量改为 TTL 60s 可缓存，请求前自动刷新；system-config 写入时校验域名格式并拒绝内部地址；写入后立即失效缓存，下次请求自动加载新配置
- **范围**: `server/routes/external-proxy.ts` 改为从 `system_config` 读取 `proxy.allowed_hosts`（逗号分隔域名），缓存并支持刷新；`server/database/schema-pg.ts` 初始数据预填现有域名；可选：为 SystemConfig 页面添加专用代理白名单管理面板

---

## 待收集需求

> 尚未确定的需求占位符

| ID | 名称 | 分类 | 优先级 | 版本 | 状态 |
|----|------|------|--------|------|------|
| TBD-v4.2 | 更多组合功能 | TBD | TBD | v4.2+ | 待收集 |

### TBD-v4.2 - 更多组合功能
- **描述**: 待收集的具体功能需求，可能包括更复杂的工作流组合、跨服务联动等
- **现状**: 未确定
- **范围**: 待后续讨论确定

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-06 | R-009（请求回放与参数复用）标记为已完成；v2.6.0 新增参数快照基础设施，历史面板与审计日志支持一键复用参数 |
| 2026-07-05 | R-025（补充完善系统配置功能）标记为已完成；v2.5.2 已将代理白名单从硬编码迁移到 system_config 动态配置，支持运行时刷新和写入校验 |
| 2026-07-05 | R-013（结构化日志 + Trace ID）标记为已完成；请求级 Trace ID 已接入结构化日志与审计链路 |
| 2026-05-04 | R-024（OpenAI Image-2 外部调试）标记为已完成，版本 v2.2.6 |
| 2026-05-11 | 更新当前 ID 范围到 R-025；完善 R-005/R-009/R-016/R-020/R-022 描述；将 R-016/R-022 分配到 v3.2 |
| 2026-07-03 | v2.3.1 发布；R-002 部分完成（Prompt 列表查询 API 已实现） |
| 2026-07-04 | v2.3.2 发布；R-002 标记为已完成（收口） |
| 2026-07-04 | R-019（Prompt模板版本管理）标记为已完成；v2.4 版本 |
| 2026-05-11 | 安全修复批次: P0批量下载owner过滤、P1 togglePublic/cron原子授权已实施；R-012移动端适配标记为部分完成（基础抽屉布局已实施，完整编辑能力保留v3.0） |
| 2026-05-11 | docs 治理: R-012/R-025 状态同步；已完成 plans (audit-fixes/R-024) 归档至 v2.2；v2.1/v2.2 重复归档去重；归档文件引用断链修复 |
| 2026-04-28 | R-019（Prompt模板版本管理）从 v2.3 调整到 v2.4 |
| 2026-04-25 | 新增 R-024 OpenAI Image-2 外部调试需求，插入 v2.3 版本 |
| 2026-04-23 | R-023（歌词生成）标记为已完成，v2.2 版本 |
| 2026-04-22 | R-023 从 v2.1 调整到 v2.2；R-002/R-019 → v2.3；R-021 → v2.4；R-013/R-014 → v2.5；R-009 → v2.6；R-001/R-017 → v2.7；R-003 → v2.8 |
| 2026-04-18 | 新增 R-023 歌词生成需求，分配到 v2.1 版本 |
| 2026-04-18 | 新增 R-022 用量监控完善需求，版本待分配 |
| 2026-04-17 | R-003 版本从 v2.1 调整到 v2.7；R-004 版本从 v2.5 调整到 v2.1 |
| 2026-04-15 | 重新分配需求 ID 为连续编号（R-001 ~ R-021），原 R-014→R-013, R-015→R-014, R-018→R-015, R-019→R-016, R-026→R-017, R-073→R-018, R-075→R-019, R-077→R-020, R-078→R-021 |
| 2026-04-15 | 新增「ID 编号规则」区域，说明 ID 跳跃原因和可用起点 |
| 2026-04-14 | 创建需求池，记录 R-001 ~ R-012 |
| 2026-04-15 | 新增 R-014、R-015、R-018、R-019、R-026 |
| 2026-04-15 | R-026 收藏已存在，改为仅保留置顶 |
| 2026-04-15 | R-009 扩展：合并参数复用功能 |
| 2026-04-15 | 新增 R-073、R-075、R-077、R-078 |
| 2026-04-15 | 添加优先级列，完善卡片详情 |
| 2026-04-15 | 添加待收集需求区域，记录 TBD-v4.2 |
| 2026-04-15 | 修复 2026-04-15 表格列顺序（添加优先级列） |
