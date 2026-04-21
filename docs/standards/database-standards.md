# Database Standards

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

## 1. 表结构设计

### 1.1 必含字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | UUID v4 主键 |
| created_at | TIMESTAMP | 创建时间（本地时间） |
| updated_at | TIMESTAMP | 更新时间（本地时间） |
| deleted_at | TIMESTAMP | 删除时间（软删除） |
| owner_id | VARCHAR(36) | 所有者（用户隔离） |

### 1.2 id 规范

- 类型：`VARCHAR(36)`（存储 UUID 字符串）
- 生成：在应用层生成（`crypto.randomUUID()`）
- 格式：标准 UUID v4（如 `550e8400-e29b-41d4-a716-446655440000`）

### 1.3 时间字段类型

PostgreSQL 使用 `TIMESTAMP WITHOUT TIME ZONE`（无时区）

---

## 2. 字段命名约定

### 2.1 时间字段

| 字段 | 说明 |
|------|------|
| created_at | 创建时间 |
| updated_at | 最后更新时间 |
| deleted_at | 软删除时间（软删除记录时写入） |

### 2.2 软删除标志

| 字段 | 类型 | 说明 |
|------|------|------|
| is_deleted | BOOLEAN | 删除标志（默认 false） |

---

## 3. 索引策略

### 3.1 必须建索引的字段

| 字段类型 | 原因 |
|----------|------|
| 外键字段 | 关联查询 |
| 频繁查询字段 | 加速过滤 |
| 排序字段 | 加速排序 |

### 3.2 索引命名

格式：`idx_{table}_{column}`

| 示例 |
|------|
| idx_cron_jobs_owner_id |
| idx_media_records_owner_id |
| idx_execution_logs_job_id |

---

## 4. Migration 规范

### 4.1 文件命名

格式：`migration_{NNN}_{description}.ts`

编号连续递增（当前最大 029）

### 4.2 Migration 结构

```typescript
const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: 'migration_001_initial_schema',
    sql: SCHEMA_SQL,
  },
  // ...
]
```

### 4.3 执行规则

- 每条 migration 独立可执行
- 自动执行未运行的 migration
- 不可重复执行已运行的 migration

---

## 5. 时间处理规则

### 5.1 存入数据库

**必须使用** `toLocalISODateString()`（返回本地时间，无 Z 后缀）

```typescript
import { toLocalISODateString } from '@/lib/date-utils.js'

// ✅ 正确
const now = toLocalISODateString()

// ❌ 禁止
const now = new Date().toISOString()
```

### 5.2 场景分类

| 场景 | 使用函数 | 说明 |
|----------|---------|------|
| 存入数据库 | `toLocalISODateString()` | 返回本地时间（无 Z） |
| API 响应 | `toISOString()` | 返回给前端解析 |
| 外部 API 调用 | `toISOString()` | MiniMax 等外部服务 |
| 日志/调试 | `toISOString()` | 按 UTC 日期 |

### 5.3 问题背景

PostgreSQL 使用 `TIMESTAMP WITHOUT TIME ZONE`，`toISOString()` 返回 UTC 时间（带 `Z` 后缀），导致存储和显示时间偏差 8 小时。

---

## 6. 软删除规范

### 6.1 实现方式

```typescript
// 字段：is_deleted BOOLEAN + deleted_at TIMESTAMP

// 查询时自动过滤
WHERE is_deleted = false

// 软删除时
UPDATE SET is_deleted = true, deleted_at = NOW()
```

### 6.2 查询规则

- 所有 SELECT 必须包含 `WHERE is_deleted = false`
- Repository 层自动处理
- 不得绕过软删除查询已删除记录（除非明确需要）

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |