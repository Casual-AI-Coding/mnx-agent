# MiniMax AI Toolset 架构升级实施计划 v2

> 日期: 2026-04-06
> 状态: 执行中
> 更新: 2026-04-09 - Phase 1 已完成

## Phase 1: 后端基础设施优化 ✅

### P1-1: 创建 DI Container
**状态**: `completed`
**输出**: server/container.ts (75行)
**验证**: 所有服务通过container获取 ✅

### P1-2: 创建 MiniMaxClientFactory
**状态**: `completed`
**输出**: server/lib/minimax-client-factory.ts (69行)
**验证**: 10个路由文件使用统一工厂 ✅

### P1-3: 增强 BaseRepository
**状态**: `completed`
**输出**: server/repositories/base-repository.ts (160行)
**验证**: getById/list/delete 支持 ownerId 参数 ✅

---

## Phase 2: 后端服务层重构

### P2-1: 重构服务初始化
**状态**: `pending`
**输入**: index.ts 硬编码
**输出**: container.register()
**验证**: 服务通过 DI 获取

### P2-2: 移除 getXxxService
**状态**: `pending`
**输入**: getXxxService() 调用
**输出**: 删除或标记 deprecated
**验证**: 无服务定位器调用

### P2-3: 服务接口化
**状态**: `pending`
**输入**: 具体服务类
**输出**: IService 接口
**验证**: 依赖注入接口

---

## Phase 3: 后端路由层重构

### P3-1: 提取 getClient 到工厂
**状态**: `pending`
**输入**: 8个路由文件
**输出**: MiniMaxClientFactory
**验证**: 无重复 getClient

### P3-2: 创建路由中间件
**状态**: `pending`
**输入**: 重复的 owner_id 处理
**输出**: ownerFilterMiddleware
**验证**: 路由简化

### P3-3: 统一错误处理
**状态**: `pending`
**输入**: handleApiError 重复
**输出**: 统一错误中间件
**验证**: 无重复错误处理

---

## Phase 4: 前端 API 层统一

### P4-1: 创建统一 APIClient
**状态**: `pending`
**输入**: Axios + Fetch 混用
**输出**: UnifiedAPIClient
**验证**: 单一客户端

### P4-2: 提取错误处理
**状态**: `pending`
**输入**: 各 API 文件重复
**输出**: ApiErrorHandler
**验证**: 统一错误格式

### P4-3: 创建 API Hooks
**状态**: `pending`
**输入**: Store 直接调用 API
**输出**: useApiQuery 等
**验证**: Store 仅 UI 状态

---

## Phase 5: 前端 Store 重构

### P5-1: 提取 WebSocket 管理
**状态**: `pending`
**输入**: Store 内嵌 WebSocket
**输出**: WebSocketManager
**验证**: Store 无 WebSocket 逻辑

### P5-2: 移动 settings store
**状态**: `pending`
**输入**: src/settings/store
**输出**: src/stores/settings
**验证**: 统一位置

### P5-3: 简化 Store 接口
**状态**: `pending`
**输入**: 复杂 Store
**输出**: 纯 UI 状态 Store
**验证**: Store 仅管理 UI 状态

---

## Phase 6: 数据库层优化

### P6-1: 添加事务支持
**状态**: `pending`
**输入**: 无事务
**输出**: DatabaseConnection.transaction()
**验证**: 多表操作原子性

### P6-2: 统一 SQL 方言
**状态**: `pending`
**输入**: isPostgres() 散落
**输出**: SQLBuilder 抽象
**验证**: 无 isPostgres 判断

### P6-3: DatabaseService 拆分
**状态**: `pending`
**输入**: 862 行
**输出**: 仅 Facade
**验证**: 每个方法委托 Repository

---

## Phase 7: 安全优化

### P7-1: BaseRepository 自动过滤
**状态**: `pending`
**输入**: 手动 owner_id
**输出**: 自动注入
**验证**: 无遗漏过滤

### P7-2: Admin bypass 统一
**状态**: `pending`
**输入**: 3 处重复
**输出**: isPrivilegedUser()
**验证**: 单一判断点

### P7-3: 审计日志重试
**状态**: `pending`
**输入**: 无重试
**输出**: 审计队列 + 重试
**验证**: 写入失败重试

---

## Commit 节点规划

```
Phase 1 完成: feat(server): add DI container and client factory
Phase 2 完成: refactor(server): remove service locator pattern
Phase 3 完成: refactor(server): unify route handlers
Phase 4 完成: feat(frontend): unify API layer
Phase 5 完成: refactor(frontend): simplify store layer
Phase 6 完成: feat(database): add transaction support
Phase 7 完成: refactor(security): unify permission filtering
```

## 执行顺序

1. **Phase 1**: P1-1 → P1-2 → P1-3 (串行)
2. **Phase 2**: P2-1 → P2-2 → P2-3 (串行，依赖Phase 1)
3. **Phase 3**: P3-1 → P3-2 → P3-3 (串行，依赖Phase 1)
4. **Phase 4**: P4-1 → P4-2 → P4-3 (串行)
5. **Phase 5**: P5-1 → P5-2 → P5-3 (串行，依赖Phase 4)
6. **Phase 6**: P6-1 → P6-2 → P6-3 (串行)
7. **Phase 7**: P7-1 → P7-2 → P7-3 (串行，依赖Phase 1, Phase 6)