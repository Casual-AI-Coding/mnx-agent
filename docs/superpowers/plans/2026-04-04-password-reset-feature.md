# Password Reset Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password reset functionality for administrators to reset user passwords from the User Management page.

**Architecture:** 
- Backend: Add POST endpoint to `/api/users/:id/reset-password` that generates a 12-character random password and updates the user's password hash using bcrypt
- Frontend: Add "Reset Password" button next to edit button in user table, with a confirmation dialog and a result dialog showing the new password with copy functionality

**Tech Stack:** 
- Backend: Express, bcrypt, TypeScript
- Frontend: React, Tailwind CSS, Framer Motion, Lucide React

---

## File Structure

| File | Purpose |
|------|---------|
| `server/routes/users.ts` | Add POST `/api/users/:id/reset-password` route |
| `src/pages/UserManagement.tsx` | Add reset password button and dialog |

---

## Task 1: Backend - Add Reset Password Route

**Files:**
- Modify: `server/routes/users.ts:104-106`

### Step 1: Add password generation utility

```typescript
// Add after the imports, before router definition
function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  const all = uppercase + lowercase + numbers + special
  
  // Ensure at least one of each type
  let password = ''
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}
```

### Step 2: Add the reset-password route

```typescript
// Add before "export default router"
router.post('/:id/reset-password', asyncHandler(async (req, res) => {
  const { id } = req.params
  const conn = getConnection()

  // Check if user exists
  const user = await conn.query('SELECT id, username FROM users WHERE id = $1', [id])
  if (user.length === 0) {
    res.status(404).json({ success: false, error: '用户不存在' })
    return
  }

  // Generate new password
  const newPassword = generateRandomPassword(12)
  const passwordHash = await bcrypt.hash(newPassword, 12)

  // Update password
  await conn.execute(
    'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3',
    [passwordHash, new Date().toISOString(), id]
  )

  res.json({
    success: true,
    data: {
      newPassword,
      message: '密码已重置'
    }
  })
}))
```

### Step 3: Commit changes

```bash
git add server/routes/users.ts
git commit -m "feat(users): add POST /api/users/:id/reset-password route"
```

---

## Task 2: Frontend - Add Reset Password Button

**Files:**
- Modify: `src/pages/UserManagement.tsx`

### Step 1: Add Key icon import

```typescript
// Add to lucide-react imports (around line 25)
import {
  // ... existing imports
  Key,  // Add this
} from 'lucide-react'
```

### Step 2: Add state for reset password dialog

```typescript
// Add to useState declarations (around line 154)
const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
const [resetPasswordConfirmOpen, setResetPasswordConfirmOpen] = useState(false)
const [newPassword, setNewPassword] = useState('')
```

### Step 3: Add reset password handler function

```typescript
// Add after handleDelete function (around line 350)
const handleResetPassword = async () => {
  if (!selectedUser) return
  setActionLoading(true)
  try {
    const data = await apiClient.post<{ success: boolean; data?: { newPassword: string; message: string }; error?: string }>(`/users/${selectedUser.id}/reset-password`)
    if (data.success && data.data?.newPassword) {
      setNewPassword(data.data.newPassword)
      setResetPasswordConfirmOpen(false)
      setResetPasswordDialogOpen(true)
    } else {
      alert(data.error || '重置密码失败')
    }
  } catch {
    alert('网络错误，请稍后重试')
  } finally {
    setActionLoading(false)
  }
}

const openResetPasswordConfirm = (user: User) => {
  setSelectedUser(user)
  setResetPasswordConfirmOpen(true)
}
```

### Step 4: Add reset password button in the actions column

```tsx
// In the actions column (around line 703-722), add after the edit button:
<motion.button
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  onClick={() => openResetPasswordConfirm(user)}
  className="p-2 rounded-lg text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
  title="重置密码"
>
  <Key className="w-4 h-4" />
</motion.button>
```

### Step 5: Commit changes

```bash
git add src/pages/UserManagement.tsx
git commit -m "feat(users): add reset password button in user table"
```

---

## Task 3: Frontend - Add Password Display Dialog

**Files:**
- Modify: `src/pages/UserManagement.tsx`

### Step 1: Add Copy icon import

```typescript
// Add to lucide-react imports
import {
  // ... existing imports
  Copy,  // Add this
  Check, // Add this
} from 'lucide-react'
```

### Step 2: Add copy state

```typescript
// Add to useState declarations
const [copied, setCopied] = useState(false)
```

### Step 3: Add copy handler function

```typescript
// Add after handleResetPassword function
const handleCopyPassword = async () => {
  try {
    await navigator.clipboard.writeText(newPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  } catch {
    // Fallback: select text for manual copy
    const input = document.getElementById('new-password-field') as HTMLInputElement
    if (input) {
      input.select()
    }
  }
}
```

### Step 4: Add confirmation dialog

```tsx
// Add before the closing </div> of the component, after the delete ConfirmDialog:
<ConfirmDialog
  open={resetPasswordConfirmOpen}
  onClose={() => setResetPasswordConfirmOpen(false)}
  onConfirm={handleResetPassword}
  title="重置密码"
  description={`确定要重置用户 ${selectedUser?.username} 的密码吗？重置后将生成新密码。`}
  confirmText="确认重置"
  cancelText="取消"
  variant="default"
  loading={actionLoading}
/>
```

### Step 5: Add password display dialog

```tsx
// Add after the confirmation dialog:
<Dialog open={resetPasswordDialogOpen} onClose={() => setResetPasswordDialogOpen(false)} title="密码重置成功">
  <div className="space-y-4 py-4">
    <div className="flex items-center gap-2 text-emerald-600">
      <Check className="w-5 h-5" />
      <span className="font-medium">新密码已生成</span>
    </div>
    <p className="text-sm text-muted-foreground">
      请复制下方新密码并转告用户。出于安全考虑，此密码仅显示一次。
    </p>
    <div className="relative">
      <Input
        id="new-password-field"
        value={newPassword}
        readOnly
        className="pr-24 font-mono text-sm bg-muted"
      />
      <Button
        size="sm"
        onClick={handleCopyPassword}
        className="absolute right-1 top-1/2 -translate-y-1/2"
        variant={copied ? "default" : "outline"}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-1" />
            已复制
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-1" />
            复制
          </>
        )}
      </Button>
    </div>
  </div>
  <DialogFooter>
    <Button onClick={() => setResetPasswordDialogOpen(false)}>
      完成
    </Button>
  </DialogFooter>
</Dialog>
```

### Step 6: Commit changes

```bash
git add src/pages/UserManagement.tsx
git commit -m "feat(users): add password display dialog with copy functionality"
```

---

## Verification Checklist

After implementing all tasks, verify:

- [ ] Backend route `POST /api/users/:id/reset-password` exists and returns new password
- [ ] New password is 12 characters with uppercase, lowercase, numbers, and special characters
- [ ] Password is hashed with bcrypt before storage
- [ ] Reset password button appears next to edit button in user table
- [ ] Clicking reset password shows confirmation dialog
- [ ] Confirming generates new password and shows display dialog
- [ ] Copy button copies password to clipboard
- [ ] Audit logs record the password reset operation (handled automatically by audit middleware)

---

## Expected Behavior

1. Admin navigates to User Management page
2. Admin clicks the "Reset Password" (key icon) button next to a user
3. Confirmation dialog appears asking to confirm the action
4. Admin confirms, backend generates a 12-character random password
5. Password display dialog shows the new password with a copy button
6. Admin copies the password and can provide it to the user
7. The new password can be used for login immediately
