# 后台用户密码重置边界 - 设计规格

> 目标：将 `POST /api/users/:id/reset-password` 从 Route 直连数据库收敛为 Route → Service → Repository 分层。

## 背景

`server/routes/users.ts` 的 GET / PATCH / DELETE / POST(创建) 已完成边界迁移。剩余两个端点中，`POST /:id/reset-password` 是最后单个操作的低风险目标。

## 架构

```
Route (validate → delegate)
  → AdminUserService.resetPassword(id)
    → AdminUserRepository.exists(id)  // SELECT id FROM users WHERE id = $1
    → 404 if not found
    → generateRandomPassword(20)  // 内联工具函数，移入 service
    → bcrypt.hash(newPassword, 12)
    → AdminUserRepository.updatePassword(id, passwordHash, toLocalISODateString())
      → UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3
    → return true
  → successResponse(res, { message: '密码已重置' })
```

## 行为契约

1. **用户不存在**：返回 HTTP 404 `{error: '用户不存在'}`，不触碰 bcrypt 或 UPDATE
2. **成功重置**：HTTP 200 `{success: true, data: { message: '密码已重置' }}`
3. **密码长度**：保持 20（`generateRandomPassword` 从 routes/users.ts 移入 service，签名不变）
4. **bcrypt rounds**：保持 12
5. **时间戳**：`toLocalISODateString()`，无 `Z` 后缀
6. **不返回新密码**：响应仅含 message，不泄露密码

## 非范围

- POST `/batch`（批量 activate/deactivate/delete）—— 不迁移
- 不新增 DI token（AdminUserService 已注册）
- 不改变 `generateRandomPassword` 算法
- 不改变 bcrypt 版本或 rounds
- 不改变 `requireRole(['super'])`
- 不修改 `UserService` 或现有 `UserRepository`

## Repository 接口扩展

```typescript
// AdminUserRepository 新增方法
async exists(id: string): Promise<boolean>
  // SELECT id FROM users WHERE id = $1 → rows.length > 0

async updatePassword(id: string, passwordHash: string, now: string): Promise<boolean>
  // UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3 → result.changes > 0
```

## Service 接口扩展

```typescript
// AdminUserService 新增方法
async resetPassword(id: string): Promise<boolean>
  // exists(id) → 404 → generateRandomPassword() → bcrypt → updatePassword()
```

## Route 变更

从 19 行直连 SELECT + generate + bcrypt + UPDATE 变为：

```typescript
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const { id } = req.params
  const adminUserService = getAdminUserService()
  const reset = await adminUserService.resetPassword(id)
  if (!reset) {
    errorResponse(res, '用户不存在', 404)
    return
  }
  successResponse(res, { message: '密码已重置' })
}))
```

可从 routes/users.ts 删除 `generateRandomPassword` 函数和 `crypto`/`bcrypt` import（如果其他端点不再使用它们——但 POST 创建已迁移，reset-password 是 bcrypt 的最后消费方）。迁移后 `bcrypt` 和 `crypto` 可从 routes/users.ts 完全移除。

## 测试策略

| 层 | 测试类型 | 验证要点 |
|----|----------|----------|
| Repository | 单元（窄端口 fake） | exists 返回 boolean、updatePassword SQL 参数顺序 |
| Service | 单元（fake repository） | 存在性检查 → bcrypt hash 格式验证 → delegate |
| Route | 行为测试（mock service） | HTTP 200/404、不调 getConnection |
| Route DI 契约 | 文本断言 | resetPassword 委托、无 bcrypt/crypto import、无 UPDATE SQL |
