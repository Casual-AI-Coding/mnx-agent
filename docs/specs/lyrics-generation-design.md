# 歌词生成功能设计文档

> R-023 - MiniMax 歌词生成 API 集成

---

## 1. 功能概述

### 1.1 目标

为 mnx-agent 调试台新增歌词生成功能，支持：
- AI 辅助歌词创作（write_full_song 模式）
- 歌词编辑优化（edit 模式）
- 生成结果预览与归档
- 一键转入编辑模式

### 1.2 API 来源

MiniMax 国际版歌词生成 API：
- **Endpoint**: `POST https://api.minimaxi.com/v1/lyrics_generation`
- **响应模式**: 同步（无轮询，直接返回结果）
- **超时**: 60 秒

---

## 2. MiniMax API 规格

### 2.1 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mode` | string | 否 | `write_full_song`（创作）或 `edit`（编辑），默认 `write_full_song` |
| `prompt` | string | 否 | 创作提示，最大 2000 字符，仅 write_full_song 模式 |
| `lyrics` | string | 编辑必填 | 待编辑的歌词文本，仅 edit 模式 |
| `title` | string | 否 | 歌曲标题，可选 |

### 2.2 响应结构

```json
{
  "song_title": "歌曲标题",
  "style_tags": ["pop", "emotional", "ballad"],
  "lyrics": "[Verse 1]\n歌词内容...\n[Chorus]\n副歌内容...",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### 2.3 错误码

| status_code | HTTP 映射 | 说明 |
|-------------|-----------|------|
| 0 | 200 | 成功 |
| 1002 | 429 | Rate Limit |
| 1004 | 401 | 认证失败 |
| 1008 | 402 | 余额不足 |
| 1026 | 400 | 内容敏感 |

---

## 3. 数据模型

### 3.1 存储方案

扩展 `media_records` 表，歌词作为纯文本存储在 `metadata` JSONB 字段。

**理由**：
- 歌词文本小（通常 < 10KB），无需文件存储
- 利用现有 media 管理系统
- 最小 schema 变更

### 3.2 Schema 变更

```sql
-- Migration: 添加 lyrics 类型
ALTER TABLE media_records 
DROP CONSTRAINT media_records_type_check;

ALTER TABLE media_records 
ADD CONSTRAINT media_records_type_check 
CHECK(type IN ('audio', 'image', 'video', 'music', 'lyrics'));

ALTER TABLE media_records 
DROP CONSTRAINT media_records_source_check;

ALTER TABLE media_records 
ADD CONSTRAINT media_records_source_check 
CHECK(source IN ('voice_sync', 'voice_async', 'image_generation', 
                 'video_generation', 'music_generation', 'lyrics_generation'));
```

### 3.3 Metadata 结构

```typescript
interface LyricsMetadata {
  title: string           // song_title
  style_tags: string[]    // style_tags
  lyrics: string          // lyrics 全文
  prompt?: string         // 创作提示（write_full_song）
  mode: 'write_full_song' | 'edit'
  generated_at: string    // ISO 时间戳
}
```

### 3.4 MediaType 扩展

```typescript
// packages/shared-types/entities/enums.ts
export type MediaType = 'audio' | 'image' | 'video' | 'music' | 'lyrics'
export type MediaSource = ... | 'lyrics_generation'
```

---

## 4. 功能需求

### 4.1 生成模式

| 模式 | 输入 | 输出 |
|------|------|------|
| **write_full_song** | prompt（可选）、title（可选） | 完整歌词 + 标题 + 风格标签 |
| **edit** | lyrics（必填）、prompt（可选） | 优化后的歌词 |

**UI 设计**：RadioGroup 模式切换，同一页面两种模式。

### 4.2 结果展示

**LyricsGeneration 页面**：
- 左侧：表单（模式选择、参数输入）
- 右侧：生成结果卡片列表（最近历史）

**结果卡片 (LyricsTaskCard)**：
- 标题 + 风格标签
- 歌词片段预览（3-4 行）
- 状态标识（生成中/完成/失败）
- 操作按钮：查看详情、编辑此歌词、导出 txt、存入媒体库

### 4.3 一键转入编辑

生成完成后，点击"编辑此歌词"按钮：
1. 切换到 edit 模式
2. 自动填充 lyrics 字段（当前生成的歌词）
3. 用户可添加编辑提示后重新生成

### 4.4 导出功能

导出为 `.txt` 文件：
- 文件名：`{song_title}.txt`
- 内容：结构化歌词文本（保留 `[Verse]` 等标签）

### 4.5 预览方案

**方案 C（混合）**：
- LyricsGeneration 页面：最近生成历史（临时，最多 10 条）
- MediaManagement：长期归档（存入 media_records）

---

## 5. MediaManagement 歌词预览

### 5.1 卡片视图 (MediaCard)

| 元素 | 内容 |
|------|------|
| 图标 | FileText（lucide） |
| Badge | "歌词" + 紫色渐变 |
| 预览 | 标题、风格标签、歌词片段（3-4行） |
| Hover | 歌词片段（开始到第一段 chorus/hook） |

### 5.2 详情弹窗 (LyricsPreviewModal)

| 元素 | 内容 |
|------|------|
| 头部 | 标题 + 风格标签 + 生成时间 |
| 主体 | 全量歌词（滚动浏览） |
| 左侧导航 | 结构标签列表（Verse、Chorus 等）+ "全量"选项 |
| 结构高亮 | `[Verse]` 等标签突出显示 |
| 操作 | 导出 txt、编辑（跳转 LyricsGeneration） |

### 5.3 Hover 预览 (LyricsHoverPreview)

- Portal 渲染（跟随鼠标）
- 显示：标题 + 风格标签 + 歌词片段
- 结构标签高亮

---

## 6. 歌词结构解析

### 6.1 标签格式

MiniMax 返回纯文本，结构标签格式：
```
[Verse 1]
歌词内容...

[Chorus]
副歌内容...

[Bridge]
过渡内容...
```

### 6.2 解析逻辑

```typescript
interface LyricsSection {
  type: string      // 'verse', 'chorus', 'bridge', 'outro', etc.
  number?: number   // Verse 1, Verse 2 的序号
  content: string   // 该段落歌词
  startIndex: number // 在全文中的起始位置
}

function parseLyricsSections(lyrics: string): LyricsSection[] {
  const regex = /\[(Verse|Chorus|Bridge|Outro|Hook|Intro)(?:\s+(\d+))?\]/g
  // ... 解析逻辑
}
```

### 6.3 高亮样式

```css
.lyrics-section-tag {
  color: var(--primary);
  font-weight: 600;
  background: var(--primary/10);
  padding: 2px 8px;
  border-radius: 4px;
}
```

---

## 7. UI 交互流程

### 7.1 创作模式

```
用户输入 prompt → 选择模式(write_full_song) → 点击生成 
→ 显示进度 → 完成后显示结果卡片 → 操作（查看/编辑/导出/存入）
```

### 7.2 编辑模式

```
用户输入 lyrics → (可选)输入 prompt → 选择模式(edit) → 点击生成
→ 显示进度 → 完成后显示优化后的歌词 → 操作
```

### 7.3 一键转入编辑

```
结果卡片 → 点击"编辑此歌词" → 自动切换 edit 模式 → 填充 lyrics → 用户添加编辑提示 → 生成
```

---

## 8. 国际化

### 8.1 新增翻译键

**zh.json**:
```json
{
  "sidebar": {
    "lyricsGeneration": "歌词生成"
  },
  "lyrics": {
    "title": "歌词生成",
    "modeWrite": "创作模式",
    "modeEdit": "编辑模式",
    "prompt": "创作提示",
    "promptPlaceholder": "描述你想要的歌词风格、主题...",
    "lyricsInput": "待编辑歌词",
    "lyricsPlaceholder": "输入需要优化的歌词...",
    "titleInput": "歌曲标题",
    "generate": "生成歌词",
    "result": "生成结果",
    "styleTags": "风格标签",
    "exportTxt": "导出 TXT",
    "editThis": "编辑此歌词",
    "saveToMedia": "存入媒体库",
    "sections": {
      "all": "全量歌词",
      "verse": "Verse",
      "chorus": "Chorus",
      "bridge": "Bridge",
      "outro": "Outro",
      "hook": "Hook",
      "intro": "Intro"
    }
  }
}
```

**en.json**:
```json
{
  "sidebar": {
    "lyricsGeneration": "Lyrics Generation"
  },
  "lyrics": {
    // ... 对应英文翻译
  }
}
```

---

## 9. 实现拆分

| 序号 | 计划文档 | 范围 |
|------|----------|------|
| 01 | `docs/plans/2026-04-18-01-lyrics-generation-backend.md` | MiniMax client + route + migration |
| 02 | `docs/plans/2026-04-18-02-lyrics-generation-frontend.md` | API client + types + 页面 + 结果卡片 |
| 03 | `docs/plans/2026-04-18-03-lyrics-generation-preview.md` | 歌词预览组件（hover、详情弹窗、结构导航） |
| 04 | `docs/plans/2026-04-18-04-lyrics-generation-media-integration.md` | MediaCard/MediaTableView 集成 + i18n + sidebar/route |

---

## 10. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-04-18 | 创建设计文档 |