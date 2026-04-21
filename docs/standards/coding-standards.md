# Coding Standards

> Version: 1.0.0
> Date: 2026-04-22
> Status: Active

## 1. TypeScript 规范

### 1.1 编译配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 1.2 禁止的写法

| 禁止写法 | 原因 | 替代方案 |
|----------|------|----------|
| `any` 类型 | 绕过类型检查 | 使用 `unknown` + 类型守卫 |
| `@ts-ignore` | 静默错误 | 修复类型问题 |
| `@ts-expect-error` | 静默错误 | 修复测试或类型 |
| `as SomeType` 类型断言 | 强制转换 | 类型守卫或显式转换函数 |

### 1.3 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 接口 | PascalCase | `interface MediaRecord {}` |
| 类型别名 | PascalCase | `type MediaType = 'audio'` |
| 函数 | camelCase | `function getMediaById() {}` |
| 变量/const | camelCase | `const apiKey = ''` |
| 全局常量 | SCREAMING_SNAKE_CASE | `const MEDIA_ROOT = './data'` |
| 文件名 | kebab-case | `media-service.ts` |
| 路由 | kebab-case | `/api/media-records` |

### 1.4 路径别名

```json
"@/*": ["./src/*"]
```

导入时使用：`import { getMediaById } from '@/services/media-service'`

---

## 2. 文件组织

### 2.1 文件行数上限

- **单文件行数上限：300 行**
- 超过 300 行的组件/模块必须拆分
- 触发拆分条件：
  - 组件行数超过 300
  - 职责超过 1 个
  - 可独立测试的逻辑混合在一起
  - 超过 10 个 props

### 2.2 导入顺序

```typescript
// 1. Node.js 内置
import { join } from 'path'

// 2. 外部依赖
import express from 'express'

// 3. 内部别名（@/）
import { getMediaById } from '@/services/media-service'

// 4. 相对导入（../）
import { asyncHandler } from '../lib/async-handler.js'
```

---

## 3. React 组件规范

### 3.1 组件拆分原则

满足以下任一条件即拆分：

| 条件 | 说明 |
|------|------|
| 行数 > 200 | 组件体过长 |
| 职责 > 1 | 同时做数据获取和 UI 渲染 |
| 可复用 | 多个地方用到 |
| 超过 8 个 props | 接口膨胀 |

### 3.2 Props 接口定义

```typescript
interface ButtonProps {
  variant?: 'default' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
}
```

### 3.3 Hooks 复用原则

- 将可复用逻辑提取到 custom hook（`useXxx`）
- Hook 中不包含 UI 逻辑
- Hook 返回值类型明确

---

## 4. Zustand 状态管理

### 4.1 Store 拆分原则

| 拆分维度 | 说明 |
|----------|------|
| 按领域 | auth, media, cron, workflow 分开 |
| 不混合 | UI 状态和业务状态分开 |

### 4.2 Store 间通信

**禁止**：Store 之间直接调用（`useAuthStore.getState().xxx`）

**允许**：通过 React 组件中转或事件总线

### 4.3 Persist 配置

```typescript
persist(
  (set) => ({ ... }),
  { name: 'store-key' }
)
```

- key 唯一，不重复
- 不 persist 敏感信息（token 除外）

---

## 5. 错误处理模式

### 5.1 asyncHandler 包装

```typescript
// 所有路由处理器必须用 asyncHandler 包装
router.get('/', asyncHandler(async (req, res) => {
  const media = await getMediaById(req.params.id)
  res.json({ success: true, data: media })
}))
```

### 5.2 响应 envelope

```typescript
// 成功
{ success: true, data: {...} }

// 失败
{ success: false, error: "错误信息" }
```

### 5.3 错误分类

| 类型 | 处理方式 |
|------|----------|
| 业务错误 | 返回明确的错误信息 |
| 系统错误 | 日志记录，返回通用错误 |
| 外部 API 错误 | 日志记录，映射到 HTTP 状态码 |

---

## 6. 代码评审 Checklist

### 6.1 必查项

- [ ] 无 `any` / `@ts-ignore` / `as` 类型断言
- [ ] 导入顺序正确
- [ ] 单文件不超过 300 行
- [ ] 错误使用 asyncHandler 包装
- [ ] 响应使用统一 envelope
- [ ] 无硬编码字符串（配置化）
- [ ] 敏感信息不记录日志

### 6.2 建议项

- [ ] 函数有 JSDoc（公共 API）
- [ ] 复杂逻辑有注释
- [ ] 测试覆盖关键路径

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-22 | 初始版本 |