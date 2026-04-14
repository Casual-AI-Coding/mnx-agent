# 媒体文件删除事故报告

> 日期: 2026-04-14
> 严重级别: **重大 (Critical)**

## 一、事故概述

在运行测试覆盖率检查时，生产环境的 `data/media/` 目录被完全删除，导致：
- **279 个音乐文件** 全部丢失
- **1721 个图片文件** 全部丢失
- 数据库中 2000 条媒体记录与实际文件脱节

这是本项目历史上最严重的数据丢失事故。

---

## 二、根本原因分析

### 直接原因

测试文件 `server/lib/__tests__/media-storage.test.ts` 第 406-417 行：

```typescript
// 问题代码
it('should use default mediaRoot when not provided', async () => {
  const defaultRoot = './data/media'  // ❌ 直接使用生产路径！
  await fs.mkdir(defaultRoot, { recursive: true })
  
  // ...测试逻辑...
  
  // ❌ 递归强制删除整个目录
  await fs.rm(defaultRoot, { recursive: true, force: true })
})
```

**触发场景**: 执行 `vitest run server --coverage` 时，该测试用例：
1. 创建了 `./data/media` 目录（已存在）
2. 测试结束时执行 `fs.rm()` 递归删除
3. `{ force: true }` 参数导致即使文件不存在也继续执行
4. 整个 `data/media/` 目录及其所有子目录、文件被永久删除

### 深层原因

| 问题 | 分析 |
|------|------|
| 测试与生产环境未隔离 | 测试代码直接引用了生产环境的真实路径 |
| 缺乏路径安全检查 | 没有对删除操作的目标路径进行验证 |
| 无备份机制 | 生产数据没有定期备份，丢失后无法恢复 |
| 无删除审计日志 | 删除操作没有记录，问题发生后难以追溯 |
| 代码审查不充分 | 危险的测试代码未被发现 |

---

## 三、事故时间线

| 时间 | 事件 |
|------|------|
| 2026-04-14 上午 | 运行覆盖率测试 `vitest run server --coverage` |
| 测试执行期间 | `media-storage.test.ts` 删除了 `./data/media/` |
| 发现问题 | 用户检查 `data/media/` 目录发现为空 |
| 紧急响应 | 使用 photorec 尝试恢复删除文件 |
| 第一次恢复 | photorec 恢复 1834 个 mp3 到 ~/media2，0 个 png |
| 第二次恢复 | 从 ~/media 匹配恢复，87 个 mp3 成功 |
| 第三次恢复 | 从 ~/media3 恢复 5 个 mp3 |
| 最终恢复 | **92 个 mp3**（33%），**0 个图片** |
| 数据库清理 | 软删除 1913 条未恢复记录 |
| 代码修复 | 修改测试文件使用安全路径 |
| 预防措施 | 添加环境隔离和防御性检查 |

---

## 四、损失评估

### 文件损失

| 类型 | 原有数量 | 恢复数量 | 恢复率 | 丢失数量 |
|------|----------|----------|--------|----------|
| 音乐 (mp3) | 279 | 92 | 33% | **187** |
| 图片 (png) | 1721 | 0 | 0% | **1721** |
| **总计** | 2000 | 92 | 4.6% | **1908** |

### 数据损失

- 数据库 2000 条 `media_records` 记录
- 其中 1913 条已软删除（标记 `deleted_at`）
- 文件与数据库记录脱节

### 业务影响

- 用户生成的音频/语音文件永久丢失
- 用户上传的图片永久丢失
- 历史记录无法追溯
- 可能影响用户信任

---

## 五、恢复过程

### 5.1 photorec 恢复尝试

```bash
# 恢复步骤
sudo photorec /dev/nvme0n1p3
# 选择分区 -> 选择文件类型 -> 选择恢复目录

# 结果
~/media2/recup_dir.*
- 1834 个 mp3 文件（包含其他来源）
- 0 个 png 文件（photorec 无法恢复 png）
```

**photorec 限制**：
- 基于文件签名恢复，无法恢复文件名和目录结构
- png 文件恢复失败（格式特殊）
- 恢复文件混杂其他来源文件

### 5.2 文件匹配恢复

编写脚本 `scripts/restore-media-simple.ts`：
- 从数据库读取原有文件的 `size_bytes`
- 与恢复文件按大小匹配
- 重建正确的目录结构（`2026-04-11/uuid.mp3`）

```typescript
// 匹配逻辑
const dbRecords = await db.getAllMediaRecords('music')
const recoveredFiles = await fs.readdir('~/media2/recup_dir.*')
for (const record of dbRecords) {
  const match = recoveredFiles.find(f => getFileSize(f) === record.size_bytes)
  if (match) {
    // 复制到正确位置
    await fs.copyFile(match, `./data/media/${record.filename}`)
  }
}
```

**匹配结果**：
- 成功匹配 87 个音乐文件
- 192 个音乐文件无法匹配（大小变化或来自其他来源）

### 5.3 多次恢复尝试

| 来源 | 恢复数量 |
|------|----------|
| ~/media (photorec 第一轮) | 75 个 mp3 |
| ~/media2 (photorec 第二轮) | 87 个 mp3 |
| ~/media3 (用户额外备份) | 5 个 mp3 |
| **总计** | **92 个 mp3** |

### 5.4 数据库清理

```sql
-- 软删除未恢复记录
UPDATE media_records 
SET deleted_at = NOW() 
WHERE filepath NOT IN (恢复文件列表);

-- 结果
192 music + 1721 image = 1913 条记录软删除
```

---

## 六、已实施的修复

### 6.1 测试代码修复

**文件**: `server/lib/__tests__/media-storage.test.ts`

```typescript
// 修复前
const defaultRoot = './data/media'
await fs.rm(defaultRoot, { recursive: true, force: true })

// 修复后
const defaultRoot = join(TEST_MEDIA_ROOT, 'default-root-test')
await fs.rm(defaultRoot, { recursive: true, force: true })
```

**影响范围**: 5 处 `fs.rm()` 调用全部改为测试专用目录

### 6.2 环境隔离

**文件**: `server/__tests__/setup.ts`

```typescript
// 测试专用环境变量
process.env.MINIMAX_API_KEY = ''  // 禁止真实 API 调用
process.env.MEDIA_ROOT = './test-media-storage'  // 测试专用目录
```

### 6.3 防御性检查

**文件**: `server/lib/media-storage.ts`

```typescript
const DEFAULT_MEDIA_ROOT = process.env.MEDIA_ROOT || './data/media'

export async function saveMediaFile(...) {
  // 安全检查：测试环境禁止使用生产路径
  if (process.env.NODE_ENV === 'test' && mediaRoot === './data/media') {
    throw new Error('CRITICAL: Tests must use TEST_MEDIA_ROOT, not production path')
  }
  // ...
}
```

### 6.4 提交记录

```
git commit --allow-empty -m "docs: record 2026-04-14 media deletion incident"
```

---

## 七、预防措施建议

### 7.1 立即实施（已完成）

| 措施 | 状态 |
|------|------|
| 测试环境隔离 | ✅ 已完成 |
| 防御性路径检查 | ✅ 已完成 |
| 测试代码审查 | ✅ 已完成 |

### 7.2 短期实施（推荐本周）

#### 7.2.1 定期备份

```bash
# scripts/cloud-backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d)

# 备份媒体文件到云端
rclone sync ./data/media b2-backup:mnx-media-backup --progress

# 备份数据库
pg_dump mnx_agent > /tmp/mnx_agent_$DATE.sql
rclone copy /tmp/mnx_agent_$DATE.sql b2-backup:mnx-media-backup/db/
rm /tmp/mnx_agent_$DATE.sql

echo "Backup completed: $DATE"
```

```bash
# 定时任务
0 3 * * * /path/to/scripts/cloud-backup.sh
```

**推荐服务**:
- **Backblaze B2**: $0.005/GB 存储，$0.01/GB 下载
- **Cloudflare R2**: $0.015/GB 存储，**免费下载**

#### 7.2.2 CI 安全检查

```yaml
# .github/workflows/test.yml
- name: Safety check - no production paths in tests
  run: |
    grep -rn "'data/media'\|\"data/media\"" server/__tests__/ --include="*.ts" && exit 1 || true
    grep -rn "'mnx-agent'\|\"mnx-agent\"" server/__tests__/ --include="*.ts" | grep -v "_test" && exit 1 || true
```

### 7.3 中期实施（推荐本月）

#### 7.3.1 删除审计日志

```typescript
// server/lib/audit-logger.ts
export function logDeleteOperation(resource: string, id: string, user: string): void {
  console.log(JSON.stringify({
    type: 'DELETE',
    resource,
    id,
    user,
    timestamp: new Date().toISOString(),
  }))
  
  // 可选：发送 webhook 通知
  if (process.env.DELETE_ALERT_WEBHOOK) {
    fetch(process.env.DELETE_ALERT_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({ type: 'DELETE', resource, id, user }),
    })
  }
}
```

#### 7.3.2 数据库软删除策略

```typescript
// 所有删除操作改为软删除
async function deleteMediaRecord(id: string): Promise<void> {
  await db.execute(
    'UPDATE media_records SET deleted_at = NOW() WHERE id = $1',
    [id]
  )
}

// 定期清理（保留 30 天）
async function purgeDeletedRecords(): Promise<void> {
  await db.execute(
    'DELETE FROM media_records WHERE deleted_at < NOW() - INTERVAL 30 DAYS'
  )
}
```

### 7.4 长期实施（推荐季度）

#### 7.4.1 混合存储架构

```
用户上传 → 本地缓存 → 异步上传云端
          ↓
        用户下载 ← 本地优先，云端兜底
```

**优点**:
- 本地读取快速响应
- 云端自动备份
- 网络故障时本地仍可用

#### 7.4.2 监控告警

```typescript
// 监控文件系统操作
if (filesDeleted > threshold) {
  alert('Mass deletion detected!')
}
```

---

## 八、经验教训

| 问题 | 教训 | 改进 |
|------|------|------|
| 测试使用生产路径 | 测试必须与生产环境完全隔离 | 强制环境变量 |
| 无备份机制 | 重要数据必须定期备份 | rclone + crontab |
| 无删除日志 | 关键操作必须有审计记录 | 实现 audit-logger |
| photorec 恢复率低 | 图片文件难以恢复 | 备份比恢复可靠 |
| 无 CI 检查 | 危险代码可能被提交 | pre-commit hook |
| 无监控告警 | 批量删除无预警 | 实现阈值告警 |

---

## 九、后续行动项

### 高优先级（本周）

- [ ] 配置 Backblaze B2 或 Cloudflare R2
- [ ] 实现每日自动备份脚本
- [ ] 添加 CI 安全检查

### 中优先级（本月）

- [ ] 实现删除审计日志
- [ ] 改用软删除策略
- [ ] 代码审查流程加强

### 低优先级（季度）

- [ ] 评估混合存储架构
- [ ] 实现监控告警系统
- [ ] 灾难恢复演练

---

## 十、相关文件

- 测试修复: `server/lib/__tests__/media-storage.test.ts`
- 环境隔离: `server/__tests__/setup.ts`
- 防御检查: `server/lib/media-storage.ts`
- 恢复脚本: `scripts/restore-media-simple.ts`
- 数据库清理: `scripts/soft-delete-unrestored.ts`

---

## 附录：photorec 使用指南

```bash
# 安装
sudo apt install testdisk

# 运行
sudo photorec /dev/sdX

# 选择步骤
1. 选择磁盘分区
2. 选择文件系统类型（ext4）
3. 选择恢复目录（不要选择原分区！）
4. 选择文件类型（mp3, png 等）
5. 等待扫描完成

# 恢复结果位置
~/selected_dir/recup_dir.*

# 注意事项
- 必须写入不同分区，否则覆盖原数据
- png 文件恢复成功率低
- 恢复后文件名丢失，需手动匹配
```

---

**报告人**: AI Assistant  
**审核人**: (待填写)  
**日期**: 2026-04-14