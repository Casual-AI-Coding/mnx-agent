#!/bin/bash

echo "====================================="
echo "系统管理模块优化 - 功能验证脚本"
echo "====================================="
echo ""

echo "1. 检查TypeScript编译..."
npm run type-check 2>&1 | tail -20
echo ""

echo "2. 检查新增路由..."
echo "  邀请码PATCH:"
grep -n "router.patch" server/routes/invitation-codes.ts | head -1

echo "  服务节点DELETE:"
grep -n "router.delete" server/routes/admin/service-nodes.ts | head -1
echo ""

echo "3. 检查新增组件..."
if [ -f "src/components/shared/ConfirmDialog.tsx" ]; then
  echo "  ✅ ConfirmDialog组件存在 ($(wc -l < src/components/shared/ConfirmDialog.tsx) 行)"
else
  echo "  ❌ ConfirmDialog组件不存在"
fi

if [ -f "src/components/shared/Pagination.tsx" ]; then
  echo "  ✅ Pagination组件存在"
else
  echo "  ⏳ Pagination组件创建中..."
fi
echo ""

echo "4. 检查Toast替换..."
TOAST_COUNT=$(grep -r "toast\." src/pages/UserManagement.tsx src/pages/InvitationCodes.tsx src/pages/ServiceNodeManagement.tsx 2>/dev/null | wc -l)
echo "  Toast调用数量: $TOAST_COUNT"
echo ""

echo "5. 检查导出功能..."
if grep -q "ExportButton" src/pages/UserManagement.tsx; then
  echo "  ✅ UserManagement已添加导出按钮"
else
  echo "  ❌ UserManagement缺少导出按钮"
fi
echo ""

echo "====================================="
echo "验证完成"
echo "====================================="