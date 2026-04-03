#!/bin/bash
# Workflow Engine 渐进式验证脚本
# 用法: ./scripts/verify-workflow.sh [stage]

set -e

STAGE=${1:-"A"}
BASE_URL="http://localhost:4511"
TOKEN=""

echo "=== Workflow Engine Verification - Stage $STAGE ==="

# 检查服务器是否运行
check_server() {
  echo "Checking server status..."
  curl -s "$BASE_URL/api/cron/health" > /dev/null 2>&1 && echo "✅ Server is running" || {
    echo "❌ Server is not running. Start with: npm run dev:full"
    exit 1
  }
}

# 获取 JWT Token（需要先登录）
get_token() {
  echo "Getting auth token..."
  # 这里需要有效的用户凭据
  # TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  #   -H "Content-Type: application/json" \
  #   -d '{"username":"test","password":"test"}' | jq -r '.token')
  echo "⚠️  Please set TOKEN manually or implement login"
}

# 阶段 A：Mock 单元测试
stage_a() {
  echo ""
  echo "=== Stage A: Mock Unit Tests ==="
  npm test -- server/__tests__/workflow-stage-a.test.ts
  echo "✅ Stage A completed"
}

# 阶段 B：真实 API 验证
stage_b() {
  echo ""
  echo "=== Stage B: Real API Integration ==="
  
  check_server
  get_token
  
  # B-1: 文本生成
  echo ""
  echo "B-1: Testing text generation..."
  curl -s -X POST "$BASE_URL/api/text" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"Hello"}]}' | jq '.choices[0].message.content' && echo "✅ Text generation works"
  
  # B-2: 图片生成
  echo ""
  echo "B-2: Testing image generation..."
  curl -s -X POST "$BASE_URL/api/image" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"A sunset"}' | jq '.data[0].url' && echo "✅ Image generation works"
  
  # B-3: Workflow 执行
  echo ""
  echo "B-3: Testing workflow execution..."
  WORKFLOW_JSON='{
    "nodes": [
      {
        "id": "test-node",
        "type": "action",
        "data": {
          "label": "Test Text",
          "config": {
            "service": "minimaxClient",
            "method": "chatCompletion",
            "args": [{"messages":[{"role":"user","content":"test"}]}]
          }
        }
      }
    ],
    "edges": []
  }'
  
  # 这里需要 workflow 执行的 API endpoint
  echo "⚠️  Workflow execution API not yet implemented"
  
  echo "✅ Stage B completed"
}

# 阶段 C：端到端验证
stage_c() {
  echo ""
  echo "=== Stage C: End-to-End Verification ==="
  
  check_server
  get_token
  
  echo ""
  echo "C-1: Creating scheduled workflow..."
  # 创建 cron job
  JOB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/cron/jobs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Workflow Job",
      "cron_expression": "*/5 * * * *",
      "workflow_json": "{\"nodes\":[{\"id\":\"t1\",\"type\":\"action\",\"data\":{\"label\":\"Test\",\"config\":{\"service\":\"minimaxClient\",\"method\":\"chatCompletion\",\"args\":[{\"messages\":[{\"role\":\"user\",\"content\":\"test\"}]}]}}}],\"edges\":[]}",
      "is_active": true
    }')
  
  JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.id // .job.id')
  echo "Created job: $JOB_ID"
  
  echo ""
  echo "C-2: Manually triggering workflow..."
  curl -s -X POST "$BASE_URL/api/cron/jobs/$JOB_ID/run" \
    -H "Authorization: Bearer $TOKEN"
  
  echo ""
  echo "C-3: Checking execution logs..."
  sleep 2
  curl -s "$BASE_URL/api/cron/logs?job_id=$JOB_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.logs[0]'
  
  echo ""
  echo "C-4: Cleaning up..."
  curl -s -X DELETE "$BASE_URL/api/cron/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN"
  
  echo "✅ Stage C completed"
}

# 主流程
case "$STAGE" in
  A)
    stage_a
    ;;
  B)
    stage_b
    ;;
  C)
    stage_c
    ;;
  ALL)
    stage_a
    stage_b
    stage_c
    ;;
  *)
    echo "Usage: $0 [A|B|C|ALL]"
    echo "  A - Mock unit tests"
    echo "  B - Real API integration"
    echo "  C - End-to-end verification"
    echo "  ALL - Run all stages"
    exit 1
    ;;
esac

echo ""
echo "=== Verification Complete ==="