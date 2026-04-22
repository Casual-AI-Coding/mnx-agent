# ADR-0001: 歌词卡片滚动交互实现策略

## Status

Accepted

---

## Context

歌词生成结果卡片需要实现"音乐播放器风格"的滚动焦点效果：当前居中的歌词结构块高亮显示，上下区块渐隐。在实现过程中遇到三个技术问题：

1. **逐行 focus 性能瓶颈**：歌词通常包含 200+ 行，每帧需计算每行与视口中心的距离并更新样式，导致滚动时严重掉帧（卡顿 1-2s）
2. **scroll-snap 与 scroll-padding 协作困难**：使用 `py-[50%]` 填充空白时，首个标签出现在视口中间而非顶部；改用 React state 驱动 padding 时，`useCenterBlock` 的 offset 计算与实际 DOM padding 应用存在时序差，导致高亮中心偏移
3. **吸附策略选择**：`mandatory` 强制吸附导致用户无法自由停留在任意位置，`proximity` 则需要精细的 padding 配合才能实现稳定居中

---

## Decision

### 1. 焦点粒度：Block-level（段落级）而非逐行

| 方案 | 每帧 DOM 操作 | 渲染性能 | 结论 |
|------|-------------|---------|------|
| 逐行 `<p>` + inline style | ~250 次读写 | 严重掉帧 | ❌ 废弃 |
| CSS 变量 `--focus` + `calc()` | ~1 次写，但触发大量重排 | 轻微卡顿 | ❌ 不够 |
| Block `<section>` + opacity 切换 | ~5 次读 | 60fps 流畅 | ✅ 采用 |

**取舍**：放弃逐行渐变的视觉细腻度，以段落为单位统一切换 opacity（100% / 30%），换取可流畅滑动的交互体验。

### 2. Scroll-padding 设置方式：DOM 直接操作

初始使用 `useState({top, bottom})` 计算并渲染 padding，但发现：
- React state 更新触发 re-render 后，`useCenterBlock` hook 中预计算的 offsets 与实际 DOM padding 不同步
- 高亮区域因此向下偏移，不在视口中心

**改为**：ResizeObserver 内直接操作 DOM：
```typescript
container.style.scrollPaddingTop = `${topPad}px`
container.style.scrollPaddingBottom = `${bottomPad}px`
```

这样 `useCenterBlock` 的 offset 计算与实际 snap padding 始终同步。

### 3. Snap-type：`proximity` 而非 `mandatory`

- `mandatory`：滚动必吸附到 snap 点，用户无法停在两段中间 → 体验生硬
- `proximity`：仅在接近 snap 点时吸附，配合精确的 scroll-padding 仍能实现稳定居中，同时保留自由滚动的感觉

---

## Consequences

### Positive
- 滚动帧率稳定在 60fps，无卡顿
- 首/尾歌词结构块均可完整滚动到视口中心
- 高亮区域准确居中，不再偏移
- 代码复杂度降低（无需维护逐行 focus 状态）

### Negative
- 视觉细腻度降低：从逐行渐变（opacity + blur + scale + weight + color-mix）简化为段落级统一 opacity
- 如果未来需要恢复逐行效果，需重新设计性能方案（如 WebGL / Canvas 渲染）

### Risks
- `proximity` 模式下，快速滑动时可能跳过某些段落不触发吸附。当前 block 数量少（通常 5-10 个）且 padding 足够，风险可控

---

## Metadata

| Field | Value |
|------|-------|
| Date | 2026-04-22 |
| Status | Accepted |
| Decider | Sisyphus |
| Related files | `src/components/lyrics/LyricsTaskCarousel.tsx`, `src/pages/LyricsGeneration.tsx` |
