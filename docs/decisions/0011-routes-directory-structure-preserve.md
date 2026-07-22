# ADR-0011：routes/ 目录结构保留现状

## 状态

已接受

---

## 背景

ADR-0007 review 阶段把「routes/ 目录结构混乱（25 平铺 + 7 子目录）」列为 P2 改进项。本 ADR 在深入评估后**决定不进行结构整理**，并显式记录理由。

### 现状

```
server/routes/
├── __tests__/        # 测试
├── admin/            # 管理类路由（4 个）
├── cron/             # cron 子目录（含 cron.ts 39B 占位转发）
├── external-proxy/   # 外部代理（含 external-proxy.ts 9.6K 占位转发）
├── media/            # 媒体子目录
├── settings/         # 设置子目录
├── text/             # 文本子目录（ADR-0006 拆出）
└── *.ts × 27         # 平铺路由
```

平铺文件中可识别的分组：
- **AI 路由（8 个）**：text、voice、image、music、lyrics、video、videoAgent、voiceMgmt
- **资源路由（10+ 个）**：audit、auth、capacity、files、materials、prompts、stats、templates、usage、users、workflows 等
- **管理类**：invitation-codes、system-config、external-api-logs、export

---

## 决策

**不进行 routes/ 目录结构整理，保留现状。**

### 理由

1. **代码本身无架构问题**：routes/ 文件之间无循环依赖、无重复代码、无类型安全问题。问题是「审美不一致」而非「架构缺陷」。

2. **改动风险高于收益**：
   - 27 个 .ts 文件移动需要改 `bootstrap/api-routes.ts` 全部 import 路径（37 行 import + 30+ 行 mount）
   - 改 `__tests__/` 中相关测试的 mock 路径（routes 测试大量存在）
   - 任何 import 路径错误都会导致编译失败或运行时找不到模块
   - 收益仅是「目录看起来更整齐」，用户不可见，无运行时改进

3. **既有子目录化是非系统性的**：admin/cron/external-proxy/media/settings/text 各有原因（业务复杂度、模块拆分历史），不是统一的目录化策略。强行统一反而可能引入新不一致。

4. **AGENTS.md 路径规范未禁止平铺**：AGENTS.md §3 命名规范只规定「路由用复数名词」「kebab-case」，未要求子目录化。

### 否决的替代方案

1. ❌ **AI 路由归到 `routes/ai/` 子目录**：改 8 个 import + 测试路径，收益是「8 个文件归类」，但其他 19 个文件仍平铺，反而增加不一致
2. ❌ **全部子目录化（按 ai/resources/admin/system 分组）**：改 27 个 import + 全部测试，大改动，风险最高，收益最低
3. ❌ **清理 cron.ts 等 39B 占位文件，直接 import 子目录**：会改 `api-routes.ts` 的 import 路径，且这些占位文件存在是为了向后兼容（其他模块可能 import `routes/cron.js`），删除前需广泛检查引用

---

## 后果

### 正面影响

- 避免无收益的大规模文件移动
- 避免改 import 路径引入的回归风险
- 保持 git history 干净（不破坏 git blame 追溯）
- 节省 review 时间投入到真正有价值的改进

### 负面影响

- routes/ 目录继续「平铺 + 子目录」混合，新人入门时需要花时间理解
- 后续新增路由时，没有明确的「应该放平铺还是子目录」规则（隐式规则：超过 200 行或有多 helper 时拆子目录）

### 风险

- **低**：本决策是「不做」，没有改动就没有风险
- **低**：若后续 routes/ 平铺文件继续增长（如超过 40 个），可能需要重新评估。当前 27 个尚在可控范围

---

## 元数据

| 字段 | 值 |
|------|-----|
| 日期 | 2026-07-23 |
| 状态 | 已接受 |
| 决策者 | Sisyphus（自主决策） |
| 审阅者 | 待 review |
| 关联 | ADR-0007 review P2（routes/ 结构）|
