/**
 * API Playground 端点目录（R-018）
 *
 * 预定义可调试端点：只读端点可直接发送；生成类端点会真实消耗配额，
 * 目录中标注 sideEffect 以便 UI 提示。params 为可编辑的默认查询参数。
 */

export interface PlaygroundEndpoint {
  id: string
  method: 'GET' | 'POST'
  path: string
  label: string
  description: string
  /** 会产生真实 API 消耗/数据变更 */
  sideEffect?: boolean
  params?: { key: string; value: string }[]
  body?: string
}

export const PLAYGROUND_ENDPOINTS: PlaygroundEndpoint[] = [
  {
    id: 'usage',
    method: 'GET',
    path: '/api/usage',
    label: '账户余额',
    description: '查询 MiniMax 账户余额（realtime）',
  },
  {
    id: 'capacity',
    method: 'GET',
    path: '/api/capacity',
    label: '配额快照',
    description: '本地容量记录 + 编码套餐余量',
  },
  {
    id: 'operations',
    method: 'GET',
    path: '/api/stats/operations',
    label: '运营总览',
    description: '执行统计 / 服务分布 / DLQ / 容量 / 健康聚合',
  },
  {
    id: 'success-rate',
    method: 'GET',
    path: '/api/stats/success-rate',
    label: '成功率趋势',
    description: '按天/周/月的执行趋势',
    params: [
      { key: 'period', value: 'day' },
    ],
  },
  {
    id: 'media',
    method: 'GET',
    path: '/api/media',
    label: '媒体列表',
    description: '分页查询媒体记录',
    params: [
      { key: 'page', value: '1' },
      { key: 'limit', value: '10' },
    ],
  },
  {
    id: 'cron-jobs',
    method: 'GET',
    path: '/api/cron-jobs',
    label: '定时任务列表',
    description: '当前用户的 cron 任务',
  },
  {
    id: 'text-generation',
    method: 'POST',
    path: '/api/text',
    label: '文本生成',
    description: '调用 MiniMax 文本生成（真实消耗配额）',
    sideEffect: true,
    body: JSON.stringify({ model: 'abab6.5s-chat', prompt: '你好，请做一次自我介绍。' }, null, 2),
  },
]
