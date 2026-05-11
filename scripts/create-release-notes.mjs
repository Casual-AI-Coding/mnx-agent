#!/usr/bin/env node

/**
 * create-release-notes.mjs — 将 CHANGELOG.md 内容转化为 GitHub Release Note 并发布
 *
 * 用法:
 *   node scripts/create-release-notes.mjs [--dry-run] [--tag=vX.Y.Z] [--repo=owner/repo]
 *
 * 选项:
 *   --dry-run      仅打印 Release Note 内容，不实际创建
 *   --tag=vX.Y.Z   只处理指定 tag（不指定则处理所有版本）
 *   --repo=owner/repo  指定 GitHub 仓库（默认从 git remote 读取）
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

// ═══════════════════════════════════════════
// 配置
// ═══════════════════════════════════════════

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tagFilter = args.find(a => a.startsWith('--tag='))?.split('=')[1] || null;
const repoArg = args.find(a => a.startsWith('--repo='))?.split('=')[1];
const REPO = repoArg || 'Casual-AI-Coding/mnx-agent';
const TEMP_DIR = '/tmp/mnx-release-notes';

// ═══════════════════════════════════════════
// 分类映射：CHANGELOG 分类 → Release Note emoji 标题
// ═══════════════════════════════════════════

const CATEGORY_MAP = {
  // 精确匹配（emoji 版本）
  '✨ Added':             { emoji: '✨', title: '新增功能' },
  '🐛 Fixed':             { emoji: '🐛', title: '问题修复' },
  '🔒 Security':          { emoji: '🔒', title: '安全加固' },
  '⚡ Performance':       { emoji: '⚡', title: '性能优化' },
  '🔄 Changed':           { emoji: '🔄', title: '功能变更' },
  '📝 Docs':              { emoji: '📝', title: '文档更新' },
  '🧪 Tests':             { emoji: '🧪', title: '测试完善' },
  '🔧 Chore':             { emoji: '🔧', title: '构建/工具' },
  '🏗️ Refactoring':       { emoji: '🏗️', title: '代码重构' },
  '⚠️ Breaking':          { emoji: '⚠️', title: '破坏性变更' },
  '🗑️ Deprecated':        { emoji: '🗑️', title: '废弃功能' },
  '❌ Removed':           { emoji: '❌', title: '移除功能' },
  // 英文匹配（无 emoji 版本）
  'Added':                { emoji: '✨', title: '新增功能' },
  'Fixed':                { emoji: '🐛', title: '问题修复' },
  'Security':             { emoji: '🔒', title: '安全加固' },
  'Performance':          { emoji: '⚡', title: '性能优化' },
  'Changed':              { emoji: '🔄', title: '功能变更' },
  'Docs':                 { emoji: '📝', title: '文档更新' },
  'Tests':                { emoji: '🧪', title: '测试完善' },
  'Chore':                { emoji: '🔧', title: '构建/工具' },
  'Refactoring':          { emoji: '🏗️', title: '代码重构' },
  'Dependencies':         { emoji: '🔧', title: '构建/工具' },
  'Breaking':             { emoji: '⚠️', title: '破坏性变更' },
  'Deprecated':           { emoji: '🗑️', title: '废弃功能' },
  'Removed':              { emoji: '❌', title: '移除功能' },
  'BREAKING':             { emoji: '⚠️', title: '破坏性变更' },
  // 中文匹配
  '新增功能':              { emoji: '✨', title: '新增功能' },
  '问题修复':              { emoji: '🐛', title: '问题修复' },
  '安全加固':              { emoji: '🔒', title: '安全加固' },
  '性能优化':              { emoji: '⚡', title: '性能优化' },
  '功能变更':              { emoji: '🔄', title: '功能变更' },
  '文档更新':              { emoji: '📝', title: '文档更新' },
  '测试完善':              { emoji: '🧪', title: '测试完善' },
  '构建工具':              { emoji: '🔧', title: '构建/工具' },
  '代码重构':              { emoji: '🏗️', title: '代码重构' },
  '破坏性变更':            { emoji: '⚠️', title: '破坏性变更' },
};

// 特殊分类：不展示为独立 section，而是合并到 footer 或特殊处理
const SPECIAL_CATEGORIES = new Set([
  'Backward Compatibility',
  'Technical',
  'SISE',
]);

const CATEGORY_ORDER = [
  '⚠️', '✨', '🐛', '🔒', '⚡', '🔄', '🗑️', '❌', '🏗️', '📝', '🧪', '🔧',
];

// ═══════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════

function getCategoryConfig(rawName) {
  // 先去除 emoji 前缀再匹配
  const cleanName = rawName.replace(/^[^\w\u4e00-\u9fff]+/, '').trim();
  const direct = CATEGORY_MAP[rawName.trim()] || CATEGORY_MAP[cleanName];
  if (direct) return direct;

  // 尝试部分匹配
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return val;
    }
  }
  return null;
}

function sortCategories(entries) {
  return entries.sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a.emoji);
    const bIdx = CATEGORY_ORDER.indexOf(b.emoji);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
}

function getGitLog(prevTag, tag) {
  try {
    const range = prevTag ? `${prevTag}..${tag}` : tag;
    const cmd = `git log --oneline ${range} --no-merges`;
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return output.trim().split('\n').filter(Boolean).map(line => {
      // Remove commit hash
      return line.replace(/^[a-f0-9]+\s+/, '');
    });
  } catch {
    return [];
  }
}

function classifyCommitMessage(msg) {
  // Map conventional commit prefixes to categories
  const map = {
    'feat': '✨ 新增功能',
    'fix': '🐛 问题修复',
    'security': '🔒 安全加固',
    'perf': '⚡ 性能优化',
    'refactor': '🏗️ 代码重构',
    'docs': '📝 文档更新',
    'test': '🧪 测试完善',
    'chore': '🔧 构建/工具',
    'ci': '🔧 构建/工具',
    'build': '🔧 构建/工具',
    'revert': '🔄 功能变更',
    'style': '🏗️ 代码重构',
    'BREAKING CHANGE': '⚠️ 破坏性变更',
  };

  const lower = msg.toLowerCase();
  for (const [prefix, category] of Object.entries(map)) {
    if (lower.startsWith(prefix + ':') || lower.startsWith(prefix + '(')) {
      return category;
    }
  }
  return '🔄 功能变更';
}

function generateReleaseNoteFromGitLog(tag, prevTag) {
  const commits = getGitLog(prevTag, tag);
  if (commits.length === 0) {
    return `此版本无详细变更记录。

---

**项目仓库**: [Casual-AI-Coding/mnx-agent](https://github.com/Casual-AI-Coding/mnx-agent)
`;
  }

  const categorized = {};
  for (const commit of commits) {
    // Skip release commits
    if (commit.startsWith('chore: release')) continue;

    const cat = classifyCommitMessage(commit);
    if (!categorized[cat]) categorized[cat] = [];
    // Clean up commit message
    const cleaned = commit
      .replace(/^(feat|fix|security|perf|refactor|docs|test|chore|ci|build|revert|style)(\([^)]*\))?:\s*/i, '')
      .replace(/^BREAKING CHANGE:\s*/i, '');
    categorized[cat].push(cleaned);
  }

  let note = `此版本包含 ${commits.filter(c => !c.startsWith('chore: release')).length} 项变更。

`;

  const sections = [];
  for (const [cat, items] of Object.entries(categorized)) {
    const emoji = cat.split(' ')[0];
    const title = cat.split(' ').slice(1).join(' ');
    sections.push({ emoji, title, items });
  }

  for (const sec of sortCategories(sections)) {
    note += `## ${sec.emoji} ${sec.title}\n\n`;
    for (const item of sec.items) {
      note += `- ${item}\n`;
    }
    note += '\n';
  }

  note += `---

**完整变更日志**: [CHANGELOG.md](https://github.com/Casual-AI-Coding/mnx-agent/blob/main/CHANGELOG.md)
`;
  return note;
}

// ═══════════════════════════════════════════
// CHANGELOG 解析
// ═══════════════════════════════════════════

function parseChangelog() {
  const content = readFileSync(CHANGELOG_PATH, 'utf-8');
  const versionRegex = /^## \[([^\]]+)\](?: - (.+))?$/gm;
  const categoryRegex = /^### (.+)$/gm;

  const versions = [];
  let match;

  // Find all version sections
  const allStarts = [];
  while ((match = versionRegex.exec(content)) !== null) {
    allStarts.push({
      version: match[1],
      date: (match[2] || '').trim(),
      pos: match.index,
      headerEnd: match.index + match[0].length,
    });
  }

  for (let i = 0; i < allStarts.length; i++) {
    const { version, date, headerEnd } = allStarts[i];
    const nextPos = i + 1 < allStarts.length ? allStarts[i + 1].pos : content.length;
    const sectionText = content.slice(headerEnd, nextPos).trim();

    // Parse categories
    const categories = [];
    const catMatches = [...sectionText.matchAll(/^### (.+)$/gm)];

    for (let j = 0; j < catMatches.length; j++) {
      const catName = catMatches[j][1].trim();
      const catStart = catMatches[j].index + catMatches[j][0].length;
      const catEnd = j + 1 < catMatches.length ? catMatches[j + 1].index : sectionText.length;
      const catContent = sectionText.slice(catStart, catEnd).trim();

      if (SPECIAL_CATEGORIES.has(catName)) {
        // Handle backward compatibility specially
        if (catName === 'Backward Compatibility') {
          categories.push({ emoji: '✅', title: '向后兼容', items: catContent.split('\n').filter(l => l.trim().startsWith('-')) });
        }
        continue;
      }

      const config = getCategoryConfig(catName);
      if (config) {
        // Parse items handling nested bullets (indented sub-items)
        const lines = catContent.split('\n');
        const items = [];
        let currentItem = '';

        for (const line of lines) {
          // Top-level list item (no leading whitespace, starts with - or *)
          if (/^[-*]\s/.test(line)) {
            if (currentItem) {
              items.push(currentItem.trim());
            }
            currentItem = line.replace(/^[-*]\s*/, '').trim();
          }
          // Indented sub-item (has leading whitespace + -)
          else if (/^\s+[-*]\s/.test(line)) {
            currentItem += ' ' + line.trim().replace(/^[-*]\s*/, '');
          }
          // Continuation line (no bullet, but has content under a parent)
          else if (currentItem && line.trim() && !line.startsWith('#')) {
            currentItem += ' ' + line.trim();
          }
        }
        if (currentItem) {
          items.push(currentItem.trim());
        }

        if (items.length > 0) {
          // Merge duplicate categories (same emoji) within the same version
          const existing = categories.find(c => c.emoji === config.emoji);
          if (existing) {
            existing.items.push(...items);
          } else {
            categories.push({ emoji: config.emoji, title: config.title, items });
          }
        }
      }
    }

    versions.push({ version, date, categories });
  }

  return versions;
}

function formatReleaseNote(version, date, categories) {
  let note = '';

  // 发布日期（无冗余标题 — GitHub Release 标题已由 --title 提供）
  if (date) {
    note += `> 📅 发布于 ${date}\n\n`;
  }
  note += '---\n\n';

  // Sort categories
  const sorted = sortCategories(categories.filter(c => c.emoji !== '✅'));

  // Breaking changes first
  const breaking = sorted.filter(c => c.emoji === '⚠️');
  const regular = sorted.filter(c => c.emoji !== '⚠️');
  const compat = categories.filter(c => c.emoji === '✅');

  for (const cat of breaking) {
    note += `## ${cat.emoji} ${cat.title}\n\n`;
    for (const item of cat.items) {
      note += `- ${item}\n`;
    }
    note += '\n';
  }

  // Regular categories
  for (const cat of regular) {
    note += `## ${cat.emoji} ${cat.title}\n\n`;
    for (const item of cat.items) {
      note += `- ${item}\n`;
    }
    note += '\n';
  }

  // Backward compatibility
  for (const cat of compat) {
    note += `## ${cat.emoji} ${cat.title}\n\n`;
    for (const item of cat.items) {
      note += item.replace(/^-/, '').trim() + '\n';
    }
    note += '\n';
  }

  note += `---

**完整变更日志**: [CHANGELOG.md](https://github.com/Casual-AI-Coding/mnx-agent/blob/main/CHANGELOG.md)
`;

  return note;
}

// ═══════════════════════════════════════════
// GitHub Release 创建
// ═══════════════════════════════════════════

function releaseExists(tag) {
  try {
    execSync(`gh release view v${tag} --repo ${REPO}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function createRelease(tag, note, dryRun) {
  const tempFile = `/tmp/mnx-release-note-${tag}.md`;
  writeFileSync(tempFile, note, 'utf-8');

  if (dryRun) {
    console.log(`\n=== DRY RUN: v${tag} ===`);
    console.log(note);
    console.log(`=== END DRY RUN: v${tag} ===\n`);
    return;
  }

  try {
    if (releaseExists(tag)) {
      const cmd = `gh release edit v${tag} --notes-file "${tempFile}" --repo ${REPO}`;
      console.log(`  Updating release for v${tag}...`);
      execSync(cmd, { stdio: 'pipe' });
      console.log(`  ✅ v${tag} updated successfully`);
    } else {
      const cmd = `gh release create v${tag} --title "v${tag}" --notes-file "${tempFile}" --repo ${REPO}`;
      console.log(`  Creating release for v${tag}...`);
      execSync(cmd, { stdio: 'pipe' });
      console.log(`  ✅ v${tag} created successfully`);
    }
  } catch (err) {
    console.error(`  ❌ Failed to process release for v${tag}: ${err.stderr?.toString() || err.message}`);
  }
}

// ═══════════════════════════════════════════
// 主流程
// ═══════════════════════════════════════════

function getGitTags() {
  const output = execSync('git tag --sort=creatordate', { cwd: ROOT, encoding: 'utf-8' });
  return output.trim().split('\n').filter(Boolean).map(t => t.replace(/^v/, ''));
}

function getPrevTag(tag, allTags) {
  const idx = allTags.indexOf(tag);
  return idx > 0 ? allTags[idx - 1] : null;
}

async function main() {
  console.log('📋 解析 CHANGELOG.md...');
  const changelog = parseChangelog();
  const changelogMap = new Map();
  for (const entry of changelog) {
    changelogMap.set(entry.version, entry);
  }

  const allTags = getGitTags();
  console.log(`📦 共 ${allTags.length} 个 tag`);

  const toProcess = tagFilter ? allTags.filter(t => t === tagFilter) : allTags;
  if (tagFilter && toProcess.length === 0) {
    console.error(`❌ 未找到 tag: ${tagFilter}`);
    process.exit(1);
  }

  console.log(`▶️  待处理: ${toProcess.length} 个版本${isDryRun ? ' (DRY RUN)' : ''}\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const tag of toProcess) {
    const tagName = `v${tag}`;

    let note;
    const changelogEntry = changelogMap.get(tag);

    if (changelogEntry) {
      note = formatReleaseNote(tag, changelogEntry.date, changelogEntry.categories);
    } else {
      // Generate from git log
      console.log(`  📝 v${tag} — 无 CHANGELOG 条目，从 git log 生成`);
      const prevTag = getPrevTag(tag, allTags);
      note = generateReleaseNoteFromGitLog(`v${tag}`, prevTag ? `v${prevTag}` : null);
    }

    createRelease(tag, note, isDryRun);
    updated++;
  }

  console.log(`\n📊 统计: 处理 ${updated}, 失败 ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
