# 音乐生成功能增强设计

> 对齐官方 MiniMax 音乐调试台，补齐缺失功能

## 概述

### 目标

将当前音乐生成功能对齐官方 MiniMax 音乐调试台，补齐以下缺失功能：

| 功能 | 官方支持 | 当前状态 |
|------|----------|----------|
| 纯音乐模式 | music-2.6 / 2.5+ | 完全缺失 |
| seed 复现参数 | music-2.6 | 完全缺失 |
| music-cover 翻唱模式 | 一步 + 两步 | 完全缺失 |
| AI 歌词优化范围 | 2.5 / 2.5+ / 2.6 | 仅 2.5+ |
| 高级设置面板 | 折叠面板 | UI 不可见 |
| 字符计数器 | 风格 2000 / 歌词 3500 | 缺失 |

### 影响范围

- **Frontend**: `src/pages/MusicGeneration.tsx`, `src/lib/api/music.ts`
- **Backend**: `server/routes/music.ts`, `server/lib/minimax.ts`
- **新增**: 预处理 API `/music/preprocess`

---

## 功能设计

### 1. 纯音乐模式

**适用模型**: `music-2.6`, `music-2.5+`

**逻辑**:
- 勾选后歌词变为可选
- 风格描述定义音乐风格和段落结构
- 不填歌词则生成无人声纯音乐

**UI**:
```tsx
// Model selector 下方
<Checkbox 
  checked={instrumental}
  onCheckedChange={setInstrumental}
  disabled={!['music-2.6', 'music-2.5+'].includes(model)}
>
  纯音乐模式（无歌词）
</Checkbox>
```

**提示文案**: 「纯音乐模式下，歌词为可选。可填写风格描述定义音乐风格和段落结构」

**API**: 无新增参数，通过 lyrics 是否为空判断

---

### 2. Seed 复现参数

**适用模型**: `music-2.6`

**逻辑**:
- 相同 seed + 相同输入 = 相同输出
- 留空则随机生成

**UI**:
```tsx
<Input 
  label="Seed" 
  type="number" 
  placeholder="留空则随机" 
  disabled={model !== 'music-2.6'}
/>
```

**API**: 
```typescript
interface MusicGenerationRequest {
  model: string
  lyrics?: string
  style_prompt?: string
  seed?: number  // 新增
  // ...
}
```

---

### 3. AI 歌词优化范围修正

**当前**: 仅 `music-2.5+` 显示开关

**修正**: `music-2.5`, `music-2.5+`, `music-2.6` 都支持

**代码变更**:
```tsx
// 当前代码
disabled={model !== 'music-2.5+'}

// 修正为
disabled={!['music-2.5', 'music-2.5+', 'music-2.6'].includes(model)}
```

---

### 4. Music-Cover 翻唱模式

**模型**: `music-cover`

**两种模式**:

#### 一步模式

**流程**:
1. 输入参考音频 URL（必填）
2. 输入风格描述（可选）
3. 歌词可选（系统自动提取）
4. 点击生成

**UI**:
```tsx
<div className="翻唱面板">
  <Label>参考音频 URL *</Label>
  <Input placeholder="https://example.com/song.mp3" />
  
  <Label>翻唱风格描述</Label>
  <Textarea maxLength={2000} />
  
  <Checkbox>使用原歌词（自动提取）</Checkbox>
  <Textarea placeholder="或自定义歌词..." maxLength={3500} />
</div>
```

#### 两步模式

**流程**:
1. 上传本地音频 → POST `/music/preprocess`
2. 后端调用 MiniMax 预处理 API，返回提取歌词
3. 用户查看/修改歌词
4. 点击生成

**预处理 API**:
```
POST /music/preprocess
Request: FormData { audio_file: File }
Response: {
  lyrics: string,
  audio_url: string,
  duration: number
}
```

**MiniMax API 映射**:
| 功能 | API |
|------|-----|
| 预处理 | `/v1/music_cover_preprocess` |
| 翻唱生成 | `/v1/music_generation` (model=music-cover) |

**UI**:
```tsx
<Tabs defaultValue="one-step">
  <TabsList>
    <TabsTrigger value="one-step">一步模式</TabsTrigger>
    <TabsTrigger value="two-step">两步模式</TabsTrigger>
  </TabsList>
  
  <TabsContent value="one-step">
    {/* URL 输入 */}
  </TabsContent>
  
  <TabsContent value="two-step">
    <FileUpload onUpload={handlePreprocess} />
    {preprocessResult && (
      <Textarea defaultValue={preprocessResult.lyrics} />
    )}
  </TabsContent>
</Tabs>
```

---

### 5. 高级设置面板

**位置**: 主输入区域下方，折叠面板

**参数**:
| 参数 | 类型 | 选项 | 默认值 |
|------|------|------|--------|
| sample_rate | select | 44100 / 48000 | 44100 |
| bitrate | select | 128k / 192k / 256k / 320k | 256k |
| format | select | mp3 / wav / flac | mp3 |
| seed | number | 任意整数 | 空（随机） |

**UI**:
```tsx
<Collapsible defaultOpen={false}>
  <CollapsibleTrigger>高级设置</CollapsibleTrigger>
  <CollapsibleContent>
    <div className="grid grid-cols-2 gap-4">
      <Select label="采样率" options={['44100', '48000']} />
      <Select label="比特率" options={['128k', '192k', '256k', '320k']} />
      <Select label="输出格式" options={['mp3', 'wav', 'flac']} />
      <Input label="Seed" type="number" placeholder="留空则随机" />
    </div>
  </CollapsibleContent>
</Collapsible>
```

**API 传递**:
- `audio_setting: { sample_rate, bitrate }`
- `output_format: format`
- `seed: seed` (仅 music-2.6 有效)

---

### 6. 字符计数器

**位置**: 输入框下方

**实现**:
```tsx
// 风格描述
<Textarea maxLength={2000} />
<div className={cn(
  "text-xs",
  stylePrompt.length > 2000 ? "text-red-500" : "text-muted-foreground"
)}>
  {stylePrompt.length} / 2000
</div>

// 歌词
<Textarea maxLength={3500} />
<div className={cn(
  "text-xs",
  lyrics.length > 3500 ? "text-red-500" : "text-muted-foreground"
)}>
  {lyrics.length} / 3500
</div>
```

**样式**:
- 正常：灰色 (`text-muted-foreground`)
- 超限：红色 (`text-red-500`) + 输入框边框变红 + 禁用提交

---

## 架构设计

### 整体架构

```
Frontend (MusicGeneration.tsx)
├── Model Selector (music-cover 分支 UI)
├── Main Input Area
│   ├── 纯音乐模式 Checkbox
│   ├── 风格描述 Input + 字符计数 (2000)
│   ├── AI 歌词优化 Checkbox (2.5/2.5+/2.6)
│   └── 歌词编辑器 + 字符计数 (3500)
├── Music-Cover 翻唱面板 (model=music-cover)
│   ├── 一步模式: 参考音频 URL + 风格描述
│   ├── 两步模式: 上传预处理 → 歌词提取 → 编辑 → 生成
├── 高级设置折叠面板
│   ├── sample_rate, bitrate, format
│   └── seed
├── Templates (5个)
└── Audio Player + Download

Backend
├── POST /music/generate (增强参数: seed, audio_setting)
├── POST /music/preprocess (新增: 预处理)
└── MiniMaxClient
    ├── musicGeneration() (增加 seed 参数)
    └── musicPreprocess() (新增方法)
```

### API 变更

#### POST /music/generate

**增强请求参数**:
```typescript
interface MusicGenerationRequest {
  model: 'music-2.6' | 'music-cover' | 'music-2.5' | 'music-2.5+'
  lyrics?: string           // 纯音乐模式可为空
  style_prompt?: string     // 纯音乐模式必填
  optimize_lyrics?: boolean // 适用于 2.5/2.5+/2.6
  audio_setting?: {
    sample_rate?: 44100 | 48000
    bitrate?: '128k' | '192k' | '256k' | '320k'
  }
  output_format?: 'mp3' | 'wav' | 'flac'
  seed?: number             // 仅 music-2.6 有效
  
  // music-cover 特有
  reference_audio_url?: string  // 参考音频 URL
  use_original_lyrics?: boolean // 使用原歌词
}
```

#### POST /music/preprocess (新增)

```typescript
// Request: FormData
{
  audio_file: File
}

// Response
{
  lyrics: string,
  audio_url: string,
  duration: number
}
```

### MiniMax Client 变更

**新增方法**:
```typescript
class MiniMaxClient {
  // 现有方法增强
  musicGeneration(params: {
    model: string
    lyrics?: string
    style_prompt?: string
    optimize_lyrics?: boolean
    audio_setting?: AudioSetting
    output_format?: string
    seed?: number           // 新增
    reference_audio_url?: string  // 新增 (music-cover)
  }): Promise<MusicGenerationResult>

  // 新增方法
  musicPreprocess(audioFile: File): Promise<{
    lyrics: string
    audio_url: string
    duration: number
  }>
}
```

---

## 数据流

### 普通生成流程

```
用户输入 → Frontend 状态 → API 请求 → MiniMax Client → MiniMax API → 结果 → 播放/下载
```

### 翻唱两步模式流程

```
1. 用户上传 → POST /music/preprocess → MiniMax music_cover_preprocess → 返回歌词
2. 用户编辑歌词 → POST /music/generate → MiniMax music_generation → 返回音频
```

---

## 错误处理

### 纯音乐模式

- lyrics 为空 + style_prompt 为空 → 错误提示「纯音乐模式需要填写风格描述」
- 非支持模型勾选 → Checkbox 禁用

### 翻唱模式

- 参考音频 URL 无效 → 错误提示「参考音频 URL 格式无效」
- 预处理失败 → 显示 MiniMax API 错误信息
- 音频文件格式不支持 → 提示「仅支持 mp3/wav/flac 格式」

### 字符计数

- 超限时 → 禁用提交按钮 + 红色提示

---

## 测试要点

1. **纯音乐模式**
   - 勾选后歌词可选
   - 非支持模型禁用
   - 风格描述为空时阻止提交

2. **Seed 复现**
   - 相同 seed + 输入产生相同结果
   - music-2.5 不支持 seed 时禁用

3. **AI 歌词优化**
   - music-2.5, 2.5+, 2.6 都可启用
   - music-cover 不支持时禁用

4. **翻唱模式**
   - 一步模式 URL 输入正常
   - 两步模式预处理成功返回歌词
   - 生成的翻唱音频播放正常

5. **高级设置**
   - 参数正确传递到 API
   - 默认值正确

6. **字符计数**
   - 实时计数准确
   - 限时 UI 正确反馈

---

## 实现优先级

| 优先级 | 功能 | 原因 |
|--------|------|------|
| P0 | 纯音乐模式 | 核心功能缺失 |
| P0 | music-cover 翻唱 | 高价值功能 |
| P1 | seed 参数 | 生成控制 |
| P1 | AI 歌词优化范围修正 | 一行修复 |
| P2 | 高级设置面板 | UX 灵活性 |
| P2 | 字符计数器 | UX 改进 |

---

## 参考文档

- MiniMax 音乐生成 API 官方文档
- 官方 MiniMax 音乐调试台 UI (webfetch 分析)
- 当前实现: `src/pages/MusicGeneration.tsx`, `server/routes/music.ts`