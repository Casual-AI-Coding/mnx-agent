# 并行音乐生成实现计划

> 创建时间: 2026-04-11

## 实现步骤

### Step 1: 后端日志增强

**文件**: `server/lib/minimax.ts`

**改动**:
- 在 `musicGeneration()` 方法中添加入参日志打印
- 格式: `[MiniMax] Music Generation Request: { body, timestamp }`

**验证**:
- 调用音乐生成 API，检查终端日志输出

---

### Step 2: 状态模型实现

**文件**: `src/pages/MusicGeneration.tsx`

**改动**:
- 扩展状态从单结果 → 多任务数组
- 新增状态字段:
  - `tasks: MusicTask[]`
  - `currentIndex: number`
  - `isGenerating: boolean`
  - `parallelCount: number`
- 实现 `updateTask(index, updates)` 辅助函数

**验证**:
- 状态初始化正确
- updateTask 能正确更新数组元素

---

### Step 3: 并发生成逻辑

**文件**: `src/pages/MusicGeneration.tsx`

**改动**:
- 重写 `handleGenerate()` 函数:
  - 初始化 N 个 task
  - `Promise.allSettled` 管理并发请求
  - 每个请求独立状态更新
- 实现 `retryTask(index)` 单任务重试

**验证**:
- 设置 parallelCount=3，点击生成
- 观察三个任务并发执行
- 检查单个失败后的重试功能

---

### Step 4: UI 组件拆分

**新增文件**:
- `src/components/MusicTaskCard.tsx` - 单任务卡片
- `src/components/MusicCarousel.tsx` - 轮播容器 + 概览条

**MusicTaskCard 结构**:
```tsx
- Badge (状态徽章)
- Progress bar (进度条)
- Audio player (完成后)
- Error message + Retry button (失败时)
```

**MusicCarousel 结构**:
```tsx
- Left/Right arrow buttons
- Task card slot
- Overview strip (点状进度)
```

**验证**:
- 组件渲染正确
- props 传递无误

---

### Step 5: 集成到主页面

**文件**: `src/pages/MusicGeneration.tsx`

**改动**:
- 参数区域添加并行数量滑块 (Slider, 1-10)
- 结果区域替换为 `<MusicCarousel>`
- 生成按钮添加进度文字显示
- 添加键盘事件监听 (左右箭头)

**验证**:
- 滑块调整 parallelCount
- 轮播导航工作正常
- 键盘快捷键生效

---

### Step 6: 边界处理

**文件**: `src/pages/MusicGeneration.tsx`

**改动**:
- useEffect cleanup: revoke blob URLs
- 音频切换: 暂停当前播放
- 生成中禁用参数调整

**验证**:
- 组件卸载后 blob URL 释放
- 切换卡片时音频停止

---

### Step 7: 最终测试

**测试场景**:
1. 单任务生成 (parallelCount=1) - 与现有行为一致
2. 多任务生成 (parallelCount=3) - 并发执行
3. 单任务失败 + 重试
4. 轮播导航（箭头、键盘、点击概览条）
5. 生成中参数锁定

**验收标准**:
- 所有场景通过
- 无 TypeScript 错误
- 无 console 错误
- 后端日志正确输出

---

## 文件修改清单

| 文件 | 改动类型 |
|------|----------|
| `server/lib/minimax.ts` | 增强 |
| `src/pages/MusicGeneration.tsx` | 重构 |
| `src/components/MusicTaskCard.tsx` | 新增 |
| `src/components/MusicCarousel.tsx` | 新增 |

## 预估时间

2-3 小时

## 风险点

- 并发请求可能导致浏览器内存压力（parallelCount=10 时）
- blob URL 内存泄漏风险（需严格 cleanup）