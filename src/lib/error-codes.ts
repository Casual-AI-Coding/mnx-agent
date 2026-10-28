/**
 * 错误码速查数据源（R-020）
 *
 * 三类：MiniMax 上游错误码（常见码，以官方文档为准）、系统内部 HTTP 错误、
 * 外部代理错误。每条含常见原因与修复建议；详情锚点 id 与 HelpCenter 路由约定：
 * /help#error-{category}-{code}
 */

export type ErrorCodeCategory = 'minimax' | 'internal' | 'proxy'

export interface ErrorCodeEntry {
  code: string
  title: string
  cause: string
  fix: string
}

export interface ErrorCodeGroup {
  category: ErrorCodeCategory
  label: string
  description: string
  entries: ErrorCodeEntry[]
}

export const ERROR_CODE_GROUPS: ErrorCodeGroup[] = [
  {
    category: 'minimax',
    label: 'MiniMax 上游错误码',
    description: '上游 API 返回的 BaseResp.status_code 常见值，完整列表以 MiniMax 官方文档为准',
    entries: [
      {
        code: '1000',
        title: '未知 / 参数错误',
        cause: '请求参数缺失、类型或取值不合法，或上游返回未分类错误',
        fix: '检查生成页参数（模型名、尺寸、音色 id 等）；查看外部调用日志的完整响应体定位具体字段',
      },
      {
        code: '1004',
        title: '认证失败',
        cause: 'API Key 无效、被禁用，或与所选区域不匹配',
        fix: '顶部设置弹窗重新粘贴有效 Key；确认区域（cn / intl）与 Key 一致',
      },
      {
        code: '1027',
        title: '频率超限',
        cause: '调用频率超出该服务 QPM/RPM 限制',
        fix: '降低并发或稍后重试；Super 管理员可在「系统管理 → 速率限制」调整本平台各服务 RPM',
      },
      {
        code: '1039',
        title: '账号风控 / 交易受限',
        cause: '账户触发平台风控（实名未完成、异常调用模式等）',
        fix: '登录 MiniMax 平台完成实名与账户校验；必要时联系上游客服申诉',
      },
      {
        code: '2013',
        title: '余额不足',
        cause: '账户可用余额低于本次调用预估消耗',
        fix: '前往平台充值；「用量配额」页刷新后确认余额同步',
      },
    ],
  },
  {
    category: 'internal',
    label: '系统内部错误（HTTP）',
    description: '本平台 API 的标准 HTTP 状态码语义',
    entries: [
      {
        code: '401',
        title: '未认证',
        cause: '访问令牌缺失、过期或刷新失败',
        fix: '重新登录；多标签页场景优先关掉旧标签页再登录',
      },
      {
        code: '403',
        title: '权限不足',
        cause: '当前角色无权访问该资源（管理端点需 ADMIN / SUPER）',
        fix: '联系管理员确认角色；邀请码升级角色后重新登录生效',
      },
      {
        code: '404',
        title: '资源不存在',
        cause: '目标记录已被删除或 id 错误',
        fix: '刷新列表确认记录状态；媒体记录被软删除时可在回收相关页面恢复',
      },
      {
        code: '429',
        title: '请求过于频繁',
        cause: '触达本平台网关限流（媒体上传 / cron 等热点端点）',
        fix: '等待窗口结束重试；批量任务改用 cron 调度错峰执行',
      },
      {
        code: '500',
        title: '服务器内部错误',
        cause: '平台处理异常，详情已写入内部审计日志并携带 trace_id',
        fix: '在「内部审计日志」按时间检索错误详情；可复现时附 trace_id 反馈',
      },
    ],
  },
  {
    category: 'proxy',
    label: '外部代理错误',
    description: '经外部代理（OpenAI Image-2 等外部调试）链路的错误',
    entries: [
      {
        code: '502',
        title: '上游不可达 / 失败',
        cause: '外部服务返回错误或代理白名单拦截',
        fix: '确认目标域名在系统配置的 proxy.allowed_hosts 白名单内；检查外部服务状态',
      },
      {
        code: '504',
        title: '上游超时',
        cause: '外部服务响应超过网关超时上限',
        fix: '重试一次；大图生成等长任务建议避开高峰期',
      },
    ],
  },
]

/** 详情锚点：与 HelpCenter 的 DOM id 保持一致 */
export function errorCodeAnchor(category: ErrorCodeCategory, code: string): string {
  return `error-${category}-${code}`
}
