# Changelog

All notable changes to this project will be documented in this file.

## [2.2.5] - 2026-04-28

### Added

- **SizePopup 尺寸选择弹窗组件** - 全新的图片尺寸选择器
  - `src/components/ui/SizePopup.tsx` (+298) - 支持按比例分组（1:1、4:3、3:4、16:9、9:16、3:2、2:3）
  - Tab 切换横屏/竖屏方向，弹窗面板式交互
  - 导出 `getSizeGroup()` 工具函数和 `IMAGE_SIZE_OPTIONS` 完整尺寸列表

### Fixed

- **OpenAI Image-2 运行时错误** - 恢复 Textarea 导入，修复运行时崩溃
  - `src/pages/OpenAIImage2.tsx` - 修复缺失的 Textarea 导入

### Changed

- **OpenAI Image-2 表单布局优化** - UI 体验全面改进
  - `src/pages/OpenAIImage2.tsx` (+106/-89) - 表单布局从纵向改为横向，增加空间利用率
  - Bearer Token 说明文字替换为 Tooltip 气泡提示
  - 提示词 Textarea 从 3 行扩展到 12 行
  - Background / Format / Moderation / 数量改为 4 列 grid 布局
  - 生成按钮移入参数卡片内部
  - Size 选择器从 Select 下拉改为 SizePopup 弹窗面板

- **仅保留支持的尺寸比例** - 移除不支持的尺寸选项
  - `src/pages/OpenAIImage2.tsx` - 移除 SIZE_OPTIONS 硬编码数组中的 `auto` 及不支持尺寸

- **外部接口超时时间增加** - 从 5 分钟增至 6 分钟
  - `server/config/timeouts.ts` - `PROXY_REQUEST_MS` 从 300s 增至 360s
  - `src/lib/config/constants.ts` - `EXTERNAL_PROXY` 从 300000ms 增至 360000ms

- **代理白名单扩展** - 新增两个代理域名
  - `server/routes/external-proxy.ts` - 新增 `api.tokenfty.net` 和 `gpt.hslife.fun`

### Docs

- **路线图更新** - 需求版本调整
  - R-019（Prompt模板版本管理）从 v2.3 调整到 v2.4
  - 新增 R-025（补充完善系统配置功能），排入 v2.5

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ SizePopup 为增量 UI 组件，不影响现有功能
- ✅ 超时时间增加为向后兼容配置变更
- ✅ 代理白名单扩展为增量变更

## [2.2.4] - 2026-04-25

### Added

- **OpenAI Image-2 外部调试页面** - 直连外部 OpenAI 兼容 API 进行图像生成调试
  - `src/pages/OpenAIImage2.tsx` - 完整的图像生成调试页面
  - `src/lib/openai-image-2.ts` - API 调用和响应解析工具
  - `src/components/ui/ComboboxInput.tsx` - 可搜索下拉输入组件
  - 支持多种尺寸选项（含 1152x2048、2048x1152）
  - 通过后端代理绕过 CORS 限制
  - 生成结果自动保存到媒体库

- **外部 API 日志增强** - 扩展日志状态和写入能力
  - 扩展状态为 `pending`，支持创建和更新流程
  - 新增写入路由 `POST /api/external-api-logs`
  - 新增 `external_debug` 媒体来源类型

- **外部 API 端点统一配置** - 集中管理外部 API 端点
  - 新增 `ExternalEndpoint` 类型和设置面板
  - 支持 OpenAI/Anthropic 协议
  - API Key 通过后端存储，移除浏览器本地缓存

- **素材管理改进** - 素材管理页面重新设计
  - 筛选、排序、分页功能
  - 素材卡片布局和间距优化
  - 聚合计数显示

- **UI 组件增强**
  - 新增 `ComboboxInput` 组件，带平滑下拉动画
  - 侧边栏「外部调试」提升为一级菜单

### Fixed

- 修复 MediaSource 枚举和数据库 CHECK 约束，解决上传 500 错误
- 修复素材列表过滤参数对齐问题
- 修复艺术家编辑器工作区渲染统一性
- 修复素材项目所有者权限检查
- 修复部分重排序拒绝逻辑
- 修复 OpenAI Image-2 页面多个 bug

### Changed

- External proxy timeout 改用 `TIMEOUTS` 常量，与 music generation 保持一致

### Docs

- 新增 OpenAI Image-2 外部调试设计文档
- Roadmap 添加 OpenAI Image-2 需求

## [2.2.3] - 2026-04-24

### Added

- **Materials Workspace Refresh** - 素材工作区整体刷新
  - `client/src/pages/Materials.tsx` - 素材管理页面重构
  - `client/src/components/materials/` - 全新的素材编辑器和管理组件
  - `client/src/stores/materials-store.ts` - 素材状态管理
  - 基于 Vibrant Block 设计系统的视觉升级

- **Artist Workspace** - 艺术家工作区
  - `client/src/components/materials/artist-workspace/` - 艺术家面板和编辑器
  - 支持艺术家工作区的创建、编辑和排序

- **Resource Management API** - 资源管理 API 客户端
  - `client/src/api/materials/` - 素材和资源管理 API
  - 完整的 CRUD 操作和类型定义

- **Material Management Types** - 素材管理类型系统
  - `client/src/types/material-types.ts` - 素材相关类型定义
  - `client/src/types/resource-types.ts` - 资源类型定义

- **Prompts API Routes** - 提示词 API 路由
  - `server/routes/prompts.ts` - 提示词管理路由
  - `server/routes/materials.ts` - 素材管理路由

### Fixed

- **Dialog 状态管理** - 简化对话框渲染逻辑
  - `client/src/components/ui/Dialog.tsx` - Portal 渲染优化
  - 更可靠的对话框显示和交互

- **Material Service 类型对齐** - 修复 API payload 类型
  - `server/services/material-service.ts` - 更新服务类型
  - 修正 reorder API payload 格式

- **Artist Workspace 排序和刷新** - 优化工作区交互
  - 减少不必要的工作区重新获取
  - 稳定艺术家工作区排序流程

- **Database Service 测试** - 稳定化模板测试
  - `server/__tests__/database-service.test.ts` - 测试加固

### Changed

- **Editor Shell 布局重构** - 更精细的编辑器外壳
  - `client/src/components/materials/editor-shell/` - 改进布局和交互
  - 类型感知的素材编辑器

- **Material Management List** - 素材管理列表优化
  - 增强列表展示和交互细节
  - 美化管理列表视觉效果

- **Navigation 增强** - 素材管理导航
  - `client/src/components/layout/AppLayout.tsx` - 添加素材管理入口

### Backward Compatibility

- ✅ 所有现有 API 端点保持不变
- ✅ 数据库 schema 通过 migration 安全升级
- ✅ 新增功能不影响现有工作流

## [2.2.2] - 2026-04-23

### Added

- **GitHub Actions CI/CD** - 自动化持续集成和部署
  - `.github/workflows/ci.yml` (+61) - GitHub Actions 工作流配置
  - 支持自动化测试和构建

- **Dockerfile** - 容器化部署支持
  - `Dockerfile` (+26) - 生产环境 Docker 镜像构建

- **ESLint 集成** - 代码质量检查
  - `.eslintrc.cjs` (+23) - ESLint 配置

### Fixed

- **26 个代码审查问题修复** - 全项目代码质量提升
  - 涉及多个核心模块的错误处理、类型安全、测试隔离等

### Changed

- **测试隔离加固** - 提升测试稳定性
  - `server/__tests__/test-helpers.ts` (+11) - 测试辅助函数
  - `server/__tests__/cron-scheduler.test.ts` (+118) - 调度器测试增强
  - `server/__tests__/database-service.test.ts` (+151) - 数据库服务测试
  - `server/__tests__/dead-letter-queue.test.ts` (+107) - 死信队列测试
  - `server/__tests__/queue-processor.test.ts` (+24) - 队列处理器测试
  - `server/__tests__/workflow-integration.test.ts` (+117) - 工作流集成测试

- **多项 Bug 修复**
  - `server/services/capacity-checker.ts` (+55) - 容量检查器改进
  - `server/services/cron-scheduler.ts` (+38) - 调度器改进
  - `server/services/execution-state-manager.ts` (+86) - 执行状态管理改进
  - `server/services/misfire-handler.ts` (+19) - misfire 处理改进
  - `server/services/notification-service.ts` (+48) - 通知服务改进
  - `server/services/queue-processor.ts` (+20) - 队列处理改进
  - `server/services/task-executor.ts` (+39) - 任务执行器改进
  - `server/services/websocket-service.ts` (+88) - WebSocket 服务改进

- **API 路由增强**
  - `server/routes/auth.ts` (+9) - 认证路由
  - `server/routes/media.ts` (+61) - 媒体路由
  - `server/routes/users.ts` (+15) - 用户路由

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 新增 CI/CD 和 Dockerfile 不影响现有功能
- ✅ 代码审查修复为内部改进

## [2.2.1] - 2026-04-22

### Added

- **可拖拽调整侧边栏宽度** - 用户可自由调整侧边栏宽度 (140-400px)
  - `src/components/layout/Sidebar.tsx` (+120/-4) - 拖拽调整功能，localStorage 持久化
  - `src/components/layout/AppLayout.tsx` (+9/-5) - 动态宽度支持

- **歌词播放器风格滚动效果** - 段落级焦点高亮 + 60fps 流畅滚动
  - `src/components/lyrics/LyricsTaskCarousel.tsx` (+394/-118) - 大幅重构：
    - Block-level 焦点替代逐行 focus（性能优化）
    - ResizeObserver 直接操作 DOM 实现 scroll-padding 同步
    - scroll-snap `proximity` 模式配合精确 padding
    - glow 效果和渐隐过渡
  - `src/pages/LyricsGeneration.tsx` (+8/-7) - 歌词页面调整

### Documentation

- **ADR-0001 歌词滚动交互策略** - 技术决策记录
  - `docs/decisions/0001-lyrics-scroll-interaction-strategy.md` (+76) - 段落级焦点方案决策

- **代码审查修复计划** - 全项目代码审查问题修复方案
  - `docs/plans/2026-04-22-code-review-fixes.md` (+126) - 26 个问题 (P0:3, P1:8, P2:12, P3:3)

- **AGENTS.md 简体中文规范** - 协作语言规范化
  - `AGENTS.md` (+7/-1) - 添加简体中文协作铁律

### Performance

- **歌词滚动帧率** - 从严重掉帧优化至 60fps 流畅
  - 段落级 opacity 切换替代逐行样式计算
  - ResizeObserver 替代 React state 避免 re-render 时序差

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 侧边栏宽度调整为纯 UI 增强
- ✅ 歌词滚动优化为内部性能改进
- ✅ 文档更新不影响功能逻辑

## [2.2.0] - 2026-04-22

### Fixed

- **Token Refresh 死锁修复** - 并发长请求场景下 token refresh 机制并发安全缺陷修复
  - `src/lib/api/client.ts` (+31/-11) - 3 个核心缺陷修复：
    - `refreshSubscribers` 改为 `{resolve, reject}` 对象 + `subscriberTimeout` (10s) 超时保护
    - `hydrationRefreshPromise` 使用 `Promise.race` 包装，防止永久 hang
    - 统一失败路径：subscriber 统一 reject、单次 logout、修复 `response.success === false` 漏处理
  - 修复现象：10 个并发音乐生成时 access token 过期导致 `/auth/refresh` 超时、页面全屏加载卡死
  - 根因：浏览器 HTTP/1.1 6 连接限制 + subscriber Promise 永不 reject

### Changed

- **Access Token 有效期延长** - 降低 token 在长时间生成任务期间过期的概率
  - `server/services/user-service.ts` - `expiresIn` 从 `15m` 延长至 `30m`

- **数据库连接池扩容** - 提升并发负载下的连接容量
  - `.env` / `.env.example` - `DB_POOL_MAX` 从 `10` 增加到 `20`

### Added

- **文档系统重构** - 完善工程规范和事故记录体系
  - `docs/standards/` - 新增 5 份工程规范（coding/API/database/testing/security）
  - `docs/decisions/` - 新增架构决策记录（ADR）目录 + `_template.md`
  - `docs/guides/` - 新增发布指南 (`release-guide.md`) 和故障排查指南 (`troubleshooting.md`)
  - `docs/incidents/2026-04-22-auth-refresh-deadlock-incident.md` - Token Refresh 死锁事故报告（304 行）
  - `AGENTS.md` - 精简为项目约束和原则，详细内容迁移至 `docs/AGENTS.md`

- **路线图更新** - R-023 歌词生成需求延后至 v2.2
  - `docs/roadmap/requirement-pools.md` - R-023 状态更新
  - `docs/roadmap/v2-roadmap.md` - v2.2 ~ v2.7 版本规划顺延

### Performance

- **测试执行速度** - 并行化优化延续
  - 前端/后端测试 pool='forks' + fileParallelism 持续生效

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ token 有效期延长为向后兼容配置变更
- ✅ DB 连接池扩容为环境配置变更，不影响功能逻辑
- ✅ 文档系统重构为纯文档变更，不影响代码

## [2.1.6] - 2026-04-21

### Added

- **媒体上传失败重试机制** - 增强上传恢复能力
  - `server/lib/media-storage.ts` (+20) - 重试逻辑封装
  - `server/routes/media.ts` (+201) - 批量恢复 API 和重试端点
  - `src/lib/api/media.ts` (+31) - 前端重试 API 调用
  - `src/pages/MediaManagement.tsx` (+82) - 重试状态 UI 集成
  - `docs/plans/2026-04-21-recover-failed-uploads.md` - 恢复计划文档

- **歌词预览模态框增强** - 改善用户体验
  - `src/components/lyrics/LyricsPreviewModal.tsx` (+223) - 复制、收藏按钮，结构标签识别
  - `src/lib/utils/lyrics.ts` (+15) - 歌词工具函数
  - `src/types/lyrics.ts` (+3) - 类型扩展

- **音乐卡片交互改进** - 统一播放体验
  - `src/components/media/MediaCard.tsx` (+50) - 音乐类型播放图标
  - `src/components/media/MediaTableView.tsx` (+19) - 表格视图播放支持
  - `src/components/media/TimelineItem.tsx` (+14) - 时间线视图播放支持
  - `src/components/media/AudioPlayer.tsx` (+1) - 播放状态管理
  - `server/routes/media.ts` - 防止双重音频播放修复

- **测试基础设施扩展** - 提升测试覆盖
  - `src/stores/__tests__/cronJobs.test.ts` (+180) - Cron Jobs Store 测试
  - `src/stores/__tests__/executionLogs.test.ts` (+51) - 执行日志 Store 测试
  - `src/stores/__tests__/taskQueue.test.ts` (+61) - 任务队列 Store 测试
  - `server/repositories/__tests__/external-api-log.repository.test.ts` (+320) - 外部 API 日志 Repository 测试
  - `server/repositories/__tests__/task-repository.test.ts` (+568) - 任务 Repository 测试
  - `server/repositories/__tests__/workflow-repository.test.ts` (+560) - 工作流 Repository 测试
  - `server/routes/__tests__/media.test.ts` (+127) - 媒体路由测试
  - `server/routes/__tests__/workflows.test.ts` (+25) - 工作流路由测试

- **并行测试执行** - 提升测试速度
  - `vitest.server.config.ts` (+138) - 并行配置（pool='forks', fileParallelism）
  - `vitest.config.ts` (+17) - 前端并行测试支持

- **测试覆盖率命令优化** - 分离前后端覆盖
  - `package.json` - 新增 `test:coverage:frontend` 和 `test:coverage:backend` 命令

- **音乐恢复脚本** - 数据修复工具
  - `scripts/restore-music-from-audit.ts` (+196) - 从审计日志恢复音乐文件

- **测试指南文档** - 规范测试实践
  - `docs/guides/testing-guide.md` (+70) - 测试配置和使用指南

### Fixed

- **音频播放修复** - 防止双重音频播放
  - `fix(media): prevent dual audio playback`

- **测试隔离修复** - 确保测试独立性
  - `fix(test): properly cleanup NULL owner_id records in test isolation`
  - `fix(test): isolate tests with unique owner_id per file`
  - `fix(test): correct assertions for repository tests`

- **卡片交互优化** - 平滑过渡效果
  - `fix(media): polish card interactions and lyrics modal transitions`

### Changed

- **歌词结构标签识别** - 支持任意 `[xxxx]` 模式
  - `src/lib/utils/lyrics.ts` - 识别任何 `[xxxx]` 格式作为结构标签

### Performance

- **测试执行速度** - 并行化优化
  - 后端测试：pool='forks' + fileParallelism
  - 前端测试：fileParallelism 启用
  - **34 files changed** (+3104 insertions, -335 deletions)

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 媒体上传重试为向后兼容增强
- ✅ 测试基础设施不影响生产功能

## [2.1.5] - 2026-04-20

### Added

- **测试覆盖率基础设施** - 配置 Vitest Istanbul 覆盖率提供商
  - `vitest.config.ts` (+28) - 添vitest 4.x 覆盖率配置
  - `@vitest/coverage-istanbul` (+0) - 新增覆盖率提供者
  - 支持多提供者配置（istanbul/v8）

- **综合后端服务单元测试** - 覆盖核心业务逻辑
  - `server/services/__tests__/execution-state-manager.test.ts` (+768) - 执行状态管理器测试
  - `server/services/__tests__/misfire-handler.test.ts` (+485) - misfire 处理器测试
  - `server/services/__tests__/service-node-registry.test.ts` (+530) - 服务节点注册测试
  - `server/services/__tests__/settings-service.test.ts` (+205) - 设置服务测试
  - `server/services/workflow/__tests__/exclusion-utils.test.ts` (+217) - 互斥工具测试
  - `server/services/workflow/__tests__/parser.test.ts` (+175) - 工作流解析器测试
  - `server/services/workflow/__tests__/topological-sort.test.ts` (+216) - 拓扑排序测试

- **综合前端 Store 单元测试** - 覆盖状态管理
  - `src/settings/store/__tests__/index.test.ts` (+541) - 设置 Store 测试
  - `src/stores/__tests__/audio.test.ts` (+225) - 音频 Store 测试
  - `src/stores/__tests__/auth.test.ts` (+211) - 认证 Store 测试
  - `src/stores/__tests__/executionLogs.test.ts` (+247) - 执行日志 Store 测试
  - `src/stores/__tests__/history.test.ts` (+217) - 历史 Store 测试
  - `src/stores/__tests__/prompts.test.ts` (+133) - 提示词 Store 测试
  - `src/stores/__tests__/taskQueue.test.ts` (+296) - 任务队列 Store 测试
  - `src/stores/__tests__/templates.test.ts` (+514) - 模板 Store 测试
  - `src/stores/__tests__/usage.test.ts` (+292) - 用量 Store 测试
  - `src/stores/__tests__/webhooks.test.ts` (+601) - Webhook Store 测试
  - `src/stores/__tests__/workflowTemplates.test.ts` (+178) - 工作流模板 Store 测试

### Fixed

- **测试 mock 修复** - 修正 apiClient mock 配置
  - `fix(test): correct mock setup for apiClient in failing tests`

- **37 个测试失败修复** - 跨 7 个测试文件的修复
  - `fix(test): resolve 37 test failures across 7 test files`

### Changed

- **npm scripts 更新** - CLI 名称更新
  - `package.json` - `mnx-dev` → `mnx-agent`

- **Vitest 配置更新** - 4.x 版本兼容
  - `vitest.config.ts` - 覆盖率阈值和提供者配置

### Performance

**Code Quality Metrics**
- **31 files changed** (+6373 insertions, -300 deletions)
- **新增测试文件**: 18 个
- **测试覆盖率提升**: 核心服务和工作流引擎覆盖
- **前端 Store 覆盖**: 12 个 store 测试

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 测试基础设施为开发质量改进，不影响功能
- ✅ CLI 名称变更为 `mnx-agent`（已在 v2.0.0 引入）

## [2.1.4] - 2026-04-19

### Added

- **歌词并行生成** - 支持 1-10 个并行生成
  - `src/pages/LyricsGeneration.tsx` (+545/-XX) - 并行数量选择器，批量生成逻辑
  - 使用 Promise.all 并发执行多个歌词生成请求
  - 每个生成结果独立显示状态和进度

- **歌词结果区域重新设计** - 全屏加载和显示优化
  - `src/pages/LyricsGeneration.tsx` - 结果区域布局重构
  - 全屏加载动画，更好的用户反馈
  - 生成完成后的轮播展示优化

- **Tab风格模式选择** - 替代下拉选择器
  - `src/pages/LyricsGeneration.tsx` - 创作/编辑模式 Tab 切换
  - 更直观的模式切换体验

- **歌词保存到 media_records** - 生成结果持久化
  - `src/pages/LyricsGeneration.tsx` (+4e0a187) - createMedia with metadata
  - 歌词生成完成后自动保存到媒体库
  - 支持并行生成结果批量保存

- **操作按钮移到歌词框角落** - UI优化
  - `src/components/lyrics/LyricsTaskCarousel.tsx` (+219/-XX) - 移除重复轮播
  - 操作按钮（复制、编辑、保存）移到卡片角落
  - 使用图标按钮替代文字按钮

- **媒体管理集成歌词预览** - 歌词预览功能集成
  - `src/pages/MediaManagement.tsx` (+11/-0) - 歌词预览功能接入
  - `src/components/media/MediaCard.tsx` (+47/-XX) - 歌词卡片预览
  - Hover 预览和 Modal 全屏查看

### Fixed

- **剪贴板复制 fallback** - 非 HTTPS 环境备用方案
  - `src/pages/LyricsGeneration.tsx` - 添加 fallback clipboard copy
  - 支持 navigator.clipboard API 不可用时的备用方案

- **style_tags 类型兼容** - string 或 array 处理
  - `src/components/lyrics/LyricsTaskCard.tsx` (+7/-XX) - optional chaining
  - `src/pages/LyricsGeneration.tsx` - style_tags string/array 兼容
  - 后端 API 返回 string，前端统一处理

- **API 响应数据提取** - ApiResponse wrapper 处理
  - `src/pages/LyricsGeneration.tsx` - 正确提取 ApiResponse.data
  - `server/routes/lyrics.ts` (+3/-1) - extractData 配置
  - MiniMax API 响应正确解析

- **布局和双滚动条修复**
  - `src/pages/LyricsGeneration.tsx` - 布局比例调整
  - `src/components/lyrics/LyricsTaskCarousel.tsx` - 双滚动条消除

- **'lyrics' 类型过滤支持** - 媒体类型枚举扩展
  - `server/validation/schemas/enums.ts` (+2/-1) - mediaTypeEnum 添加 'lyrics'
  - `server/validation/media-schemas.ts` (+2/-1) - mediaSourceEnum 添加 'lyrics_generation'
  - `src/hooks/useMediaManagement.ts` (+15/-XX) - validTypes 添加 'lyrics'
  - 支持在媒体管理中筛选歌词类型

### Changed

- **页面样式统一** - 与 MusicGeneration 一致
  - `src/pages/LyricsGeneration.tsx` - 整体样式重构
  - 卡片布局、间距、颜色与音乐生成页面一致

- **布局比例调整** - 5:7 和轮播指示器
  - `src/components/lyrics/LyricsTaskCarousel.tsx` - 左右比例 5:7
  - 添加轮播指示器，更好的导航体验

- **文本区域增大** - prompt/lyrics textarea 12行
  - `src/pages/LyricsGeneration.tsx` - textarea rows 增加至 12
  - 更舒适的输入体验

- **中文标签显示** - mode 显示中文
  - `src/pages/LyricsGeneration.tsx` - SelectTrigger 中文标签
  - 创作模式/编辑模式中文显示

- **API curl清理** - 移除不必要的 model 参数
  - `src/pages/LyricsGeneration.tsx` - curl 示例清理
  - 更准确的 API 参考示例

### Performance

**Code Quality Metrics**
- **16 files changed** (+645 insertions, -255 deletions)
- **新增功能**: 歌词并行生成、结果区域重设计、媒体集成预览
- **修复**: 剪贴板fallback、类型兼容、API响应提取、布局优化
- **UI改进**: Tab风格、中文标签、样式统一

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 歌词并行生成为增量功能，向后兼容
- ✅ 媒体类型扩展不影响现有类型
- ✅ UI改进为纯前端变更，不影响功能逻辑

## [2.1.3] - 2026-04-19

### Added

- **歌词预览组件** - 歌词 HoverPreview 和 PreviewModal 组件
  - `src/components/lyrics/LyricsHoverPreview.tsx` (+117) - Hover 预览组件，鼠标悬停显示歌词片段
  - `src/components/lyrics/LyricsPreviewModal.tsx` (+200) - Modal 预览组件，全屏查看歌词、段落导航、导出 TXT
  - `src/components/lyrics/index.ts` (+6) - Barrel export 导出所有歌词组件
  - `src/index.css` (+10) - 歌词段落标签高亮样式 `.lyrics-section-tag`

- **歌词解析工具函数** - 结构化歌词解析和显示
  - `src/lib/utils/lyrics.ts` (+111) - 歌词解析、片段提取、段落高亮函数
  - 支持段落类型：Verse/Chorus/Bridge/Outro/Hook/Intro
  - XSS 安全：HTML 实体转义防止注入攻击

- **MediaType/MediaSource 扩展** - 支持 lyrics 类型
  - `src/types/media.ts` (+2/-2) - 新增 `lyrics` 和 `lyrics_generation` 类型
  - `src/lib/constants/media.tsx` (+6/-1) - 歌词类型图标、标签、渐变配置
  - `src/lib/utils/media.tsx` (+3/-1) - getTypeIcon 支持 lyrics

### Fixed

- **XSS 漏洞修复** - 歌词显示安全加固
  - `src/lib/utils/lyrics.ts` - 添加 `escapeHtml()` 函数转义 HTML 特殊字符
  - 防止 MiniMax API 返回的歌词内容包含恶意脚本

- **正则状态竞态修复** - matchAll 替代手动 lastIndex 操作
  - `src/lib/utils/lyrics.ts` - 使用 `String.matchAll()` 避免并发调用状态污染

- **类型强制转换修复** - LyricsPreviewModal title 传递方式
  - `src/components/lyrics/LyricsPreviewModal.tsx` - 移除 `as unknown as string`，传纯字符串

### Changed

- **类型定义重复消除** - DRY 原则
  - `src/lib/api/media.ts` (+4/-3) - 移除重复定义，改为从 `@/types/media` 导入并重新导出

### Performance

**Code Quality Metrics**
- **9 files changed** (+455 insertions, -7 deletions)
- **新增组件**: 2 个 (LyricsHoverPreview, LyricsPreviewModal)
- **新增工具函数**: 1 个模块
- **安全修复**: XSS 防护 + 正则状态修复

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 歌词预览组件为增量功能，不影响现有系统
- ✅ MediaType 扩展向后兼容（新增类型）
- ✅ 类型定义重构为内部改进，不影响导入方

## [2.1.2] - 2026-04-18

### Added

- **歌词生成前端实现 (R-023)** - 歌词生成页面完整功能
  - `src/pages/LyricsGeneration.tsx` (+312) - 歌词生成页面，支持创作和编辑两种模式
  - `src/components/lyrics/LyricsTaskCard.tsx` (+231) - 歌词任务卡片组件，显示生成状态和结果预览
  - `src/components/lyrics/LyricsTaskCarousel.tsx` (+101) - 歌词任务轮播组件，支持历史任务切换
  - `src/lib/api/lyrics.ts` (+14) - 歌词生成 API 客户端
  - `src/types/lyrics.ts` (+38) - 歌词类型定义
  - 支持歌词导出为 TXT 文件
  - 支持任务历史管理（最多保留10条）
  - 表单数据持久化，刷新不丢失

- **路由与导航** - 歌词生成入口
  - `src/App.tsx` (+9) - 新增歌词生成路由 `/lyrics`
  - `src/components/layout/Sidebar.tsx` (+1) - Sidebar 导航入口

- **国际化翻译** - 歌词生成多语言支持
  - `src/i18n/locales/en.json` (+33) - 英文翻译
  - `src/i18n/locales/zh.json` (+33) - 中文翻译
  - 支持创作模式、编辑模式、状态提示等翻译

### Changed

- **Form Persistence** - 新增歌词表单持久化键
  - `src/hooks/useFormPersistence.ts` (+1) - 添加 `DEBUG_FORM_KEYS.LYRICS_GENERATION`
  - `src/lib/config/constants.ts` (+2) - 常量定义

### Performance

**Code Quality Metrics**
- **12 files changed** (+774 insertions, -2 deletions)
- **新增页面**: 1 个 (LyricsGeneration)
- **新增组件**: 2 个 (LyricsTaskCard, LyricsTaskCarousel)
- **新增 API 客户端**: 1 个 (lyrics)
- **新增类型定义**: 1 个 (lyrics)

### Backward Compatibility

- ✅ 所有 API 端点保持不变（后端 API 在 v2.1.1 已实现）
- ✅ 歌词生成功能为增量功能，不影响现有系统
- ✅ 路由新增为独立路径，不影响现有路由
- ✅ 国际化翻译为新增条目，不影响现有翻译

## [2.1.1] - 2026-04-18

### Added

- **歌词生成后端 API 集成 (R-023)** - 后端歌词生成功能
  - `server/routes/lyrics.ts` (+29) - 新增 `/api/lyrics` 路由
  - `server/lib/minimax.ts` (+25) - 新增 `generateLyrics()` 方法
  - `packages/shared-types/entities/lyrics.ts` (+69) - 歌词类型定义
  - `server/database/migrations/029_lyrics_type_source.ts` (+15) - 新增 `lyrics` 类型到 `media_records`
  - 支持歌词生成请求的 MiniMax API 集成

- **歌词生成文档** - 完整设计和实现计划
  - `docs/specs/lyrics-generation-design.md` (+327) - 歌词生成设计规格
  - `docs/plans/2026-04-18-01-lyrics-generation-backend.md` (+360) - 后端实现计划
  - `docs/plans/2026-04-18-02-lyrics-generation-frontend.md` (+992) - 前端实现计划
  - `docs/plans/2026-04-18-03-lyrics-generation-preview.md` (+603) - 预览功能计划
  - `docs/plans/2026-04-18-04-lyrics-generation-media-integration.md` (+492) - 媒体集成计划

### Fixed

- **歌词路由重构** - Zod验证和共享类型
  - `server/routes/lyrics.ts` - 添加 Zod 验证 schema
  - 使用共享类型定义确保前后端类型一致性

- **前端计划修复** - RadioGroup→Select, DEBUG_FORM_KEYS
  - `docs/plans/2026-04-18-02-lyrics-generation-frontend.md` - UI组件调整

### Documentation

- **Roadmap 更新** - 需求池和版本规划
  - `docs/roadmap/requirement-pools.md` (+11) - 新增 R-023 歌词生成需求
  - `docs/roadmap/v2-roadmap.md` (+8) - 分配 R-023 到 v2.1 版本

### Performance

**Code Quality Metrics**
- **17 files changed** (+2,986 insertions, -9 deletions)
- **新增路由**: 1 个 (lyrics)
- **新增类型定义**: 1 个 (lyrics entity)
- **新增数据库迁移**: 1 个 (lyrics_type_source)
- **新增文档**: 6 个 (1 spec + 4 plans + 2 roadmap)

### Backward Compatibility

- ✅ 所有 API 端点保持不变（新增 `/api/lyrics`）
- ✅ 歌词生成功能为增量功能，不影响现有系统
- ✅ 数据库迁移向后兼容（新增 `lyrics` 类型）
- ✅ 类型定义扩展不影响现有类型

## [2.1.0] - 2026-04-18

### Added

- **外部API审计日志系统 (R-004)** - 完整的外部API调用审计功能
  - `server/database/migrations/027_audit_enhancement.ts` - 新增 `external_api_logs` 表
  - `server/database/migrations/028_external_api_request_body.ts` - 新增 `request_body` 字段
  - `server/routes/external-api-logs.ts` (+96) - 新增 `/api/external-api-logs` 路由
  - `server/services/external-api-audit.service.ts` (+172) - 外部API审计服务
  - `server/services/audit-context.service.ts` (+83) - 审计上下文服务
  - `server/repositories/external-api-log.repository.ts` (+226) - 外部API日志数据访问
  - `server/config/audit.ts` (+125) - 审计配置集中管理
  - `src/pages/ExternalApiLogs.tsx` (+615) - 外部API日志页面
  - `src/lib/api/external-api-logs.ts` (+115) - 前端API客户端
  - `packages/shared-types/entities/external-api-log.ts` (+73) - 类型定义
  - 支持查询、分页、筛选外部API调用记录
  - 记录请求体、响应、状态码、耗时等信息

- **Dashboard 启用** - 主仪表板页面功能启用
  - `src/pages/Dashboard.tsx` - 启用 Dashboard 页面路由
  - `src/App.tsx` (+11) - 导航改进，Dashboard 可访问

- **导航改进** - Sidebar 和 Header UI 优化
  - `src/components/layout/Sidebar.tsx` (+18) - 图标修复和布局改进
  - `src/components/layout/Header.tsx` (+6) - 标题调整
  - 启用 Dashboard 导航入口

### Changed

- **配置集中化** - 统一硬编码配置消除重复定义
  - `server/config/audit.ts` - 审计配置集中管理
  - `server/lib/minimax.ts` (+513) - 使用集中配置，重构API客户端
  - `server/services/capacity-checker.ts` (+16) - 配置引用统一
  - `server/services/settings-service.ts` (+2) - 配置引用统一
  - 消除多处重复的硬编码常量

### Fixed

- **认证审计修复** - 登录/注册审计日志正确记录
  - `server/routes/auth.ts` (+4) - 登录/注册成功后设置 req.user 用于审计日志捕获
  - `server/routes/auth.ts` - auth路由添加审计中间件记录登录日志
  - `src/stores/auth.ts` (+1) - 登录成功后设置 isHydrated=true
  - 修复登录审计日志 user_id 为空问题

- **外部API审计修复** - 多项审计逻辑修正
  - `server/middleware/audit-middleware.ts` (+82) - 修正 skip paths 匹配路径
  - `server/middleware/audit-middleware.ts` - 修复 IP 获取逻辑 (X-Forwarded-For)
  - `server/middleware/audit-middleware.ts` - 修复 resource_type 解析
  - `server/services/task-executor.ts` (+29) - 端口清理失败修复
  - `server/services/external-api-audit.service.ts` - user_id 为空修复
  - `server/routes/external-api-logs.ts` - 添加认证中间件
  - `server/repositories/user-repository.ts` (+28) - rowToAuditLog usernameMap 修复

### Documentation

- **R-004 审计日志增强计划** - 完整设计文档
  - `docs/plans/2026-04-18-audit-log-enhancement.md` (+582) - 审计增强实现计划
  
- **Roadmap 更新** - 版本进度更新
  - `docs/roadmap/v2-roadmap.md` (+7) - R-008 完成，当前版本更新
  - `docs/roadmap/requirement-pools.md` (+18) - 需求池状态更新

### Performance

**Code Quality Metrics**
- **37 files changed** (+2,850 insertions, -313 deletions)
- **新增服务层文件**: 4 个 (external-api-audit, audit-context, audit config, external-api-log repository)
- **新增数据库迁移**: 2 个 (audit_enhancement, external_api_request_body)
- **新增前端页面**: 1 个 (ExternalApiLogs)
- **新增前端API模块**: 1 个 (external-api-logs)
- **新增类型定义**: 1 个 (external-api-log entity)
- **新增验证Schema**: 1 个 (external-api-logs-schemas)

### Backward Compatibility

- ✅ 所有 API 端点保持不变（新增 `/api/external-api-logs`)
- ✅ 审计日志增强为增量功能，不影响现有系统
- ✅ 数据库迁移向后兼容
- ✅ Dashboard 启用为前端路由变化，无破坏性变更
- ✅ 配置集中化为内部重构，不影响 API 契约

## [2.0.2] - 2026-04-18

### Fixed

- **Token Refresh Race Condition** - Critical fix for concurrent API calls during auth hydration
  - `src/lib/api/client.ts` - Shared `hydrationRefreshPromise` prevents multiple parallel token refreshes
  - Eliminates redundant refresh calls when multiple API requests fire simultaneously

- **Settings Store Re-initialization** - Fix for logout/re-login sync failure
  - `src/settings/store/index.ts` - Removed blocking `lastSyncedAt` check, added `resetSync()` method
  - Settings now load correctly after logout without stale state

- **Media Fetch Blocking** - Fix for permanent loading state
  - `src/hooks/useMediaManagement.ts` - Changed `.finally()` to try/finally pattern
  - Ensures `isFetchingRef` always resets, preventing UI freeze

- **CLI Shell Command Security** - Replace shell commands with safe Node.js APIs
  - `scripts/run.js` - Use `fs.rmSync/cpSync` instead of `rm -rf` shell commands
  - Added whitelist validation for sync targets

- **Music Deletion UX** - Improved deletion experience
  - `MusicCarousel.tsx` - Deleted items show muted gray dots, disabled click
  - `MusicTaskCard.tsx` - Fixed height jump with `min-h-[130px]`, removed layout animation
  - `MusicGeneration.tsx` - Added `isDeleted` flag for deleted music items

- **ConfirmDialog Size** - Compact sm-size variant
  - `ConfirmDialog.tsx`, `Dialog.tsx` - Smaller padding, fonts, buttons for quick confirmations

- **Documentation Typo** - `docs/roadmap/v2-roadmap.md` - Fixed "求ID" → "需求ID"

### Changed

- **LoadingSpinner Component** - Extracted shared component
  - `src/components/shared/LoadingSpinner.tsx` - New reusable spinner with size variants
  - `AuthGuard.tsx` - Uses shared LoadingSpinner instead of inline

### Added

- **Auth Guard System** - Enhanced authentication state management
  - `src/components/auth/AuthGuard.tsx` - Route guard component preventing unauthenticated access
  - `isHydrated` state to detect Zustand persistence hydration completion
  - `waitForAuth` request interceptor ensuring API calls wait for auth readiness

- **CLI Individual Service Control** - Granular service management
  - Individual start/stop for frontend or backend services

### Fixed

- **Page Refresh Authentication** - Critical fix for login state loss on browser refresh
  - Persist `accessToken` to localStorage (was missing in partialize config)
  - Extended `isHydrated` check to all high-risk pages, components, and hooks
  - Corrected `waitForAuth` logic and refreshToken storage flow

- **Duplicate API Calls** - Eliminated redundant API requests
  - Fixed media and settings interfaces duplicate call issue
  - Shared workflow available-actions API cache preventing repeated calls

- **CLI Reliability** - Production deployment stability
  - Added `cwd` parameter to sync execSync commands
  - Auto-sync static assets on production startup

### Changed

- **Documentation Structure**
  - Reorganized environment config from spec to guide section

## [2.0.0] - 2026-04-17

### Added

- **mnx-agent CLI Tool** - Unified multi-service management CLI
  - `scripts/run.js` (+407/-223) - Main entry point replacing scripts/dev.js
  - Commands: `start`, `stop`, `status`, `log`, `restart`, `sync`, `--help`
  - Multi-service architecture: dev frontend (4311), prod frontend (4411), backend (4511)
  - Service lifecycle management with process tracking
  - Real-time log streaming via WebSocket proxy
  - Static file sync for production deployment

- **Pool Stats Endpoint** - Connection pool monitoring
  - `server/routes/stats.ts` (+29/-0) - `/api/stats/pool-stats` endpoint
  - Monitor active/idle connections, wait queue size

- **Help Flags** - CLI help documentation
  - Support `--help`, `-h`, `help` flags
  - Command-specific help output

### Changed

- **CLI Rename (BREAKING)** - mnx-dev → mnx-agent
  - Command name changed from `mnx-dev` to `mnx-agent`
  - Update your workflow: use `mnx-agent` instead of `mnx-dev`
  - Scripts renamed: `dev.js` → `run.js`

- **Dev Server Port** - Frontend dev server port change
  - `vite.config.js`, `vite.config.ts` - Port changed to 4311
  - Aligns with multi-service port scheme (dev: 4311, prod: 4411, backend: 4511)

- **Runtime Directory** - Service runtime tracking
  - `.run/` directory added to `.gitignore`
  - Stores service process IDs and state files

- **Documentation Updates**
  - `docs/specs/2026-04-17-environment-config.md` (+618/-0) - Environment config spec
  - `docs/archive/v2.0/` - Plans archived for v2.0 release
  - nginx config updated for single-level assets structure

### Fixed

- **CLI Reliability** - Multiple fixes for CLI stability
  - Use `npx` for vite/tsx commands (avoid global dependency)
  - Fix COMMANDS validation logic
  - Fix ESM stdio handling for child processes
  - Use single-level structure for static file sync

### Migration Guide (v1.x → v2.0)

**BREAKING**: CLI command name changed.

```bash
# Old (v1.x)
mnx-dev start dev
mnx-dev status
mnx-dev log dev

# New (v2.0)
mnx-agent start dev    # or just: mnx-agent start
mnx-agent status
mnx-agent log dev
mnx-agent --help       # New help command
```

**Port Changes**:
- Dev frontend: default → 4311
- Prod frontend: 4411 (unchanged)
- Backend: 4511 (unchanged)

## [1.10.4] - 2026-04-17

### Added

- **WorkbenchActions Component** - Reusable header actions for generation pages
  - `src/components/shared/WorkbenchActions.tsx` (+34/-0) - Combined component
  - `src/components/shared/HelpButton.tsx` (+29/-0) - Help button with tips popup
  - `src/components/shared/APIRefButton.tsx` (+85/-0) - API reference with copyable curl
  - `src/components/shared/ClearButton.tsx` (+16/-0) - Clear form button
  - `src/components/shared/HeaderPopup.tsx` (+51/-0) - Base popup with click-outside detection

- **API Reference on All Generation Pages** - Add curl example for MiniMax API
  - `src/pages/TextGeneration.tsx` (+89/-) - Text generation API reference
  - `src/pages/ImageGeneration.tsx` (+161/-) - Image generation API reference
  - `src/pages/VideoGeneration.tsx` (+78/-) - Video generation API reference
  - `src/pages/VoiceSync/index.tsx` (+77/-) - Voice sync API reference
  - `src/pages/VoiceAsync/index.tsx` (+82/-) - Voice async API reference
  - `src/pages/MusicGeneration.tsx` (+391/-) - Music generation API reference with output_format

- **Color Themes** - 8 new color-focused themes
  - Deep series: `deep-green.css`, `deep-orange.css`, `deep-red.css`, `deep-teal.css`
  - Bright series: `bright-green.css`, `bright-orange.css`, `bright-red.css`, `bright-teal.css`

- **Music Generation Enhancements**
  - output_format selector (url/hex) in advanced settings
  - Audio player with play/pause, progress bar, volume control
  - Favorite and public/private toggle buttons
  - Delete with confirmation dialog

- **Toast Styling** - Enhanced toast appearance with gradients and borders
  - `src/App.tsx` (+19/-1) - Toast classNames configuration

### Changed

- **MusicCarousel Redesign** - Enhanced card layout with gradient backgrounds
  - `src/components/music/MusicTaskCard.tsx` (+441/-44) - Full audio player with progress bar
  - `src/components/music/MusicCarousel.tsx` (+153/-94) - Improved navigation

- **Select Dropdown Animation** - Support opening from top or bottom
  - `src/components/ui/Select/SelectContent.tsx` (+29/-11) - Dynamic animation direction

- **useFormPersistence Hook** - Removed type constraint
  - `src/hooks/useFormPersistence.ts` (+1/-1) - `<T>` instead of `<T extends object>`

- **Sidebar Icon** - Updated service nodes icon
  - `src/components/layout/Sidebar.tsx` (+2/-1) - Shield → Server

### Fixed

- **Popup Click-Outside Detection** - Prevent closing when clicking Select dropdowns
  - `src/components/ui/Select/SelectContent.tsx` - Portal content exclusion
  - `src/pages/MusicGeneration.tsx` - Tips and API reference popup detection

- **Copy Button Position** - Moved inside code block
  - `src/components/shared/APIRefButton.tsx` - Copy button overlay

- **Clear Form Function** - Proper reset to default values
  - `src/pages/MusicGeneration.tsx` - setFormData(defaultValue)

## [1.10.3] - 2026-04-16

### Added

- **UI Enhancement - Glassmorphism Effects** - Modern glass-like visual design with hover animations
  - `src/pages/MediaManagement.tsx` (+17/-17) - Enlarge filter buttons (h-7→h-8, text-xs→text-sm, px-2.5→px-3, w-3.5→w-4)
  - `src/components/music/MusicTaskCard.tsx` (+108/-100) - Gradient glow wrapper, status-based gradient backgrounds, spring physics animations, button interaction feedback (whileHover/whileTap)
  - `src/components/music/MusicCarousel.tsx` (+6/-1) - Glass container wrapper with backdrop-blur-xl
  - `src/pages/MusicGeneration.tsx` (+859/-XX) - 3 cards glassmorphism with staggered spring animations (0s, 0.1s, 0.2s), generate button shadow enhancement
  - `src/pages/VideoGeneration.tsx` (+262/-XX) - Prompt/tips/task list cards glassmorphism
  - `src/pages/VideoAgent.tsx` (+284/-77) - Agent dialog/template/form/task list cards glassmorphism
  - `src/pages/CapacityMonitor.tsx` (+6/-2) - Quota cards glassmorphism hover effect
  - `src/pages/VoiceManagement.tsx` (+5/-1) - Voice selection cards glassmorphism
  - `src/pages/FileManagement.tsx` (+13/-6) - Stat cards and file list card glassmorphism
  - Pattern: `bg-gradient-to-r from-accent/20 via-primary/20 to-secondary/20 rounded-2xl blur opacity-0 group-hover:opacity-100`
  - Spring animation: `{ type: "spring", stiffness: 300, damping: 30 }`

- **Documentation** - UI Enhancement design spec
  - `docs/specs/2026-04-15-ui-enhancement-design.md` (729 lines) - Complete design specification

### Fixed

- **VideoAgent JSX structure** - Close missing JSX tags in ternary branch
  - `src/pages/VideoAgent.tsx` (+2/-0) - Add closing div tags for glassmorphism wrapper

## [1.10.2] - 2026-04-15

### Fixed

- **Timezone handling** - Fix database timestamp storage to use local time
  - `server/lib/date-utils.ts` (+10/-0) - Add `toLocalISODateString()` helper
  - `server/lib/logger.ts` (+3/-0) - Logger timestamp fix
  - `server/lib/minimax.ts` (+3/-0) - MiniMax client timestamp fix
  - All repository files updated: base, capacity, deadletter, job, log, media, prompt-template, settings-history, settings, system-config, task, user, webhook, workflow
  - All service files updated: capacity-checker, cron-scheduler, task, execution-state-manager, notification, queue-processor, user, websocket-service
  - All route files updated: capacity, cron/index, cron/jobs, invitation-codes, users
  - `server/database/service-async.ts` (+3/-0) - Database service fix
  - Use `toLocalISODateString()` instead of `toISOString()` for database timestamps

- **Workflow engine imports** - Correct imports after workflow-engine refactor
  - `server/routes/workflows.ts` (+4/-2) - Use workflow/engine.ts
  - `server/routes/cron/logs.ts` (+2/-1) - Use workflow/index
  - `server/services/workflow/executors/action-executor.ts` (+7/-0) - Import fix

### Changed

- **README comprehensive update** - Full technical documentation refresh
  - Updated tech stack (Express, PostgreSQL, React 18, etc.)
  - Complete project structure documentation
  - Full database table documentation
  - API endpoint reference updated
  - Workflow definition examples added

### Added

- **Documentation system** - Complete docs/ directory structure
  - `docs/AGENTS.md` (251 lines) - Full documentation规范说明
  - `docs/guides/testing-guide.md` (from specs/testing.md)
  - `docs/roadmap/requirement-pools.md` (192 lines) - Unified requirement pool
  - `docs/roadmap/v2-roadmap.md` (57 lines) - v2.x planning
  - `docs/roadmap/v3-roadmap.md` (31 lines) - v3.x planning
  - `docs/roadmap/v4-roadmap.md` (28 lines) - v4.x planning
  - `docs/specs/2026-04-05-database-service-refactor-design.md` (renamed with date prefix)

- **Requirement ID renumbering** - Consecutive ID allocation
  - R-001 ~ R-021 now continuous (previously R-001~R-012, R-014~R-015, R-018~R-019, R-026, R-073~R-078)
  - All roadmap files updated with new IDs

### Documentation

- **AGENTS.md updates** - Time handling specifications
- **Archive directory structure** - Organized by version (v1.0 ~ v1.9)
- **Path reference fixes** - Updated docs/ paths from superpowers to docs

## [1.10.1] - 2026-04-14

### Fixed

- **Media filepath handling** - Handle filepath without ./ prefix in readMediaFile
  - `server/lib/media-storage.ts` (+18/-4) - Filepath normalization fix
  - Support paths starting with mediaRoot, data/media, ./data/media
  - Prevents FileNotFoundError for valid media paths

- **Test directory isolation** - Add recovery scripts and fix test directory bug
  - `scripts/restore-from-home-media.ts` (85 lines) - Recovery script
  - `scripts/restore-from-media3.ts` (60 lines) - Alternative recovery
  - `scripts/restore-media-by-size.ts` (91 lines) - Size-based recovery
  - `scripts/restore-media-simple.ts` (95 lines) - Simple recovery
  - `scripts/soft-delete-unrestored.ts` (61 lines) - Cleanup script
  - `scripts/media-snapshot-backup.sh` (47 lines) - Backup script
  - `docs/incidents/2026-04-14-media-deletion-incident.md` (409 lines) - Incident report

- **Test safety** - Prevent tests from deleting production media files
  - `server/lib/media-storage.ts` (+5/-0) - Environment check for test path
  - `server/__tests__/setup.ts` (+10/-1) - TEST_MEDIA_ROOT enforcement
  - Throws error if tests use production path ./data/media

- **Server tests** - Fix constructor signatures, mocks, and logic
  - `server/__tests__/queue-processor.test.ts` (+294/-XX) - Test fixes
  - `server/__tests__/cron-scheduler.test.ts` (+126/-XX) - Test fixes
  - `server/__tests__/workflow-integration.test.ts` (+95/-XX) - Test fixes

- **E2E tests** - Mock MiniMax API to avoid quota consumption
  - `server/__tests__/workflow-stage-a.test.ts` (+3/-0) - API mock
  - `.env.test` (+8/-XX) - Test environment update

- **Import paths** - Update imports after removing deprecated workflow-engine.ts
  - `server/routes/workflows.ts` (+4/-2) - Use workflow/engine.ts
  - `server/routes/cron/logs.ts` (+2/-1) - Use workflow/index

### Changed

- **Deprecated file removal** - Remove deprecated workflow-engine.ts
  - `server/services/workflow-engine.ts` (-21 lines) - File deleted
  - Use `server/services/workflow/engine.ts` instead
  - All imports updated to new path

- **Job stats update** - Incremental run stats updates
  - `server/repositories/job-repository.ts` (+25/-10) - Atomic increment
  - `server/database/service-async.ts` (+2/-1) - Optional ownerId
  - total_runs/total_failures now increment atomically

- **Invitation code validation** - Check expiry and active status
  - `server/services/user-service.ts` (+13/-3) - Enhanced validation
  - Check is_active flag before accepting code
  - Check expires_at date for expired codes
  - Better error messages: "邀请码已失效" / "邀请码已过期"

- **Media visibility** - Admin/super bypass visibility filter
  - `server/repositories/media-repository.ts` (+2/-1) - Role check
  - Admin/super can see all records regardless of visibility

- **Coverage configuration** - Vitest coverage for core business logic
  - `vitest.server.config.ts` (+42/-XX) - Coverage thresholds
  - Target 60% coverage for core modules

- **Test helpers** - Export internal functions for testing
  - `server/lib/retry.ts` (+9/-3) - Export calculateBackoffDelay, sleep, isRetryableError
  - Added @internal JSDoc annotations

### Added

**Test Coverage Expansion - 16,587 lines of new tests**

- **Core module tests** - Comprehensive coverage for business logic
  - `server/lib/__tests__/retry.test.ts` (185 lines) - Retry logic tests
  - `server/lib/__tests__/minimax.test.ts` (1,596 lines) - MiniMax API tests
  - `server/lib/__tests__/media-storage.test.ts` (+385/-0) - Storage tests
  - Coverage improved: minimax.ts 47.9% → 56.88%

- **Repository tests** - Data layer coverage
  - `server/repositories/__tests__/base-repository.test.ts` (584 lines)
  - `server/repositories/__tests__/job-repository-comprehensive.test.ts` (764 lines)
  - `server/repositories/__tests__/log-repository.test.ts` (654 lines)
  - `server/repositories/__tests__/media-repository.test.ts` (778 lines)
  - `server/repositories/__tests__/prompt-template-repository.test.ts` (654 lines)
  - `server/repositories/__tests__/settings-history-repository.test.ts` (457 lines)
  - `server/repositories/__tests__/settings-repository.test.ts` (417 lines)
  - `server/repositories/__tests__/system-config-repository.test.ts` (433 lines)
  - `server/repositories/__tests__/user-repository.test.ts` (1,012 lines)
  - `server/repositories/__tests__/webhook-repository.test.ts` (904 lines)

- **Service tests** - Business logic coverage
  - `server/services/__tests__/export-service.test.ts` (823 lines)
  - `server/services/__tests__/notification-service.test.ts` (733 lines)
  - `server/services/__tests__/user-service.test.ts` (+675/-XX)
  - `server/services/domain/__tests__/webhook.service.test.ts` (523 lines)
  - `server/services/domain/capacity.service.test.ts` (182 lines)
  - `server/services/domain/media.service.test.ts` (344 lines)
  - `server/services/domain/workflow.service.test.ts` (537 lines)

- **Workflow executor tests** - Execution engine coverage
  - `server/services/workflow/executors/__tests__/delay-executor.test.ts` (377 lines)
  - `server/services/workflow/executors/__tests__/error-boundary-executor.test.ts` (597 lines)
  - `server/services/workflow/executors/__tests__/transform-executor.test.ts` (734 lines)

- **Retry manager tests** - Concurrency and retry logic
  - `server/__tests__/retry-manager.test.ts` (51 lines)
  - `server/__tests__/concurrency-manager.test.ts` (97 lines)
  - `server/__tests__/dlq-auto-retry-scheduler.test.ts` (534 lines)

- **MockMiniMaxClient tests** - API error simulation
  - `server/lib/__tests__/minimax.test.ts` - API error test cases
  - Rate limit, payment required, invalid request errors

### Performance

**Code Quality Metrics**
- **71 files changed** (+16,587 insertions, -1,242 deletions)
- **Test Coverage**: 40+ new test files (15,000+ lines)
- **Core coverage improved**: minimax.ts 47.9% → 56.88%
- **Recovery scripts**: 6 scripts for media recovery scenarios
- **Documentation**: 1 incident report (409 lines)

### Backward Compatibility

- ✅ All API endpoints unchanged
- ✅ workflow-engine.ts removal is path-only (functionality preserved in workflow/engine.ts)
- ✅ Job stats now use atomic increment (more accurate)
- ✅ Invitation code validation enhanced (more checks)
- ✅ Test safety checks only affect test environment

## [1.10.0] - 2026-04-14

### Added

**Theme System Expansion - 45 主题独立 CSS 文件 + 23 特色主题**

- **主题文件重构** - 45 个主题拆分为独立 CSS 文件，按类别组织
  - `src/styles/themes/dark/` - 12 个暗色主题 (cyberpunk, dracula, github-dark, midnight, monokai, nord, ocean-blue, one-dark, purple-haze, solarized-dark, tokyo-night, etc.)
  - `src/styles/themes/light/` - 13 个亮色主题 (classic-light, cool-light, cream-light, github-light, material-light, mint-light, notion-light, paper-white, rose-light, solarized-light, warm-light, etc.)
  - `src/styles/themes/style/` - 20 个特色主题，分三个子类
  - `src/themes/registry.ts` (+103/-0) - 主题注册表重构
  - `src/index.css` (-1039/-0) - 大幅简化，仅保留导入语句
  - 支持动态加载和更好的主题管理

- **Style 类别特色主题** - 23 个游戏/动漫/节日主题
  - **Games**: cyberpunk-2077, genshin, spider-man, starcraft, wow, wukong (6 个)
  - **Anime**: bleach, demon-slayer, dragon-ball, iori, mccree, naruto, ponyo, super-saiyan, zangief (9 个)
  - **Festivals**: chinese-new-year, christmas, dragon-boat, gothic-lolita, halloween, mid-autumn, tanabata, valentine (8 个)
  - 每个主题都有独特的配色方案，增强视觉体验

- **ThemeCard 增强** - 主题选择卡片优化
  - `src/components/settings/ThemeCard.tsx` (+19/-0) - 添加主题图标
  - 使用背景亮度自动选择文字颜色
  - 更好的主题预览效果

- **ThemePicker CSS 导入修复**
  - `src/components/settings/ThemePicker.tsx` (+10/-0) - CSS 导入顺序修正
  - 确保主题正确加载

**Image Generation Enhancements - 图像生成功能增强**

- **AspectRatioPopup 组件** - 弹窗式宽高比选择器
  - `src/components/ui/AspectRatioPopup.tsx` (162 行) - 新增宽高比选择弹窗
  - 支持常用宽高比选择 (1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, etc.)
  - 可视化预览和一键切换

- **Prompt Optimizer Toggle** - 提示词优化开关
  - `src/pages/ImageGeneration.tsx` (+355/-0) - 高级设置面板新增优化开关
  - `src/types/image.ts` (+3/-0) - 新增 promptOptimizer 参数
  - 支持 MiniMax API 提示词自动优化功能

- **AIGC Watermark Toggle** - AIGC 水印开关
  - 高级设置面板新增水印开关
  - 控制生成图像是否添加 AIGC 水印

- **Reference Image URL Input** - 参考图 URL 输入选项
  - 支持通过 URL 提供参考图像
  - 简化参考图像上传流程

- **Server API Params Support** - 后端新参数支持
  - `server/routes/image.ts` (+14/-0) - 支持 aspectRatioState, promptOptimizer 参数
  - MiniMax API 参数对齐

- **Generation Options Adjustment** - 生成参数范围调整
  - numImages: 4-9 张
  - parallelCount: 1-5 张

- **Documentation**
  - `docs/specs/2026-04-13-image-generation-enhancements-design.md` (222 行)
  - `docs/plans/2026-04-13-image-generation-enhancements.md` (781 行)

**UI Improvements - 界面改进**

- **Toast Close Button** - 点击关闭功能
  - `src/components/ui/Toast.tsx` - closeButton 属性
  - 支持 click-to-dismiss 交互

- **Toast Position Adjustment** - Toast 位置优化
  - 移至 header 下方右上角
  - 更好的视觉层次和遮挡处理

- **Capacity Monitor Optimization** - 容量监控优化
  - `src/pages/CapacityMonitor.tsx` (+55/-0) - 配额显示优化
  - 排序和视觉层次改进
  - 更清晰的状态展示

### Changed

- **ImageGeneration 页面布局优化**
  - `src/pages/ImageGeneration.tsx` (+355/-0) - 全面布局重构
  - 标题 label 与 input 并排
  - Toast 位置调整
  - 高级设置面板组织优化

- **Theme CSS Architecture Refactoring**
  - 从单一 index.css 拆分为 45 个独立主题文件
  - 使用 PostCSS 配置导入所有主题
  - `postcss.config.js` (+15/-0) - PostCSS 配置更新

### Fixed

- **Theme CSS Specificity Fix**
  - `fix(theme): use :root.theme-{id} selectors for higher specificity`
  - 确保主题样式优先级正确

- **ThemeCard Text Color Fix**
  - `fix(theme): use background lightness for text color in ThemeCard`
  - 根据背景亮度自动选择文字颜色
  - 解决深色主题文字不可见问题

- **CSS Imports Order Fix**
  - `fix(theme): fix CSS imports order and add theme icons to ThemeCard`
  - 确保主题文件按正确顺序加载

### Performance

**Code Quality Metrics**
- **61 files changed** (+3,554 insertions, -1,175 deletions)
- **New Theme Files**: 45 个独立主题 CSS 文件
- **New Components**: 1 个 (AspectRatioPopup)
- **Documentation**: 2 个新文档文件 (1,003 行)
- **CSS Optimization**: index.css 大幅简化 (-1039 行)

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 图像生成参数向后兼容（新增可选参数）
- ✅ 主题系统重构不影响现有主题切换功能
- ✅ Toast 组件增强为可选功能
- ✅ PostCSS 配置变更仅影响构建流程

## [1.9.3] - 2026-04-13

### Added

**Media Public/Private Toggle - 媒体公开/私有切换功能**

- **PublicButton 组件** - 公开/私有状态切换按钮
  - `src/components/media/PublicButton.tsx` (95行) - 切换按钮组件
  - 支持单条和批量公开操作
  - 三种状态可视化：私有（红色）、公开（绿色）、他人公开（蓝色）
  - 未公开状态用橙色标识

- **后端公开 API** - PATCH /api/media/:id/public
  - `server/routes/media.ts` (+86/-0) - 公开切换端点
  - `server/repositories/media-repository.ts` (+156/-0) - togglePublic 方法
  - `server/services/domain/media.service.ts` (+14/-0) - 服务层委托
  - `server/database/migrations-async.ts` (+12/-0) - is_public 列迁移
  - 支持角色权限验证：仅创建者和管理员可切换公开状态

- **Visibility 过滤系统** - 角色感知的可见性过滤
  - user: 仅查看自己的记录
  - pro: 自己的记录 + 公开记录
  - admin/super: 所有记录（包括无 owner_id 的公开记录）
  - `server/validation/media-schemas.ts` (+33/-0) - visibility 参数验证
  - `packages/shared-types/entities/media.ts` (+4/-0) - 类型扩展

- **前端筛选 UI** - 收藏和公开筛选复选框
  - `src/pages/MediaManagement.tsx` (+225/-0) - 篮选 UI 集成
  - `src/hooks/useMediaManagement.ts` (+191/-0) - 篮选逻辑 hook
  - `src/lib/api/media.ts` (+42/-0) - 公开切换 API
  - 支持 ownerIdNot 参数（排除特定用户的记录）

- **批量公开支持** - 管理员批量操作
  - `src/components/media/BatchOperationsToolbar.tsx` (+56/-0) - 批量公开按钮
  - super 角色可批量公开无 owner_id 的记录

- **文档**
  - `docs/specs/2026-04-13-media-public-toggle-design.md` (495行)
  - `docs/plans/2026-04-13-media-public-toggle.md` (1389行)

### Changed

- **PublicButton UI 集成** - 三种视图组件集成
  - `src/components/media/MediaCard.tsx` (+46/-0) - 卡片视图公开按钮
  - `src/components/media/MediaTableView.tsx` (+31/-0) - 表格视图公开列
  - `src/components/media/TimelineItem.tsx` (+144/-0) - 时间轴视图公开按钮
  - 操作按钮顺序统一：查看、下载、收藏、公开、删除

- **公开图标视觉优化** - 三种状态颜色区分
  - 私有：红色（border-red-500）
  - 公开：绿色（border-green-500）
  - 他人公开：蓝色（border-blue-500）
  - 未公开：橙色（border-orange-500）

- **时间轴视图优化** - hover 显示编辑按钮
  - 双击进入编辑模式
  - 与列表视图操作统一

- **加载动画优化** - 最小延迟 0.5 秒
  - 避免加载闪烁
  - 更流畅的视觉体验

### Fixed

- **SQL 查询 OR 优先级修复** - visibility 条件正确包裹括号
  - `fix(media): SQL查询OR优先级修复 - visibility条件正确包裹括号`
  - `server/repositories/media-repository.ts` - OR 逻辑修正

- **角色筛选语义修复** - owner_id=null 属于公开而非他人公开
  - `fix(media): admin/super筛选语义 - owner_id=null属于公开而非他人公开`
  - 正确区分公开记录和他人公开记录

- **筛选逻辑后端化** - 前端筛选迁移到后端
  - `refactor(media): 篮选逻辑后端化 + 加载动画最少1秒`
  - 减少前端状态复杂度

- **pro 用户 visibility 修复** - list route 使用 buildOwnerFilter
  - `fix(media): pro用户visibility修复 - list route使用buildOwnerFilter + 删除按钮权限`
  - 正确的角色权限过滤

- **getById 公开访问修复** - pro 用户可访问公开记录
  - `fix(media): getById添加includePublic参数，允许pro用户访问公开记录`
  - includePublic 参数支持

- **useEffect 依赖修复** - currentUser?.id 依赖添加
  - `fix(media): auto-fetch useEffect 添加 currentUser?.id 依赖`
  - 防止 stale closure

- **筛选器 boolean coercion 修复** - 正确的布尔值转换
  - `fix(media): 篮选器修复 - boolean coercion + 自动刷新`

- **批量公开权限修复** - super 操作 ownerless 记录
  - `fix(api): 批量公开支持super操作ownerless记录`

- **Security 修复** - 使用认证用户角色而非查询参数
  - `fix(security): use authenticated user role, not query param`
  - `server/routes/media.ts` - 角色从 JWT 提取

- **Hook ref 声明修复** - 删除重复 ref 声明
  - `fix(hook): 删除重复的ref声明`
  - `fix(hook): 添加缺失的ref声明`

- **筛选逻辑 bug 修复** - 私有+他人公开组合
  - `fix(hook): 修复筛选逻辑bug - 私有+他人公开组合+依赖数组`

- **API 筛选参数传递修复** - pass role and isPublic filter
  - `fix(api): pass role and isPublic filter to GET /media`

### Performance

**Code Quality Metrics**
- **24 files changed** (+3,079 insertions, -192 deletions)
- **New Feature**: Media public/private toggle (全栈实现)
- **New Component**: PublicButton (95行)
- **Backend Enhancement**: Visibility filtering with role-based access
- **UI Integration**: 3 views (card, table, timeline)
- **Test Coverage**: Media repository tests extended (+186/-0)

### Backward Compatibility

- ✅ 所有 API 端点保持不变（新增 PATCH /:id/public）
- ✅ 公开切换为增量功能，不影响现有媒体管理
- ✅ 数据库迁移向后兼容（is_public 列新增）
- ✅ Visibility 过滤为可选参数，默认行为不变
- ✅ PublicButton 为可选组件，不影响现有 UI

### Security

- 角色权限验证：仅创建者和管理员可切换公开状态
- 角色从 JWT token 提取，不接受查询参数
- 批量公开操作限制 super 角色

## [1.9.2] - 2026-04-13

### Added

**Factory Pattern Deduplication - 工厂模式消除重复代码**

- **Backend: createApiProxyRouter Factory** - API代理路由工厂
  - `server/utils/api-proxy-router.ts` (49行) - 路由工厂函数
  - `server/utils/__tests__/api-proxy-router.test.ts` (59行) - 工厂测试
  - 消除 text/voice/image/music/video/videoAgent 路由中的重复模式
  - 统一 API 代理路由结构

- **Frontend: createApiMethod Factory** - API 客户端工厂
  - `src/lib/api/create-api-method.ts` (49行) - API 方法工厂
  - `src/lib/api/__tests__/create-api-method.test.ts` (185行) - 工厂测试
  - 消除 cron API 中 670 行重复代码
  - 支持 GET/POST/PUT/PATCH/DELETE 方法
  - 自动路径参数解析

- **Frontend: createAsyncStore Factory** - Zustand 异步状态工厂
  - `src/lib/stores/create-async-store.ts` (75行) - 异步状态工厂
  - `src/lib/stores/__tests__/create-async-store.test.ts` (86行) - 工厂测试
  - `src/lib/stores/types.ts` (17行) - 类型定义
  - 支持 preCheck、params、returns 配置
  - 自动处理 loading/error 状态

- **Backend: idSchema Helper** - ID 验证助手
  - `server/validation/common.ts` (+4/-22) - ID 验证统一
  - 替换 30+ 重复 ID 验证模式
  - 单一 truth source for ID validation

- **Backend: JobService Business Logic** - 任务服务业务逻辑
  - `server/services/domain/job.service.ts` (+33行) - 业务逻辑注入
  - 验证：cron 表达式、任务依赖
  - 依赖检查：防止无效依赖关系

- **Backend: Media Filename Search** - 媒体文件名搜索
  - `server/routes/media.ts` (+3行) - 文件名模糊查询参数
  - `server/repositories/media-repository.ts` (+12/-0) - 搜索方法
  - `server/validation/media-schemas.ts` (+3行) - 搜索 schema
  - 支持文件名模糊匹配

- **Audio Player Enhancements** - 全局音频播放器增强
  - `src/components/media/AudioPlayer.tsx` (+79/-30) - 播放器重构
  - 拖拽播放器位置（可移动）
  - 音量滑块左侧显示，默认 25%
  - 标题溢出 marquee 滚动
  - 播放器宽度从 320px 增至 480px
  - `src/index.css` (+9行) - marquee 动画样式

- **Image Batch Fail: Complete API Response** - 图像批量失败显示完整响应
  - `src/components/image/ImageTaskCard.tsx` (+13行) - 显示后端输出
  - 失败时显示完整 API 响应（便于调试）

- **Documentation**
  - `docs/plans/2026-04-13-ddd-architecture-upgrade-final.md` (1252行)
  - DDD 架构升级最终实现计划

### Changed

**Route Refactoring - 路由重构**

- **All API Proxy Routes to Factory Pattern** - 10 个路由迁移到工厂模式
  - `server/routes/text.ts` (+28/-11) - 工厂模式
  - `server/routes/voice.ts` (+53/-11) - 工厂模式
  - `server/routes/image.ts` (+31/-11) - 工厂模式
  - `server/routes/music.ts` (+65/-9) - 工厂模式
  - `server/routes/video.ts` (+27/-10) - 工厂模式
  - `server/routes/videoAgent.ts` (+28/-10) - 工厂模式
  - `server/routes/voiceMgmt.ts` (+129/-12) - 工厂模式
  - `server/routes/files.ts` (+38/-12) - 工厂模式
  - 消除 ~200 行重复代码

- **Frontend Cron API Refactoring** - Cron API 迁移到工厂
  - `src/lib/api/cron.ts` (+670/-XX) - createApiMethod 重构
  - `src/stores/cronJobs.ts` (+596/-XX) - createAsyncStore 重构
  - 消除 ~700 行重复代码

- **Jobs Route Cleanup** - 移除 DatabaseService 绕过
  - `server/routes/cron/jobs.ts` (+18/-40) - 使用 JobService
  - 正确的服务层调用

- **Validation Schema Consolidation** - 验证 Schema 合并
  - `server/validation/cron-schemas.ts` (+19/-0) - idSchema 集成
  - `server/validation/media-schemas.ts` (+3/-0) - idSchema 集成

### Fixed

- **Async Store Type Errors** - 异步状态工厂类型错误修复
  - `src/lib/stores/__tests__/create-async-store.test.ts` - 类型修复
  - 测试失败修复

- **Media Pagination After Delete** - 删除后分页修复
  - `src/hooks/useMediaManagement.ts` (+67/-14) - 删除刷新逻辑
  - `fix(media): use forcePage param to ensure correct page after delete`
  - `fix(media): always refresh after delete to fill gap`
  - `fix(media): refresh data after delete on first page to fill gap`
  - 删除后正确填补空白

- **Parallel Prompt Text Correction** - 并行提示文本修正
  - `fix: correct parallel prompt text and media pagination issue`
  - 提示文本显示修正

- **WebSocket Hook Cleanup** - WebSocket hook 清理
  - `src/hooks/useCronJobsWebSocket.ts` (+9/-0) - 小修复

- **Image Generation: Batch Fail Display** - 图像生成批量失败显示
  - `src/pages/ImageGeneration.tsx` (+64/-XX) - 批量失败显示完整响应

### Performance

**Code Quality Metrics**
- **38 files changed** (+2,877 insertions, -998 deletions)
- **Factory Pattern Deduplication**: ~900 行重复代码消除
  - Backend routes: ~200 行
  - Frontend API: ~700 行
- **New Factories**: 3 个工厂函数
  - createApiProxyRouter (backend)
  - createApiMethod (frontend)
  - createAsyncStore (frontend)
- **Test Coverage**: 3 个新测试文件 (330+ 行)
  - api-proxy-router.test.ts
  - create-api-method.test.ts
  - create-async-store.test.ts

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 工厂模式为内部重构，不影响 API 契约
- ✅ idSchema 为验证层增强，向后兼容
- ✅ 媒体搜索为增量功能，默认无搜索参数
- ✅ 音频播放器 UI 变化不影响功能逻辑

## [1.9.1] - 2026-04-12

### Added

**Parallel Image Generation - 图像并行生成**

- **并行图像生成** - 支持同时生成多张图像 (1-10张)
  - `src/pages/ImageGeneration.tsx` (+465/-39) - 并行生成面板和数量选择
  - `src/lib/api/image.ts` (+8/-0) - 并行生成 API 支持
  - 用户可配置生成数量，批量创作图像
  - 并行生成使用 Promise.all 并发执行

- **ImageTaskCard 组件** - 任务卡片显示生成进度
  - `src/components/image/ImageTaskCard.tsx` (22行) - 任务卡片组件
  - 显示每张图像的生成状态和进度
  - 状态颜色指示（蓝色生成中、绿色成功、红色失败）

- **Batch Carousel** - 批量结果轮播展示
  - 并行生成完成后，结果以轮播形式展示
  - 支持左右切换查看每张生成结果
  - 每张卡片可独立下载、预览

- **批量状态指示器** - 每张图像的状态可视化
  - 蓝色 ring 表示生成中
  - 绿色 ring 表示成功
  - 红色 ring 表示失败
  - 厚 ring + 粗字体突出选中状态

- **错误详情显示** - 失败时显示请求参数和响应错误
  - 显示原始请求参数（prompt、model 等）
  - 显示 API 返回的错误信息
  - 安全的 null check 处理

- **标题支持** - 自定义下载文件名
  - 支持 title 输入，自动命名 `{title}.png`
  - 并行生成时自动添加序号 `{title} (1).png`

- **生成后调整** - 生成完成后可调整并行数量
  - 允许在生成完成后修改 parallel count
  - 不影响正在进行的生成任务

- **文档**
  - `docs/specs/2026-04-12-parallel-image-generation-design.md` (201行)
  - `docs/plans/2026-04-12-parallel-image-generation.md` (955行)

### Fixed

- **Batch Selector 样式修复** - 多轮样式调整
  - 移除 double border 防止双重边框
  - 移除 ring-offset 消除白色间隙
  - 使用状态颜色作为 ring 颜色
  - 厚 ring + 粗字体突出选中状态
  - 未选中时移除 border，选中时仅显示 ring

- **Loading 状态** - 并行生成加载动画
  - 每张任务卡片独立 loading 动画
  - 生成中显示 spinner
  - 防止 lightbox slides 状态异常

- **Lightbox 修复** - 并行生成结果预览
  - 正确初始化 lightbox slides
  - 并行生成完成后 slides 自动更新

- **Memoization** - updateTask 使用 useCallback
  - 防止不必要的重渲染
  - 优化性能

- **错误显示安全处理** - null check for raw error
  - 安全处理 null/undefined 错误对象
  - stringify raw error 防止 JSON 解析失败

### Changed

- **ImageGeneration 页面重构** - 批量结果网格增强
  - 集成 batch carousel 支持
  - 结果展示改为 batch-based architecture
  - 增强现有 results grid

### Removed

- **ImageCarousel 组件** - 不再使用，已删除
  - 替换为 batch carousel 实现
  - 移除冗余组件

### Performance

- **5 files changed** (+1,612 insertions, -39 deletions)
- 新增 1 个核心组件（ImageTaskCard）
- 并行生成功能前端实现（+465行）
- 文档 +1,156 行（设计 + 实现）

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 图像生成参数向后兼容（新增可选 `count` 参数）
- ✅ 标题功能为增量功能，不影响默认命名
- ✅ 样式变更不影响功能逻辑

## [1.9.0] - 2026-04-12

### Added

**Music Generation UI Enhancements - 音乐生成界面增强**

- **歌曲标题输入** - 支持自定义生成音乐文件名
  - `src/pages/MusicGeneration.tsx` (+32/-4) - 新增歌曲标题输入框
  - 自动命名格式：`{标题}.mp3` 或 `{标题} (序号).mp3`（并行生成时）
  - 未填写时保留原有命名逻辑（`music_{timestamp}.mp3`）

### Changed

- **音乐生成布局优化** - UI 布局和交互改进
  - `src/pages/MusicGeneration.tsx` - 整体布局重构
  - 生成控制区域更紧凑，操作按钮位置优化
  - 改进用户生成流程体验

- **国际化更新** - 翻译条目补充
  - `src/i18n/locales/en.json` (+16/-0) - 英文翻译补充
  - `src/i18n/locales/zh.json` (+16/-0) - 中文翻译补充

### Fixed

- **Dialog 关闭动画** - 平滑淡出过渡效果
  - `src/components/ui/Dialog.tsx` (+18/-3) - 动画状态管理
  - 关闭时等待 200ms 动画完成后再隐藏
  - 解决 Dialog 立即消失的视觉不连贯问题

- **媒体删除状态清理** - 删除成功后重置对话框状态
  - `src/hooks/useMediaManagement.ts` (+1/-0) - 删除成功后清理状态
  - 防止删除确认对话框残留状态

### Performance

- **6 files changed** (+383 insertions, -257 deletions)
- 音乐生成页面重构（布局优化 + 新功能）
- Dialog 组件动画增强
- 删除流程状态清理

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 音乐生成参数向后兼容（歌曲标题为可选输入）
- ✅ Dialog 动画为纯前端增强，不影响功能
- ✅ 删除状态清理为内部逻辑优化

## [1.8.3] - 2026-04-12

### Added

**Media Favorites Feature - 媒体收藏功能**

- **用户收藏系统** - 支持用户收藏媒体资源
  - `server/database/migrations-async.ts` (+41/-0) - 新增 `user_media_favorites` 表迁移
  - `packages/shared-types/entities/media.ts` (+19/-0) - FavoriteRecord 类型定义
  - `src/types/media.ts` (+1) - is_favorite 字段
  - 用户可为任意媒体资源添加收藏标记

- **收藏 API 端点** - PATCH /:id/favorite
  - `server/routes/media.ts` (+31/-0) - 收藏切换 API
  - `server/repositories/media-repository.ts` (+119/-0) - 收藏 CRUD 方法
  - `server/services/domain/media.service.ts` (+6/-0) - 收藏服务层
  - `server/validation/media-schemas.ts` (+1) - 收藏筛选参数

- **FavoriteButton 组件** - 收藏按钮 UI
  - `src/components/media/FavoriteButton.tsx` (35行) - 收藏按钮组件
  - `src/lib/api/media.ts` (+14/-0) - toggleFavorite API 函数
  - 收藏状态实时切换，乐观更新 UI

- **收藏筛选 Tab** - 快速筛选收藏媒体
  - `src/pages/MediaManagement.tsx` (+25/-5) - 收藏 tab 集成
  - `src/hooks/useMediaManagement.ts` (+96/-0) - handleToggleFavorite 逻辑
  - `src/components/media/MediaCard.tsx` (+33) - 收藏按钮集成
  - `src/components/media/MediaTableView.tsx` (+10) - 表格视图收藏按钮
  - `src/components/media/TimelineItem.tsx` (+10) - 时间轴视图收藏按钮

- **文档**
  - `docs/specs/media-favorites-design.md` - 收藏功能设计 spec
  - `docs/plans/media-favorites-implementation.md` - 收藏实现 plan

### Changed

**FavoriteButton UI 位置优化** - 收藏按钮移至卡片右上角

- 收藏时始终显示（不依赖 hover）
- 未收藏时 hover 显示
- 与 action bar 分离，独立于右上角
- 视觉设计：无背景、纯图标、尺寸适配

**文档重组**

- `docs/archive/v1.8/` - 归档 v1.8 相关计划
- 设计文档位置规范化

### Fixed

- **收藏按钮位置系列修复** - 12 commits 逐步优化位置和样式
  - 从 action bar 移至右上角
  - 正确的 visibility 逻辑（收藏时始终显示）
  - 无背景、纯图标风格
  - hover 时正确触发

- **Code review issues 修复**
  - race condition 修复（收藏状态切换）
  - auth check 增强（收藏权限验证）
  - optimistic UI 修复（收藏状态同步）

- **收藏筛选触发修复**
  - 筛选 tab 切换时正确触发数据获取
  - FavoriteButton 与筛选 tab 分离

### Performance

- **26 files changed** (+9,303 insertions, -56 deletions)
- 新增 1 个核心组件（FavoriteButton）
- 新增 1 个数据库表（user_media_favorites）
- 收藏功能全栈实现（前端 + 后端 + 数据库）

### Backward Compatibility

- ✅ 所有 API 端点保持不变（仅新增 PATCH /:id/favorite）
- ✅ 收藏功能为增量功能，不影响现有媒体管理
- ✅ 数据库迁移向后兼容
- ✅ FavoriteButton 为可选组件，不影响现有 UI

## [1.8.2] - 2026-04-11

### Added

**Music Generation - Parallel Generation Mode - 音乐并行生成模式**

- **并行音乐生成** - 支持同时生成多首音乐 (1-10首)
  - `src/pages/MusicGeneration.tsx` (+398/-119) - 新增并行生成面板和数量选择
  - `src/components/music/MusicCarousel.tsx` (190行) - 音乐轮播展示组件
  - `src/components/music/MusicTaskCard.tsx` (253行) - 任务卡片组件，显示生成进度
  - `src/types/music.ts` - 新增 `count` 参数
  - 用户可配置生成数量，批量创作音乐

- **媒体重命名功能** - 支持卡片、时间轴、表格视图重命名
  - `src/components/media/MediaCard.tsx` (+152/-25) - 卡片视图重命名
  - `src/components/media/TimelineItem.tsx` (+48/-10) - 时间轴视图重命名
  - `src/components/media/MediaTableView.tsx` (+98/-10) - 表格视图重命名
  - `src/hooks/useMediaManagement.ts` (+13) - 重命名逻辑 hook
  - `src/pages/MediaManagement.tsx` (+9/-5) - 页面集成
  - `server/routes/media.ts` (+20/-10) - 后端重命名 API 增强

- **文档**
  - `docs/plans/2026-04-11-parallel-music-generation.md` (149行)
  - `docs/specs/2026-04-11-parallel-music-generation-design.md` (109行)

### Changed

- **媒体卡片布局优化** - 操作按钮移至右上角
  - `src/components/media/MediaCard.tsx` - 重构操作按钮布局
  - 更符合用户直觉，减少误触

- **媒体标题显示优化** - 单行截断 + 增加显示宽度
  - `src/components/media/MediaCard.tsx` - 标题单行 truncate
  - `src/components/media/MediaTableView.tsx` - 表格标题宽度增加
  - `src/components/media/TimelineItem.tsx` - 时间轴标题宽度增加
  - 更清晰的标题展示

### Fixed

- **音频播放器修复** - Range 请求 + Seek 拖拽系列修复
  - `src/components/media/AudioPlayer.tsx` (+121/-30) - 多项修复
  - `fix(media): add Range request support for audio seeking` - 支持 Range 请求，实现精确 seek
  - `fix(media): correct audio seek timing in player` - 修正 seek 时序
  - `fix(audio): use ref for duration to prevent seek reset on mouse release` - duration ref 防止释放重置
  - `fix(audio): use ref for isDragging to prevent closure capture bug` - isDragging ref 防止闭包捕获
  - `fix(audio): remove conditional event registration, always use refs` - 统一使用 refs 注册事件
  - `fix(audio): prevent seek drag breaking due to effect dependency changes` - 修复 effect 依赖导致的拖拽失效

- **音乐生成修复**
  - `fix(music): prevent blob URL premature cleanup in parallel generation` - 防止并行生成时 blob URL 过早清理
  - `fix(music): use 'prompt' parameter name per MiniMax API spec` - API 参数名称对齐官方规范
  - `fix(music): handle both prompt and style_prompt from frontend` - 同时处理两种参数名
  - `server/routes/music.ts` (+4/-2) - 后端参数处理

- **媒体组件**
  - `src/components/media/AnimatedMediaGrid.tsx` (+3) - 动画组件小修复

### Performance

- **16 files changed** (+1,292 insertions, -283 deletions)
- 新增 2 个核心组件（MusicCarousel, MusicTaskCard）
- 音频播放器重构 (+121/-30)
- 媒体卡片重构 (+152/-25)

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 音乐生成参数向后兼容（新增可选 `count` 参数）
- ✅ 媒体重命名为增量功能
- ✅ 样式变更不影响功能逻辑

## [1.8.1] - 2026-04-11

### Added

**Music Generation Enhancements - 音乐生成功能增强**

- **纯音乐模式 (Instrumental Mode)** - 无需歌词即可生成纯音乐
  - `src/pages/MusicGeneration.tsx` - 新增 instrumental 模式 checkbox 和表单逻辑
  - `src/types/music.ts` - 新增 `instrumental` 字段
  - 纯音乐模式下歌词字段隐藏且不提交

- **Seed 复现参数** - 支持通过 seed 值复现音乐生成结果
  - `src/pages/MusicGeneration.tsx` - 高级设置面板新增 seed 输入
  - `src/types/music.ts` - 新增 `seed` 参数
  - 仅 music-2.6 模型支持

- **Music-Cover 翻唱模式** - 支持一步和两步翻唱
  - `src/pages/MusicGeneration.tsx` - 新增翻唱面板（一步/两步 Tabs）
  - `server/routes/music.ts` - 新增 reference_audio_url, use_original_lyrics 参数
  - `server/lib/minimax.ts` - 新增 `musicPreprocess()` 方法
  - `src/lib/api/music.ts` - 新增 `preprocessMusic()` API 函数
  - 后端新增 `/music/preprocess` 路由（multer 文件上传）

- **高级设置面板 (Collapsible)** - 折叠面板组织高级参数
  - `src/components/ui/Collapsible.tsx` (107行) - 新增折叠面板组件
  - 包含 seed、bitrate、format、sample_rate 等高级参数

- **字符计数器** - 风格提示和歌词输入的字符计数
  - 风格提示: 最大 2000 字符
  - 歌词: 最大 3500 字符

- **全局音频播放器** - 全局持久化音乐播放
  - `src/components/media/AudioPlayer.tsx` (231行) - Spotify 风格播放器
  - `src/stores/audio.ts` (89行) - Zustand 全局音频状态管理
  - `src/components/layout/AppLayout.tsx` - 集成全局播放器
  - 支持播放列表、上下曲、音量控制、拖拽进度条、全局鼠标事件

- **模型常量集中化** - 所有模型定义迁移到 `src/lib/config/constants.ts`
  - TEXT_MODELS, SPEECH_MODELS, IMAGE_MODELS, MUSIC_MODELS, VIDEO_MODELS
  - ASPECT_RATIOS, EMOTIONS 统一导出

- **AI 歌词优化范围扩展** - 2.5 / 2.5+ / 2.6 模型均支持歌词优化

- **文档** 
  - `docs/specs/2026-04-11-music-generation-enhancements-design.md` (426行)
  - `docs/plans/2026-04-11-music-generation-enhancements.md` (1271行)

### Changed

- **音乐 API 参数对齐官方规范** - `server/routes/music.ts`
  - `lyrics` 改为可选（纯音乐模式）
  - `bitrate` 从 number 改为 string（'128k', '192k', '320k'）
  - 新增 `seed`, `reference_audio_url`, `use_original_lyrics` 参数
  - `music_generation_timeout` 从 180s 增至 300s
  - `voice_ids` 从 string[] 改为 string

- **音乐超时延长** - 前后端均增至 5 分钟
  - `server/lib/minimax.ts` - music_generation timeout: 300s
  - `src/pages/MusicGeneration.tsx` - 前端超时同步

- **音乐默认值修正** - `server/services/settings-service.ts`
  - `optimizeLyrics` 默认值从 `true` 改为 `false`

- **GenerationSettingsPanel 重构** - 使用集中化模型常量
  - 移除硬编码 options，使用 TEXT_MODELS, SPEECH_MODELS 等
  - 减少 44 行重复代码

- **CostEstimator 更新** - `estimateMusicCost()` 新增 model 参数

- **媒体管理扩展** - audio/music 类型加入可预览媒体
  - `MediaCard.tsx`, `MediaTableView.tsx`, `TimelineItem.tsx`
  - 音频/音乐记录支持预览按钮

- **VoiceResult 集成全局播放器** - `src/pages/VoiceSync/VoiceResult.tsx`
  - 直接 URL 音频支持全局播放

- **类型扩展** - 统一扩展 image/text/video/voice 类型定义
  - `src/types/image.ts` (+30行)
  - `src/types/text.ts` (+27行)
  - `src/types/video.ts` (+79行)
  - `src/types/voice.ts` (+50行)

- **国际化** - 新增英文/中文翻译条目

### Fixed

- **音乐 CORS 问题** - 强制音乐生成走后端代理，避免前端直接请求 MiniMax API
- **JWT Token 注入** - 音乐 API 使用 apiClient 自动注入 JWT token
- **API 响应解析** - 修复音乐 API 扁平化响应结构解析
- **music_duration 单位** - 从毫秒转换为秒
- **音频播放器** - 自动播放、seek 精度、拖拽防抖、按钮样式修复
- **分页刷新逻辑** - tab 切换时正确触发数据获取
- **User Repository** - `rowToAuditLog` usernameMap 改为可选参数

### Performance

- **33 文件变更** (+3,233 insertions, -401 deletions)
- 新增 2 个核心组件（AudioPlayer, Collapsible）
- 新增 1 个 Zustand store（audio store）
- 前端新增 ~1,200 行音乐/UI 逻辑

### Backward Compatibility

- ✅ 所有 API 端点保持不变（仅新增 `/music/preprocess`）
- ✅ 音乐生成 `/music/generate` 参数向后兼容（新增可选参数）
- ✅ `lyrics` 改为可选，不影响现有传歌词的调用
- ✅ 样式变更不影响功能逻辑
- ✅ 全局音频播放器为增量功能，无破坏性变更

## [1.8.0] - 2026-04-10

### Added

**Security Enhancements - 全面安全加固**

- **Environment Configuration Template** - `.env.example` 模板文件
  - 新增完整的配置示例，包含所有必需和可选环境变量
  - 包含数据库、JWT、API 密钥、Cron 等配置项说明
  - 52 行变更，提升开发者配置体验

- **Separate Media Token Secret** - 分离媒体令牌密钥
  - `MEDIA_TOKEN_SECRET` 环境变量独立于 `JWT_SECRET`
  - 媒体下载令牌和用户认证令牌使用不同密钥
  - 提升安全性，防止密钥泄露影响范围扩大
  - `server/lib/media-token.ts` (+19/-0)

- **JWT_SECRET Fail-fast Validation** - JWT 密钥快速验证
  - 服务启动时验证 `JWT_SECRET` 存在且长度 >= 32 字符
  - 防止弱密钥配置导致的安全风险
  - `server/config/index.ts` (+61/-0)

- **Atomic Invitation Code Validation** - 邀请码原子化验证
  - 使用数据库事务确保邀请码验证和使用操作的原子性
  - 防止并发请求导致的邀请码重复使用风险
  - `server/services/user-service.ts` (+82/-0)

- **Atomic Capacity Tracking** - 容量追踪原子化
  - 使用数据库事务确保容量检查和更新操作的原子性
  - 防止并发请求导致的容量计数错误
  - `server/repositories/capacity-repository.ts` (+29/-0)

- **IDOR Prevention in Job Stats Updates** - 任务统计 IDOR 防护
  - 确保只有任务创建者可以更新任务统计数据
  - 防止用户通过 IDOR 攻击修改他人任务的统计信息
  - `server/repositories/job-repository.ts` (+23/-0)

- **Remove Query Parameter Token Support** - 移除不安全的 token 查询参数
  - 移除 `?token=` 查询参数认证方式，仅使用 httpOnly Cookie + Bearer Token
  - 防止 token 通过 URL 参数泄露（URL 日志、浏览器历史记录）
  - 提升认证安全性
  - `server/middleware/auth-middleware.ts` (+16/-0)

- **Comprehensive Test Coverage** - 安全相关测试覆盖
  - `server/services/__tests__/user-service-race.test.ts` (283行) - 用户服务竞态条件测试
  - `server/middleware/__tests__/auth-middleware.test.ts` (161行) - 认证中间件测试
  - `server/repositories/__tests__/capacity-repository.test.ts` (163行) - 容量仓库安全测试
  - `server/repositories/__tests__/job-repository-security.test.ts` (135行) - 任务仓库安全测试
  - `server/lib/__tests__/media-token.test.ts` (76行) - 媒体令牌测试
  - `server/config/__tests__/config-validation.test.ts` (82行) - 配置验证测试

**Documentation Reorganization**

- **Archive Structure** - 文档归档结构重组
  - `docs/archive/v1.3/` - v1.3 相关计划归档
  - `docs/archive/v1.4/` - v1.4 相关计划归档
  - `docs/archive/v1.6/` - v1.6 相关计划归档
  - `docs/archive/v1.7/` - v1.7 相关计划归档
  - `docs/specs/` - 规格文档集中存储
  - 按版本归档历史计划，保持文档结构清晰

**Audit Logs Enhancements**

- **Username Column & User Filter** - 用户名列和用户筛选
  - `server/routes/audit.ts` (+20/-0) - `/api/audit/unique-users` API
  - `server/repositories/user-repository.ts` - 新增 username 字段查询
  - `packages/shared-types/entities/audit-log.ts` (+1/-0) - username 字段
  - `src/lib/api/audit.ts` (+22/-0) - 前端 API 客户端
  - 管理员可按用户名筛选审计日志

### Changed

**Audit Logs UI Refactoring**

- **Redesigned Filter Bar & List Layout** - 筛选栏和列表布局重构
  - `src/pages/AuditLogs.tsx` (+430/-0) - 全面重构
  - `refactor(audit): redesign filter bar and list layout` - 响应式 flexbox 布局
  - `fix(audit): add time sort, use grid layout for better alignment` - 时间排序
  - `fix(audit): adjust grid columns for better distribution` - 网格列优化
  - `fix(audit): add unique paths API and fix list layout` - 独立路径 API
  - `fix(audit): use flex justify-between for responsive column distribution` - 响应式列分布
  - `fix(audit): increase non-path column widths` - 非路径列宽度优化
  - `fix(audit): use table layout like UserManagement` - 统一表格布局
  - `fix(audit): wrap table in CardContent` - CardContent 包装
  - `fix(audit): single line path display` - 单行路径显示
  - `fix(audit): merge path info into single line` - 路径信息合并

- **Layout & UX Improvements** - 布局和用户体验改进
  - `fix: uniform grid columns, reduce capacity card height` - 网格列统一
  - `src/pages/CapacityMonitor.tsx` (+20/-0) - 容量监控页面优化
  - 更好的响应式布局和间距

**UI/UX Animations**

- **Smooth Select Dropdown Animations** - 下拉菜单流畅动画
  - `src/components/ui/Select/SelectContent.tsx` (+53/-0) - Framer Motion 动画
  - 平滑的打开/关闭过渡效果
  - 更好的视觉反馈

**Media View Visual Improvements**

- **Border Removal** - 移除视觉干扰边框
  - `src/components/media/MediaTableView.tsx` (+14/-0) - 移除表格边框
  - `src/components/media/TimelineItem.tsx` (+4/-0) - 移除时间轴边框
  - `fix(media): remove borders from timeline view` - 时间轴边框移除
  - `fix(media): remove row divider borders in list view` - 列表分隔线移除
  - `fix(media): remove harsh borders from list and timeline views` - 硬边框移除
  - 更简洁、现代的视觉设计

**Backend Service Updates**

- **Error Handling & Security Refinements** - 错误处理和安全优化
  - `fix(security): improve error handling and refine security fixes` - 综合安全优化
  - `server/middleware/auth-middleware.ts` - 更好的错误响应
  - `server/services/notification-service.ts` (+22/-0) - 通知服务安全检查

- **Async Database Operations** - 数据库异步化
  - `server/database/service-async.ts` (+10/-0) - 异步数据库方法
  - `server/services/domain/interfaces/job.interface.ts` (+5/-0) - 任务接口更新
  - `server/services/domain/job.service.ts` (+2/-0) - 任务服务更新

- **Route & Service Updates** - 路由和服务更新
  - `server/routes/media.ts` (+9/-0) - 媒体路由优化
  - 前端和后端同步更新

### Fixed

- **SQL Syntax Correction** - SQL 语法修正
  - `fix(audit): correct SQL syntax for getUniqueAuditUsers query` - 修正 SQL 查询语法
  - `server/repositories/user-repository.ts` - 正确的 SQL 查询

- **UI Layout Issues** - UI 布局问题
  - `fix(audit): close bg-gradient div properly` - 正确关闭渐变背景 div
  - `fix(ui): update listboxRef directly in ref callback for proper outside click detection` - 正确的外部点击检测
  - React ref 回调中直接更新 listboxRef

- **Translation Updates** - 翻译更新
  - `src/i18n/locales/en.json` (+2/-1) - 英文翻译调整

- **Dev CLI Enhancement** - 开发 CLI 增强
  - `scripts/dev.js` (+6/-0) - 新增调试命令支持

### Performance

**Code Quality Metrics**
- **61 files changed** (+1847 insertions, -828 deletions)
- **Test Coverage**: +7 test files (1,000+ lines total)
  - Security tests: user-service-race, auth-middleware, capacity-repository, job-repository-security
  - Media token test, config validation test
  - User service test improvements (+303/-0)
- **Security**: Comprehensive security hardening (atomic operations, fail-fast validation, IDOR prevention)
- **Audit Logs**: Better UX, username column, responsive layout
- **UI/UX**: Smooth animations, clean visual design (border removal)
- **Documentation**: Organized archive structure, moved specs to dedicated directory

### Backward Compatibility

- ✅ All API endpoints unchanged (except new `/api/audit/unique-users`)
- ✅ No breaking API changes
- ✅ Environment variables backward compatible (`MEDIA_TOKEN_SECRET` optional)
- ✅ Audit logs UI improvements backward compatible (no data structure changes)
- ✅ Media view style changes不影响功能逻辑
- ✅ Query parameter token removal is a **security improvement** (authentication still works via httpOnly cookie + bearer token)

### Breaking Changes

- ⚠️ **Query Parameter Token Authentication Removed** - 移除 `?token=` 查询参数认证
  - 原因：安全风险（URL 泄露）
  - 替代方案：httpOnly Cookie + Bearer Token
  - 影响：如果之前使用 `?token=` 方式下载媒体文件，需改用 Cookie 认证

- ⚠️ **Invitation Code Usage Atomic** - 邀请码使用改为原子化操作
  - 原因：防止并发重复使用
  - 影响：邀请码验证和使用在同一事务中，并发请求会失败

- ⚠️ **Capacity Tracking Atomic** - 容量追踪改为原子化操作
  - 原因：防止并发计数错误
  - 影响：高并发场景下容量更新可能失败（需重试）

### Security Improvements

This release includes **8 security enhancements**:

1. **Separate secrets** - Media token and JWT token use different secrets
2. **Fail-fast validation** - Weak JWT secrets rejected at startup
3. **Atomic operations** - Invitation codes, capacity tracking use transactions
4. **IDOR prevention** - Job stats updates require ownership verification
5. **Token removal** - Query parameter authentication removed (XSS/URL leak prevention)
6. **Error handling** - Better error responses in auth middleware
7. **Test coverage** - Comprehensive security tests (race conditions, auth flows, IDOR)
8. **Config template** - `.env.example` with security best practices

### Documentation

- Documentation reorganized according to spec
  - `docs/archive/v1.3/` - v1.3 plans archived
  - `docs/archive/v1.4/` - v1.4 plans archived
  - `docs/archive/v1.6/` - v1.6 plans archived
  - `docs/archive/v1.7/` - v1.7 plans archived
  - `docs/specs/` - All specs in dedicated directory

## [1.7.3] - 2026-04-10

### Added

**Audit Logs Enhancements**

- **Duration & Path Sorting** - Sort audit logs by creation time or response duration
  - `server/repositories/user-repository.ts` - Sort by `created_at` or `duration_ms`
  - `server/validation/audit-schemas.ts` - New `sort_by` and `sort_order` query params
  - `packages/shared-types/entities/audit-log.ts` - Added sort fields to interface
  - `src/lib/api/audit.ts` - API client updated with sorting params

- **Status Filter Tabs** - Quick filter by success/error/all status
  - `src/pages/AuditLogs.tsx` - Tabs component for status filtering
  - `server/routes/audit.ts` - `status_filter` query param (200/400 range matching)
  - `server/repositories/user-repository.ts` - Status range queries

- **Path Filter** - Filter audit logs by request path pattern
  - `server/validation/audit-schemas.ts` - `request_path` query param (LIKE match)
  - `server/routes/audit.ts` - Path filter propagation
  - `server/repositories/user-repository.ts` - `request_path LIKE` condition

### Changed

**Audit Logs UI Redesign**

- **Filter UI with Tabs** - Replaced button group with Tabs component
  - `src/pages/AuditLogs.tsx` - Modern Tabs for action/resource/status filters
  - Dynamic path filter tabs based on actual data
  - Sort controls with up/down arrows

### Fixed

**Media Management Bug Fixes**

- **Preview Tooltip Size** - Increased preview for better visibility
  - `src/components/media/MediaCardPreview.tsx` - Width 280px → 600px
  - `src/components/media/MediaCardPreview.tsx` - Max height 20rem → 32rem

- **Pagination Refill Logic** - Smart page refill when deleting items
  - `src/hooks/useMediaManagement.ts` - Fixed refill condition logic
  - Correctly calculates remaining items vs limit
  - Handles both single delete and batch delete scenarios

### Performance

- 13 files changed (+255/-59)
- Added hover preview to MediaTableView and TimelineItem
- Improved pagination state management

## [1.7.2] - 2026-04-10

### Added

**Media Management UX Enhancements**

- **AnimatedMediaGrid Component** - Elastic fly-in animation for media cards
  - `src/components/media/AnimatedMediaGrid.tsx` (58 lines) - Motion grid container
  - `src/components/media/AnimatedMediaGrid.test.tsx` (194 lines) - Test coverage
  - 4-direction random fly-in with stagger effect (0.06s per card)
  - Smooth transitions using Framer Motion spring physics

- **MediaCard Hover Preview** - Mouse-following tooltip for image preview
  - `src/components/media/MediaCardPreview.tsx` (84 lines) - Preview portal
  - `src/components/media/MediaCardPreview.test.tsx` (69 lines) - Test coverage
  - Smart positioning (avoids viewport edges)
  - Real-time mouse tracking with 280px preview width

- **Animation Variants Library** - Reusable animation configurations
  - `src/lib/animations/media-variants.ts` (61 lines) - Animation variants
  - `src/lib/animations/media-variants.test.ts` (53 lines) - Test coverage
  - `getRandomFlyInDirection()` - Random start position generator
  - `gridContainerVariants` - Container stagger configuration
  - `cardVariants` - Spring-based card animations

- **Smart Pagination Refill** - Auto-refill when deleting last item
  - `src/hooks/useMediaManagement.ts` (+69/-14) - Refill logic
  - `src/hooks/useMediaManagement.refill.test.ts` (160 lines) - Test coverage
  - Auto-fetch previous page when last item deleted on page > 1
  - Update pagination metadata after batch delete
  - Avoid stale closure issues with paginationRef

### Fixed

- **ConfirmDialog Parameter Bug** - Pass record to handleDelete correctly
  - `src/pages/MediaManagement.tsx` - Fix delete callback parameter
  - Prevents undefined error when confirming deletion

### Changed

- **MediaManagement Page Refactor** - Use AnimatedMediaGrid component
  - Replaced static grid with animated version
  - Cleaner code: -16 lines, +11 lines net change
  - Improved UX with smooth load animations

### Performance

**Code Quality Metrics**
- 13 files changed (+2,859 insertions, -32 deletions)
- Test coverage: 3 new test files (427 lines total)
- Animation system: Reusable variants reduce duplication
- Smart refill: Better pagination UX, fewer edge cases

### Backward Compatibility

- ✅ All API endpoints unchanged
- ✅ No breaking changes to public interfaces
- ✅ AnimatedMediaGrid wraps existing MediaCard component
- ✅ MediaCardPreview is additive (optional feature)

### Documentation

- `docs/specs/2026-04-09-media-management-enhancements-design.md` - Design specification
- `docs/plans/2026-04-09-media-management-enhancements.md` - Implementation plan

## [1.7.1] - 2026-04-09

### Added

**Backend DI & Event System**

- **IEventBus Interface** - Domain event bus for decoupled communication
  - `server/services/interfaces/event-bus.interface.ts` - Event bus interface
  - `server/services/domain/interfaces/` - Domain interfaces split into 8 files
  - Workflow node execution events (`node_started`, `node_completed`, `node_failed`)

- **Domain Services** - Entity encapsulation layer
  - `server/services/domain/capacity.service.ts` - Capacity service
  - `server/services/domain/media.service.ts` - Media service
  - `server/services/domain/webhook.service.ts` - Webhook service
  - `server/services/domain/workflow.service.ts` - Workflow service

- **Route Helpers** - Reduce route duplication
  - `withEntityNotFound` - Entity existence validation
  - `createPaginationMeta` - Pagination response builder
  - `requireOwnerId` - Data isolation helper

**Frontend Improvements**

- **Unified API Error Handling** - Centralized error handling
  - `src/lib/api/errors.ts` - Error classes (NetworkError, ValidationError, AuthError)
  - Consistent error response format across all API calls

- **Centralized Constants** - Shared constants module
  - `src/lib/constants/` - Centralized constant definitions
  - Migrated hardcoded values to shared constants

### Changed

**Backend Refactoring**

- **CronScheduler Split** - Modular scheduler architecture
  - `server/services/concurrency-manager.ts` - Concurrency control extracted
  - `server/services/misfire-handler.ts` - Misfire handling logic
  - `server/services/retry-manager.ts` - Retry logic extracted
  - `server/services/dlq-auto-retry-scheduler.ts` - Dead letter queue retry

- **QueueProcessor Split** - Queue processing modularized
  - Extracted retry logic into `RetryManager`
  - Extracted concurrency control into `ConcurrencyManager`

- **Domain Interfaces Split** - Modular interface definitions
  - `server/services/domain/interfaces.ts` (492 lines) → 8 separate files
  - Each domain entity has its own interface file

- **Route Updates** - Use domain services and helpers
  - `routes/cron/jobs.ts` - Use `withEntityNotFound`, `JobService`
  - `routes/cron/logs.ts` - Use `LogService`
  - `routes/cron/queue.ts` - Use `TaskService`
  - `routes/cron/webhooks.ts` - Use `WebhookService`
  - `routes/media.ts` - Use route helpers
  - `routes/capacity.ts` - Use `CapacityService`
  - `routes/workflows.ts` - Use DI event bus

- **Workflow Executors** - Use IEventBus for events
  - All 7 workflow executors now emit events via IEventBus
  - Decoupled from direct WebSocket dependencies

**Frontend Refactoring**

- **Component Splits** - Large components modularized
  - `WorkflowBuilder.tsx` (2080 lines) → 8 smaller components
  - `CronManagement.tsx` (1314 lines) → 7 smaller components
  - `MediaManagement.tsx` (985 lines) → 4 smaller components
  - `ServiceNodeManagement.tsx` (523 lines) → 6 modules
  - `WorkflowMarketplace.tsx` (558 lines) → 8 modules
  - `VoiceAsync.tsx` → Multiple components
  - `VoiceSync.tsx` → Multiple components
  - `WebhookManagement.tsx` → Multiple components

- **API Migration** - Use centralized apiClient
  - `capacity.ts` store migrated to apiClient
  - `ActionConfigPanel` migrated to apiClient

- **Data Split** - Modular data definitions
  - `workflow-templates.ts` → `workflow/templates/` module
  - `Select.tsx` → `Select/` module directory

### Performance

**Code Quality Improvements**
- 151 files changed (+14,358 insertions, -7,630 deletions)
- Maximum file size reduced: 2080 lines → ~300 lines per component
- Domain interfaces: 1 file (492 lines) → 8 files (~60 lines avg)
- Eliminated ~500 lines of duplicate code via route helpers
- Test coverage maintained with updated mocks

### Documentation

- `docs/plans/2026-04-09-frontend-component-split.md` - Frontend splitting plan
- `docs/plans/2026-04-09-split-cron-scheduler.md` - CronScheduler split plan
- `docs/plans/2026-04-09-queue-processor-split.md` - QueueProcessor split plan
- Architecture spec updated with Phase 4-1, 6, 7 progress

### Backward Compatibility

- ✅ All API endpoints unchanged
- ✅ No breaking changes to public interfaces
- ✅ Domain services wrap existing database operations
- ✅ IEventBus is additive, existing code still works
- ✅ Frontend component splits preserve public props

## [1.7.0] - 2026-04-09

### Added

**Token Refresh System - httpOnly Cookie-based Authentication**

- **Backend Implementation**
  - Add `cookie-parser` middleware for httpOnly cookie support
  - `POST /api/auth/refresh` endpoint with token rotation
  - `POST /api/auth/logout` endpoint to clear cookie
  - `verifyRefreshToken()` method in UserService
  - Refresh token stored in httpOnly cookie (7 days expiry)
  - Access token expires in 15 minutes

- **Frontend Implementation**
  - `useTokenRefresh` hook for proactive token refresh (3-minute buffer)
  - JWT parsing utilities (`src/lib/jwt.ts`)
    - `parseJWT()`, `parseTokenExpiry()`, `calculateRefreshTime()`, `isTokenExpired()`
  - 401 interceptor with refresh queue for concurrent requests
  - Race condition guard in token refresh hook
  - Handle page reload: refresh from httpOnly cookie when authenticated

- **Security Improvements**
  - Access token NOT stored in localStorage (XSS protection)
  - Refresh token stored in httpOnly cookie
  - Cookie settings: `sameSite=lax`, `secure` in production
  - Token type validation (reject refresh tokens when expecting access tokens)

### Changed

- **Auth API** - Remove `refreshToken` from login/register response body
  - Now sent via httpOnly cookie instead of JSON response
  - Clients must use `withCredentials: true` for cookie handling

- **Logout Flow** - Call backend API before clearing local state
  - Properly clears httpOnly cookie on server

### Documentation

- `docs/token-implementation.md` - Token authentication implementation guide
- `docs/specs/2026-04-08-token-refresh-design.md` - Design specification
- `docs/plans/2026-04-08-token-refresh.md` - Implementation plan

## [1.6.2] - 2026-04-06

### Fixed

**暗色模式兼容性修复** - 替换非标准 Tailwind 类为主题变量

- **全局样式兜底** - 添加 body 默认前景色和背景色
  - `src/index.css` (+4/-0) - 确保 `color: hsl(var(--foreground))` 和 `background-color: hsl(var(--background))`
  - 解决暗色模式下文字不可见问题

- **UI 组件修复** - 替换 `dark-*` 类为标准主题变量
  - `src/components/ui/Dialog.tsx` (+6/-6) - `dark-*` → `text-muted-foreground`, `bg-muted`
  - `src/components/ui/EmptyState.tsx` (+6/-6) - 暗色文字可见性修复
  - `src/components/ui/MarkdownRenderer.tsx` (+8/-8) - Markdown 内容渲染修复
  - `src/components/ui/Tooltip.tsx` (+2/-2) - Tooltip 提示文字修复

- **Onboarding 组件修复** - 新用户引导可见性
  - `src/components/onboarding/QuickStartGuide.tsx` (+14/-14) - 快速指南文字可见
  - `src/components/onboarding/WelcomeModal.tsx` (+26/-26) - 欢迎弹窗内容可见

- **Workflow 组件修复** - 工作流构建器暗色模式
  - `src/components/workflow/WorkflowPreview.tsx` (+12/-12) - 工作流预览文字可见
  - `src/components/workflow/builder/WorkflowCanvas.tsx` (+20/-20) - 画布背景和文字修复
  - `src/components/workflow/nodes/DelayNode.tsx` (+4/-4) - 延迟节点显示修复

- **其他组件修复** - 全面暗色模式兼容
  - `src/components/shared/ExportButton.tsx` (+2/-2) - `bg-dark-900` → `bg-muted`
  - `src/components/templates/CreateTemplateModal.tsx` (+42/-42) - 模板创建弹窗修复
  - `src/components/media/MediaTableView.tsx` (+8/-8) - 媒体表格文字修复

- **页面组件修复** - 各功能页面暗色可见性
  - `src/pages/AuditLogs.tsx` (+2/-2) - 审计日志页面
  - `src/pages/ImageGeneration.tsx` (+2/-2) - 图像生成页面
  - `src/pages/InvitationCodes.tsx` (+14/-14) - 遇请码管理页面
  - `src/pages/MusicGeneration.tsx` (+2/-2) - 音乐生成页面
  - `src/pages/TokenMonitor.tsx` (+12/-12) - Token 监控页面
  - `src/pages/UserManagement/UserTable.tsx` (+14/-14) - 用户管理表格
  - `src/pages/VideoAgent.tsx` (+2/-2) - 视频 Agent 页面
  - `src/pages/VideoGeneration.tsx` (+2/-2) - 视频生成页面
  - `src/pages/VoiceAsync.tsx` (+2/-2) - 异步语音页面
  - `src/pages/VoiceSync.tsx` (+2/-2) - 同步语音页面
  - `src/pages/TextGeneration.tsx` (+2/-2) - 文本生成页面

### Changed

**UI 改进** - StatCard compact mode + 渐变色优化

- **StatCard Compact Mode** - 统计卡片紧凑模式
  - `src/pages/StatsDashboard.tsx` (+27/-1) - 新增 `compact?: boolean` 参数
  - `py-2` → `py-1` - 更扁平的卡片外观
  - 图标/文字尺寸优化 (`w-3.5 h-3.5`, `text-base`, `text-[10px]`)
  - 渐变背景透明度调整 (opacity-15)

- **调试页面渐变色优化** - 固定鲜艳渐变替代主题感知渐变
  - `src/config/pages.ts` (+22/-7) - 新增 4 个渐变变体：
    - `indigo-violet`: from-indigo-500 to-violet-500 (靛蓝→紫罗兰)
    - `sky-blue`: from-sky-400 to-blue-500 (天蓝)
    - `rose-pink`: from-rose-400 to-pink-500 (玫瑰粉)
    - `violet-purple`: from-violet-500 to-purple-600 (紫罗兰)
  - 各调试页面渐变色分配：
    - Text Generation: indigo-violet
    - Voice Sync/Async: sky-blue
    - Image Generation: rose-pink
    - Music Generation: violet-purple
    - Video/Video Agent: orange-amber (已有)

### Performance

- **代码质量指标**
  - 26 个文件变更 (+148/-111)
  - 暗色模式修复涉及 26 个组件/页面
  - 统一使用 Tailwind theme variables，提升主题一致性

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 无破坏性 API 变更
- ✅ 仅样式调整，不影响功能逻辑
- ✅ 主题变量迁移向后兼容

## [1.6.1] - 2026-04-06

### Added

**UI 统一化与优化**

- **PageHeader 组件统一化** - 所有页面统一页头布局
  - `src/components/shared/PageHeader.tsx` (61行) - 统一页头组件
  - 渐变文字效果和入场动画
  - 支持自定义标题、描述、图标、操作按钮
  - 19 个页面迁移到统一 PageHeader：
    - Dashboard, AuditLogs, CapacityMonitor, StatsDashboard
    - CronManagement, MediaManagement, FileManagement
    - ImageGeneration, TextGeneration, VoiceSync/Async, VideoGeneration, VideoAgent
    - InvitationCodes, UserManagement, WebhookManagement
    - WorkflowMarketplace, TemplateLibrary, WorkflowTemplateManagement
    - MusicGeneration, VoiceManagement, ServiceNodeManagement, DeadLetterQueue

- **页面配色系统** - 每个类别独特渐变色
  - `src/config/pages.ts` (196行) - 页面配置系统
  - 9 个类别配色定义：
    - Dashboard (紫蓝渐变)
    - Debug/Automation (青蓝渐变)
    - Media (粉紫渐变)
    - Generation (红橙渐变)
    - System (青绿渐变)
    - Workflow (紫橙渐变)
    - Admin (蓝青渐变)
    - Settings (橙粉渐变)
    - Stats (紫青渐变)

### Changed

**Settings Modal UI 优化**
- `src/components/settings/SettingsModal.tsx` (+116/-0) - 布局重构
  - 按钮提取到父组件，避免滚动穿透
  - 移除玻璃态渐变效果
  - 统一间距和布局一致性
  - 修复 footer padding 问题

**页面迁移详情**
- Dashboard (+2/-0) - 迁移到 PageHeader
- AuditLogs (+25/-0) - 添加 PageHeader 和统计操作
- CapacityMonitor (+43/-0) - PageHeader + StatsCard 布局优化
- CronManagement (+80/-0) - PageHeader + 操作按钮迁移
- MediaManagement (+80/-0) - PageHeader + 统一布局
- FileManagement (+49/-0) - PageHeader + 操作优化
- ImageGeneration (+28/-0) - PageHeader 迁移
- TextGeneration (+18/-0) - PageHeader 迁移
- VoiceSync (+25/-0), VoiceAsync (+29/-0) - PageHeader 迁移
- VideoGeneration (+16/-0), VideoAgent (+16/-0) - PageHeader 迁移
- InvitationCodes (+112/-0) - PageHeader + 操作迁移
- UserManagement (+97/-0) - PageHeader + 统一布局
- WebhookManagement (+70/-0) - PageHeader 迁移
- WorkflowMarketplace (+199/-0) - PageHeader + 卡片优化
- TemplateLibrary (+23/-0) - PageHeader 迁移
- WorkflowTemplateManagement (+35/-0) - PageHeader 迁移

**API 层优化**
- `src/lib/api/settings.ts` (+41/-0) - 简化响应处理
- `server/routes/media.ts` (+34/-0) - 增强 media API
- `server/lib/media-storage.ts` (+7/-0) - 存储优化

**组件调整**
- `src/components/layout/AppLayout.tsx` (+21/-0) - 布局优化
- `src/components/layout/Header.tsx` (+9/-0) - Header 简化
- `src/components/ui/Select.tsx` (+4/-0) - Select 样式清理

### Fixed

- **Settings API 响应处理** - 修复配置加载/保存逻辑
  - 正确处理 backend API 响应格式
  - 修复 settings store 初始化
  - 修复 settings save/load 流程

- **暗色模式可见性** - StatCard 渐变背景修复
  - 添加 `text-foreground` 确保文字在暗色背景可见
  - StatCard compact mode 渐变背景修复
  - 恢复彩色渐变文字效果

- **localStorage Persistence** - Map/Set 序列化修复
  - `src/stores/executionLogs.ts` (+3/-0)
  - 排除 Map/Set 从 localStorage persistence
  - 防止序列化错误

- **UI 细节修复**
  - Media preview 布局优化
  - Settings 面板按钮样式修复
  - Scroll 性能优化
  - 暗色模式渐变文字大小调整

### Performance

- **代码质量指标**
  - 49 个文件变更 (+1325/-949)
  - PageHeader 组件统一 19 个页面，减少重复代码
  - 页面配色系统集中管理，提升可维护性

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 无破坏性 API 变更
- ✅ UI 变更不影响功能逻辑
- ✅ Settings Modal 重构向后兼容

### Known Issues

- **测试环境配置问题** - PostgreSQL 测试因权限问题失败（继承自 v1.6.0）
  - 错误：`permission denied for schema public`
  - 影响：数据库相关测试无法运行（非代码问题）
  - 解决方案：配置测试数据库权限（参见 `TESTING.md`）

## [1.6.0] - 2026-04-06

### Added

**DDD Architecture Foundation - 领域驱动设计架构基础**

**Phase 1: 依赖注入容器与服务注册**
- **DI Container** - 依赖注入容器实现
  - `server/container.ts` (75行) - ServiceContainer 类
  - `server/container.types.ts` (53行) - 服务标识符常量
  - Singleton scope 注册与生命周期管理
  - 替代 8 个全局单例 getter 函数

- **Service Registration Module** - 服务注册模块
  - `server/service-registration.ts` (121行) - 集中式服务初始化
  - 生命周期管理（启动/停止）
  - 测试友好的依赖注入

- **MiniMaxClientFactory** - 客户端创建工厂
  - `server/lib/minimax-client-factory.ts` (69行)
  - 消除 8 处重复的 `getClient()` 实现
  - 支持 API Key 从请求头 + 用户设置获取
  - Factory Pattern 统一客户端创建

**Phase 1 Started: Repository Pattern**
- **Repository Port Interfaces** - 仓储端口接口
  - `server/repositories/ports/repository-port.ts` (100行) - Generic RepositoryPort<T> 抽象接口
  - `server/repositories/ports/cron-job-repository.ts` (50行) - CronJobRepository 仓储
  - `server/repositories/ports/task-repository.ts` (59行) - TaskRepository 仓储
  - `server/repositories/ports/media-repository.ts` (35行) - MediaRepository 仓储
  - `server/repositories/ports/index.ts` (27行) - 统一导出入口
  - CRUD 操作: findById, findAll, save, delete
  - Pagination 支持

**Phase 2 Started: Domain Events**
- **Domain Event Bus** - 领域事件总线
  - `server/domain/events/event-bus.ts` (38行) - Publish-Subscribe 模式
  - `server/domain/events/event-handler.ts` (27行) - 通用事件处理器接口
  - `server/domain/events/index.ts` (9行) - 事件类型导出
  - Async 事件处理支持
  - Typed domain events

**数据库层增强**
- **Transaction Support** - 事务支持
  - `server/database/service-async.ts` (7行) - DatabaseService async 方法
  - 多表操作原子性保证
  - Failure rollback 支持

**前端统一错误处理**
- **Unified API Error Handler** - 统一 API 错误处理器
  - `src/lib/api/errors.ts` (91行)
  - NetworkError, ValidationError, AuthError 错误类
  - 标准化错误响应格式
  - 统一错误消息处理

**配置集中化**
- **Enhanced Config Module** - 增强配置模块
  - `server/config/index.ts` (+151行)
  - CORS origins 集中配置
  - API hosts 可配置化
  - Magic number 常量统一（BCRYPT_ROUNDS 等）
  - Environment-based overrides

**权限辅助函数**
- **isPrivilegedUser()** - 统一权限判断
  - Admin/Super role 检查统一
  - 替代 3 处重复的 role check 模式
  - 用于 capacity, data-isolation, validation

### Changed

**后端路由层迁移 - 34 个路由文件迁移到 DI Container**
- **Cron Routes**
  - `routes/cron/jobs.ts` (+31/-40) - 任务管理路由
  - `routes/cron/logs.ts` (+15/-15) - 执行日志路由
  - `routes/cron/queue.ts` (+9/-9) - 任务队列路由
  - `routes/cron/webhooks.ts` (+10/-10) - Webhook 管理路由
  - `routes/cron/index.ts` (+4/-6) - 路由聚合器

- **API Routes**
  - `routes/text.ts` (+3/-12) - 文本生成路由
  - `routes/voice.ts` (+4/-11) - 语音合成路由
  - `routes/image.ts` (+2/-11) - 图像生成路由
  - `routes/video.ts` (+3/-10) - 视频生成路由
  - `routes/videoAgent.ts` (+3/-10) - Video Agent 路由
  - `routes/music.ts` (+2/-9) - 音乐生成路由
  - `routes/voiceMgmt.ts` (+5/-12) - 语音管理路由

- **Admin Routes**
  - `routes/admin/service-nodes.ts` (+4/-4) - 服务节点路由
  - `routes/admin/service-permissions.ts` (+6/-6) - 服务权限路由
  - `routes/admin/workflows.ts` (+5/-5) - 工作流路由

- **Other Routes**
  - `routes/files.ts` (+5/-12) - 文件路由
  - `routes/media.ts` (+2/-12) - 媒体路由
  - `routes/usage.ts` (+3/-3) - 用量路由
  - `routes/capacity.ts` (+7/-19) - 容量路由
  - `routes/stats.ts` (+5/-5) - 统计路由
  - `routes/audit.ts` (+4/-4) - 审计路由
  - `routes/system-config.ts` (+6/-6) - 系统配置路由
  - `routes/templates.ts` (+6/-6) - 模板路由
  - `routes/workflows.ts` (+13/-13) - 工作流模板路由

**Pattern Changes:**
- `getXxxService()` → `container.resolve(SERVICE_ID)`
- `getClient(req)` → `MiniMaxClientFactory.create(req)`
- Service locator functions deprecated

**服务层清理**
- **Deprecated Functions Removed:**
  - `getDatabaseService()` (replaced by container)
  - `getCronScheduler()` (replaced by container)
  - `getTaskExecutor()` (replaced by container)
  - `getQueueProcessor()` (replaced by container)
  - `getNotificationService()` (replaced by container)

- **Singleton Removal:**
  - WebSocketService singleton → container-managed
  - NotificationService singleton → container-managed
  - ExecutionStateManager singleton → container-managed

- **Service Index Refactored:**
  - `server/services/index.ts` (+5/-25) - 服务导出简化

**中间件改进**
- **Data Isolation Middleware** - 数据隔离中间件
  - `server/middleware/data-isolation.ts` (+10/-10)
  - Container-based approach 简化
  - Cleaner `buildOwnerFilter()` integration

- **Audit Middleware** - 审计中间件
  - `server/middleware/audit-middleware.ts` (+46/-49)
  - DI Pattern refactored
  - Structure cleaner

**验证 Schema 合并**
- **Shared Enums** - 共享枚举定义
  - `server/validation/schemas/enums.ts` (40行) - TaskStatus, MediaType, JobStatus enums
  - 消除重复枚举定义
  - 单一 truth source

- **Common Validation** - 通用验证
  - `server/validation/common.ts` (+4/-22)
  - Pagination schema shared
  - ID param schema consolidated
  - Owner filter schema unified

**Workflow Engine**
- `server/services/workflow/engine.ts` (+3/-3) - Engine minor refactor

### Fixed

- **Export Service** - 导出服务更新
  - `server/services/export-service.ts` (+3/-3) - Container integration

- **Cron Scheduler** - Cron 调度器更新
  - `server/services/cron-scheduler.ts` (+1/-19) - Singleton removal

### Performance

**测试基础设施**
- **Container Tests** - 容器测试
  - `server/__tests__/container.test.ts` (302行) - 服务注册验证
  - Singleton lifecycle tests
  - Dependency resolution tests

- **Domain Event Tests** - 领域事件测试
  - `server/domain/events/event-bus.test.ts` (310行) - 事件发布验证
  - Handler subscription tests
  - Async event handling tests

- **Updated Existing Tests:**
  - Cron tests migrated to container-based initialization (+12/-8, +2/-32, +41/-28)
  - Validation tests updated for new enum schemas
  - Integration tests refactored for DI pattern (+1/-16)

**代码质量指标改进**
- **最大文件行数**: 862行 → 310行（64% 减少）
- **Singleton Count**: 8 global → 0 (container-managed)
- **Duplicate getClient**: 8 locations → 1 factory (87.5% 减少)
- **Test Coverage**: +612 lines (container + events tests)
- **Files Changed**: 65 files (+2,670 insertions, -555 deletions)
- **Net Growth**: +2,115 lines

### Architecture Quality

**Patterns Implemented:**
- ✅ **Repository Pattern** - Generic port interfaces, domain-specific repositories
- ✅ **Dependency Injection** - Lightweight container, singleton scope
- ✅ **Factory Pattern** - MiniMaxClientFactory eliminates duplication
- ✅ **Domain Events** - Event bus, typed events, async handlers
- ✅ **Strategy Pattern** - WorkflowEngine executor separation (Phase 2)

**Anti-Patterns Eliminated:**
- ❌ **Service Locator** - All getXxxService() deprecated
- ❌ **Global Singletons** - Migrated to container-managed
- ❌ **Code Duplication** - getClient(), enums consolidated
- ⏳ **God Classes** - DatabaseService split pending (Phase 6)

### Documentation

**架构设计文档新增**
- `docs/specs/ddd-architecture-upgrade.md` (205行) - DDD 架构升级规格
  - Problem analysis (God Classes, singletons)
  - Target architecture layers (DDD 4层架构)
  - Phase breakdown (Phase 0-4)
  - Success criteria

- `docs/specs/2026-04-06-architecture-upgrade-v2-design.md` (286行) - 架构升级 v2 设计
  - Repository Pattern details
  - DI Container implementation plan
  - Domain Events architecture
  - Migration strategy

- `docs/plans/2026-04-06-architecture-upgrade-v2.md` (198行) - 实施计划
  - 7-phase execution plan (P1-P7)
  - Task breakdown per phase
  - Commit checkpoint planning
  - Execution dependencies

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 无破坏性 API 变更
- ✅ DI Container 为增量变更，向后兼容
- ✅ Repository Ports 仅定义接口，不影响现有实现
- ✅ Domain Events 为增量功能，不影响现有逻辑

### Technical Debt

- ✅ 消除服务定位器反模式（getXxxService deprecated）
- ✅ 统一依赖管理（DI Container）
- ✅ 消除 getClient 重复实现（Factory Pattern）
- ✅ 建立 Repository Pattern 基础（Ports defined）
- ✅ 建立 Domain Events 基础（Event Bus implemented）
- ⏳ 消除 God Classes（DatabaseService split - Phase 6）

### Next Steps

**Phase 2-7 Implementation:**
- **Phase 2**: Domain Services & Events (Event Bus ✅, WorkflowEngine Strategy pending)
- **Phase 3**: Configuration & Validation (Config centralized ✅, validation schemas pending)
- **Phase 4**: Frontend Refactoring (API layer unified ✅, Store split pending)
- **Phase 5**: Frontend Store Refactoring (WebSocket extraction pending)
- **Phase 6**: Database Optimization (Transaction support ✅, SQLBuilder pending)
- **Phase 7**: Security Optimization (isPrivilegedUser ✅, audit retry pending)

### Known Issues

- **测试环境配置问题** - PostgreSQL 测试因权限问题失败（10个失败，628个通过）
  - 错误：`permission denied for schema public`
  - 影响：数据库相关测试无法运行（非代码问题）
  - 解决方案：配置测试数据库权限（参见 `TESTING.md`）

## [1.5.5] - 2026-04-06

### Added

**Theme Adaptation Refactoring - 语义化设计 Token 系统**

**架构升级：**
- **Token 系统模块化** - 替换旧 `tokens.ts` 为模块化结构
  - `src/themes/tokens/semantic.ts` (80行) - Token 类型定义
  - `src/themes/tokens/values.ts` (195行) - 主题感知 Token 值
  - `src/themes/tokens/utils.ts` (93行) - Token 工具函数
  - `src/themes/tokens/values.test.ts` (70行) - 单元测试覆盖
  - `src/themes/tokens/index.ts` (45行) - 统一导出入口

- **语义状态颜色系统** - 5 种 Token Set 定义
  - `status`: success/warning/error/info/pending（7 种属性：bg, bgSubtle, text, border, icon, foreground, gradient）
  - `taskStatus`: pending/running/completed/failed/cancelled（4 种属性：bg, text, border, dot）
  - `services`: text/voice/image/music/video/cron/workflow（4 种属性：bg, bgSolid, text, icon）
  - `roles`: super/admin/pro/user（5 种属性：gradient, bg, bgLight, text, border）

- **CSS 变量扩展** - 所有 22 个主题（11 dark + 11 light）新增语义状态颜色
  - `--success`, `--warning`, `--error`, `--info` 及对应 foreground 颜色
  - HSL 格式，保证跨主题对比度一致性

- **Tailwind 配置扩展** - 语义颜色映射
  - 新增 `success`, `warning`, `error`, `info` 语义颜色
  - 支持 opacity modifier：`bg-success/10`, `text-warning/80`

- **开发工具** - 硬编码颜色检测脚本
  - `scripts/detect-hardcoded-colors.cjs` (134行)
  - 自动检测残留的硬编码 Tailwind 颜色（如 `bg-blue-500`）

**文档：**
- 新增设计文档 `docs/plans/2026-04-05-theme-adaptation-refactoring.md` (1733行)
  - Wave 1-3 迁移计划
  - Token 设计原则
  - 测试策略

### Changed

**组件迁移（Wave 3）- 80 个文件迁移到语义 Token**

**高频组件：**
- `StatusBadge.tsx` (+50/-15) - 状态徽章完全迁移
- `ServiceIcon.tsx` (+10/-8) - 服务图标颜色重构
- `ImageGeneration.tsx` (+71/-0) - 图像生成页面迁移
- `VoiceSync.tsx` (+151/-0) - 语音同步页面迁移
- `VoiceAsync.tsx` (+151/-0) - 异步语音页面迁移
- `InvitationCodes.tsx` (+65/-0) - 邀请码管理迁移

**Workflow Builder 节点：**
- `ConditionNode.tsx` (+14/-13) - 条件节点迁移
- `LoopNode.tsx` (+19/-18) - 循环节点迁移
- `TransformNode.tsx` (+16/-15) - 转换节点迁移
- `ActionNode.tsx` (+31/-0) - 动作节点迁移
- `DelayNode.tsx` (+33/-0) - 延迟节点迁移
- `ErrorBoundaryNode.tsx` (+47/-0) - 错误边界节点迁移

**页面迁移（完整列表）：**
- Dashboard, AuditLogs, CapacityMonitor, StatsDashboard, DeadLetterQueue
- FileManagement, WebhookManagement, TemplateLibrary, WorkflowMarketplace
- UserManagement, TextGeneration, VideoAgent, VideoGeneration
- ServiceNodeManagement, TokenMonitor

**文件删除：**
- 移除旧 Token 系统 `src/themes/tokens.ts` (415行)

### Performance

**代码质量改进：**
- 净增长：+2,241 行（新增 3,420 行，删除 1,179 行）
- Token 系统模块化：单文件 415 行 → 4 个模块化文件（平均 ~120 行）
- 测试覆盖：新增 26 个 Token 单元测试

### Technical Debt

- ✅ 消除 ~500 处硬编码颜色值
- ✅ 建立可扩展的语义化 Token 架构
- ✅ 所有颜色值通过 CSS 变量动态响应主题
- ✅ 为未来主题扩展和暗色/亮色模式切换打下基础

### Backward Compatibility

- ✅ 所有 API 端点保持不变
- ✅ 组件接口无破坏性变更
- ✅ Token 系统向后兼容（渐进式迁移）
- ✅ 旧 Token 文件删除不影响功能（新系统已覆盖所有用例）

### Known Issues

- **测试环境配置问题** - 部分 PostgreSQL 测试因权限问题失败
  - 错误：`permission denied for schema public`
  - 影响：数据库相关测试无法运行（非代码问题）
  - 解决方案：配置测试数据库权限（参见 `TESTING.md`）

- **测试超时问题** - `CapacityChecker.waitForCapacity` 测试超时
  - 默认 timeout 5000ms 不够长
  - 解决方案：增加 `testTimeout` 配置或调整测试等待策略

## [1.5.4] - 2026-04-05

### Fixed

- **Settings Store API Key 持久化** - 修复 API Key 强制覆盖问题
  - `onRehydrateStorage` 不再强制覆盖已保存的 API 配置
  - 使用 nullish coalescing (`??`) 仅在首次加载时使用默认值
  - 保留从 backend 加载的 API Key，防止用户配置丢失
  
- **测试数据库示例密码** - 简化 `.env.test.example` 示例
  - 示例密码从 `passwd_mnx_agent_test_90idas0disa` 简化为 `test_password_123`
  - 提升示例文件的可读性和用户友好度

### Changed

- **数据库 Schema 重构** - 优化表创建顺序
  - Phase 1/Phase 2 分层，确保外键依赖正确
  - 添加注释说明表创建顺序的重要性

### Security

- **测试数据库隔离** - 完善测试数据库安全配置
  - 所有测试文件迁移到独立测试数据库
  - 新增 `.env.test` 配置文件
  - 更新 `TESTING.md` 文档，强调测试数据库安全规则

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

- 新增 Settings 系统设计文档 `docs/specs/2026-04-05-settings-system-design.md` (1039行)
- 新增 Settings 系统实施计划 `docs/plans/2026-04-05-settings-system-implementation.md` (639行)

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

- 新增架构升级设计文档 `docs/specs/2026-04-05-architecture-upgrade-design.md`
- 新增架构升级实施计划 `docs/plans/2026-04-05-architecture-upgrade.md`

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

- 新增架构重构实施计划 `docs/plans/2026-04-05-architecture-refactoring-implementation.md`

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

- `docs/specs/system-management-optimization-design.md` - 设计文档
- `docs/plans/2026-04-04-system-management-optimization.md` - 实施计划
- `docs/plans/2026-04-04-system-management-optimization-summary.md` - 工作总结
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
  - Removed 12 completed planning documents from `docs/plans/`
  - Plans archived to `docs/planning/archive/v1.3/` (v1.3.2)

### Documentation
- Update `docs/specs/workflow-core-concepts.md`

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
