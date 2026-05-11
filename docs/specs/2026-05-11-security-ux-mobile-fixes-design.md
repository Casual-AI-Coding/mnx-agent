# 安全、体验与移动端修复 - 设计文档

> **日期:** 2026-05-11  
> **来源:** 项目深度审视与 Oracle 风险排序复核  
> **范围:** 当前必须修复的 8 类问题 + 移动端适配基线  
> **实施原则:** 先安全边界，再可靠体验，最后文档同步；本设计只描述方案，不包含代码实现。

---

## 1. 背景与目标

mnx-agent 已具备多模态生成、媒体管理、Cron/DAG 工作流、DLQ、Webhook、容量监控、外部 API 日志、系统配置等能力。当前主要风险不在功能数量，而在多租户数据隔离、部分写路径授权原子性、复杂异步事件体验、移动端可用性与路线图可信度。

本轮修复目标：

1. 阻断已确认的跨租户媒体批量下载风险。
2. 收紧媒体与 Cron 相关写路径的 `owner_id` 约束。
3. 修复前端 404/通配路由、WebSocket 通知噪音、媒体管理加载延迟。
4. 建立移动端基础可用布局策略。
5. 同步 roadmap 与需求池，避免文档继续落后于真实版本。

---

## 2. 优先级与范围

| 优先级 | 项目 | 类型 | 本轮结论 |
|--------|------|------|----------|
| P0 | 媒体批量下载 owner 过滤 | Security | 必须立即修复 |
| P1 | Repository ownerId 传递一致性 | Security/Architecture | 本轮建立约束并先修关键路径 |
| P1 | Cron job update/toggleActive 原子授权 | Security | 本轮修复 |
| P1 | Media togglePublic owner 约束 | Security | 本轮修复 |
| P2 | 通配路由跳不存在的 `/dashboard` | UX | 本轮修复 |
| P2 | WebSocket toast 与重连策略 | UX/Reliability | 本轮修复 MVP |
| P2 | 媒体管理 500ms 人为加载延迟 | UX/Performance | 本轮修复 |
| P3 | Roadmap/需求池文档漂移 | Docs/Product | 本轮同步 |
| P2 | 移动端适配基线 | UX | 本轮建立基础可用能力 |

不纳入本轮实现的大型产品能力：Dashboard 深度升级、完整通知中心、请求回放、新手引导/帮助中心/错误码体系。这些需求已纳入或补充到需求池与 v2/v3 roadmap。

---

## 3. 安全修复设计

### 3.1 P0: 媒体批量下载跨租户读取

#### 现状

`server/routes/media.ts` 的批量下载接口按传入 ID 查询媒体记录并打包 zip。当前批量查询没有强制带当前用户 `owner_id`，存在已知 ID 被跨租户下载的风险。

#### 设计方案

1. 批量下载入口必须从 JWT 用户上下文取得当前用户 ID。
2. 批量查询必须在 SQL 层过滤：
   - `id IN (...)`
   - `owner_id = 当前用户 ID`
   - `is_deleted = false`
3. 普通用户只能下载自己拥有的媒体记录。
4. admin/super 如需要跨用户下载，必须走显式管理接口，不复用普通批量下载接口。
5. 当请求 ID 数量与可访问记录数量不一致时，默认采用“只返回可访问记录 + 审计记录”的策略，不向调用方暴露哪些 ID 存在但不可访问。

#### 测试要求

- 用户 A 批量下载自己的媒体 ID，返回 zip 成功。
- 用户 A 批量下载用户 B 的媒体 ID，不包含用户 B 文件。
- 用户 A 混合请求 A/B 两类 ID，只包含 A 的文件。
- 已软删除媒体不会出现在 zip 中。

---

### 3.2 P1: Repository ownerId 传递一致性

#### 现状

`server/repositories/base-repository.ts` 已支持 `ownerId`，但多个调用方仍省略 owner 过滤。长期会导致安全边界依赖调用方记忆，而不是依赖类型和接口约束。

#### 设计方案

1. 对用户资源型 Repository 采用“默认必须传 ownerId”的约定。
2. 普通业务路径调用 `getById(id, ownerId)`、`list({ ownerId })`、`delete(id, ownerId)`。
3. 管理员跨租户查询必须使用显式命名方法，例如：
   - `getByIdForAdmin(id)`
   - `listForAdmin(options)`
4. 本轮不做大规模重构，先修复以下高风险资源路径：
   - media records
   - cron jobs
   - external API logs 的详情/更新读取前置查询
5. 后续可补一条工程规则：凡表包含 `owner_id`，普通查询最终 SQL 必须包含 owner 条件。

#### 测试要求

- 每个被修复 Repository 增加跨租户读写测试。
- 测试名称中明确包含 `cross tenant` 或 `owner isolation`，便于后续检索。

---

### 3.3 P1: Cron job update/toggleActive 原子授权

#### 现状

`server/repositories/job-repository.ts` 中 `update()` 和 `toggleActive()` 会先用 `getById(id, ownerId)` 做存在性检查，但最终更新 SQL 只使用 `WHERE id = ...`，返回查询也未继续带 owner。

#### 设计方案

1. `update(id, updates, ownerId)` 的最终 SQL 改为：
   - 普通用户：`WHERE id = $id AND owner_id = $ownerId`
   - 系统内部无 owner 调用：保留显式系统路径，但调用方必须明确。
2. `toggleActive(id, ownerId)` 同样把 owner 条件放入最终 `UPDATE`。
3. 更新后返回 `getById(id, ownerId)`。
4. 如果最终 `UPDATE` 影响行数为 0，返回 `null`，由路由层转换为 404 或 403 风格响应。

#### 测试要求

- 用户 A 不能更新用户 B 的 Cron job。
- 用户 A 不能切换用户 B 的 Cron job active 状态。
- 用户 A 正常更新自己的 Cron job。
- 系统调度器内部更新运行统计不受影响。

---

### 3.4 P1: Media togglePublic owner 约束

#### 现状

`server/repositories/media-repository.ts` 的 `togglePublic(id, isPublic)` 内部使用 `getById(id)` 和 `UPDATE ... WHERE id = ...`，没有 owner 条件。

#### 设计方案

1. 方法签名调整为 `togglePublic(id, isPublic, ownerId)`。
2. 普通用户路径必须传当前用户 ID。
3. 最终更新 SQL 使用 `WHERE id = $id AND owner_id = $ownerId AND is_deleted = false`。
4. admin/super 批量公开或全局管理能力走单独方法，避免普通用户 API 与管理 API 语义混合。

#### 测试要求

- 用户 A 不能公开/取消公开用户 B 的媒体。
- 用户 A 可以公开/取消公开自己的媒体。
- 已删除媒体不能被重新公开。

---

## 4. 体验与可靠性修复设计

### 4.1 P2: 通配路由修复

#### 现状

`src/App.tsx` 的通配路由跳转到 `/dashboard`，但真实 Dashboard 路由是 `/`。

#### 设计方案

本轮采用低风险修复：

1. 增加 `/dashboard` 到 Dashboard 的显式别名，兼容已存在链接。
2. 通配路由改为渲染 NotFound 页面，而不是直接静默跳转。
3. NotFound 页面提供：
   - 返回首页
   - 返回上一页
   - 常用入口：生成、媒体库、Cron、工作流

#### 测试要求

- 访问 `/dashboard` 能看到 Dashboard。
- 访问未知路径显示 NotFound。
- NotFound 的返回首页按钮跳转 `/`。

---

### 4.2 P2: WebSocket toast 与重连策略

#### 现状

`showEventToast()` 对每个匹配事件直接 toast；多个页面使用 `useWebSocket({ showToasts: true })` 时可能重复提示。`scheduleReconnect()` 没有用户可感知的重连上限和静默降级策略。

#### 设计方案

1. 建立前端事件通知分级：
   - `error`: 任务失败、DLQ、容量告警，允许 toast。
   - `warning`: 重连失败、队列拥堵，节流 toast。
   - `info`: 创建、完成、测试开始，默认进入通知中心或页面状态，不直接 toast。
2. 增加 toast 去重：同一 `event.type + payload.id/jobId/workflowId` 在短时间窗口内只提示一次。
3. WebSocket 重连采用最大间隔与状态提示：
   - 继续指数退避。
   - 多次失败后只保留顶部连接状态或通知中心记录，不持续弹 toast。
4. `useWebSocket` 中页面级 `showToasts` 默认关闭，只有全局布局或通知中心负责 toast。

#### 测试要求

- 相同任务失败事件短时间内只 toast 一次。
- 成功事件不会刷屏。
- 断线重连不会连续弹出大量 toast。

---

### 4.3 P2: 媒体管理加载延迟

#### 现状

`src/hooks/useMediaManagement.ts` 的 `fetchMedia()` 在 finally 中强制最小 500ms loading。该策略可减少闪烁，但会放大分页、筛选、搜索的主观延迟。

#### 设计方案

1. 初次加载保留 skeleton，避免首屏闪烁。
2. 筛选、分页、搜索不再强制 500ms 延迟。
3. 搜索输入使用 debounce 控制请求频率，避免每次输入都请求。
4. 列表刷新采用局部 loading 状态，不清空旧列表，降低视觉跳动。

#### 测试要求

- 初次加载仍显示 skeleton。
- 后续分页响应不被人为延迟。
- 快速输入搜索只触发 debounce 后的请求。

---

## 5. 移动端适配基线设计

### 5.1 目标

本轮移动端不追求完整复杂编辑能力，而是保证核心查看与简单操作可用：

- 查看 Dashboard 状态。
- 查看媒体列表与详情。
- 发起基础生成任务。
- 查看 Cron/Workflow/DLQ 状态。
- 处理简单启停、重试、复制、下载操作。

### 5.2 布局策略

1. `AppLayout` 在小屏下取消固定桌面 sidebar 占位。
2. `Sidebar` 在移动端变为抽屉：
   - Header 左侧显示菜单按钮。
   - 抽屉打开时覆盖内容区。
   - 点击遮罩或导航项后关闭。
3. 主内容区在移动端使用 `px-4 py-4`，避免横向滚动。
4. 表格类页面提供卡片布局或横向滚动容器。
5. WorkflowBuilder 移动端先提供只读/预览与基础测试入口，不强制完整拖拽编辑。

### 5.3 交互策略

1. 所有可点击卡片、按钮、图标按钮具备明确 hover/focus/active 状态。
2. 移动端关键操作按钮不依赖 hover。
3. Toast 避免遮挡底部输入和主要操作按钮。
4. 表单输入使用合适的 `inputMode` 与键盘类型。
5. 支持 `prefers-reduced-motion`，减少抽屉和页面切换动画。

### 5.4 验收断点

必须至少覆盖以下宽度：

- 375px: iPhone 小屏基础可用。
- 768px: 平板竖屏布局合理。
- 1024px: 平板横屏/小笔记本过渡正常。
- 1440px: 桌面体验不退化。

---

## 6. Roadmap 与需求池同步设计

### 6.1 当前文档漂移

需求池和 roadmap 中存在以下漂移：

1. `package.json` 已到 v2.2.8，但 `v2-roadmap.md` 当前状态仍写 v2.2.6。
2. `requirement-pools.md` 的 ID 范围仍写 R-001 ~ R-024，但文件内已存在 R-025。
3. `R-016 全局 Toast/通知系统` 版本为 `-`，但本次分析确认它应进入 v3 体验路线。
4. `R-022 用量监控完善` 现状描述“页面内容为空”已不准确，应改为“已有本地统计雏形，但未接真实后端统计与配额趋势”。

### 6.2 9-12 大型需求处理

| 编号 | 建议项 | 需求池状态 | Roadmap 处理 |
|------|--------|------------|--------------|
| 9 | Dashboard 运营总览 | 已有 R-005 | 保持 v3.2，补充真实指标、失败摘要、容量风险 |
| 10 | 全局通知中心 | 已有 R-016 | 分配到 v3.2，与 Dashboard 联动 |
| 11 | 请求回放与参数复用 | 已有 R-009 | 保持 v2.6，补充历史生成参数复用与审计回放边界 |
| 12 | 新手引导、帮助中心、错误码速查 | 已有 R-010/R-011/R-020 | 保持 v3.4/v3.5，补充组合式帮助体系 |

---

## 7. 实施批次建议

### 批次一：安全阻断

1. 修媒体批量下载 owner 过滤。
2. 修 media togglePublic owner 约束。
3. 修 cron update/toggleActive 最终 SQL owner 条件。
4. 补跨租户回归测试。

### 批次二：体验快修

1. 修 `/dashboard` alias 与 NotFound。
2. 修 WebSocket toast 去重与重连提示策略。
3. 去除媒体管理后续加载的人为 500ms 延迟。

### 批次三：移动端基线

1. AppLayout/Sidebar 移动端抽屉化。
2. Dashboard/Media/Cron/Workflow 关键页面断点检查。
3. 修复横向滚动、遮挡和触控目标问题。

### 批次四：文档同步

1. 更新需求池状态和详情。
2. 更新 v2/v3 roadmap。
3. 将本设计文档作为后续实现计划输入。

---

## 8. 验收标准

1. 安全：所有本轮修复的用户资源读写最终 SQL 均包含 `owner_id` 约束或走显式 admin 方法。
2. 测试：media batch、media public toggle、cron update/toggle 均有跨租户测试。
3. UX：未知路由不再跳不存在页面，WebSocket 不再重复 toast，媒体列表筛选无固定 500ms 延迟。
4. 移动端：375px 下可完成登录后导航、查看 Dashboard、浏览媒体、查看 Cron/Workflow 状态。
5. 文档：需求池、v2 roadmap、v3 roadmap 与当前规划一致。
