/**
 * 新手引导 Tour 步骤配置（R-010）
 *
 * 每一步通过 data-tour 属性定位页面元素；找不到目标时卡片居中展示。
 * 步骤顺序即漫游顺序；新增引导点时在对应组件根元素加 data-tour 属性。
 */

export interface TourStep {
  id: string
  title: string
  description: string
  /** 目标元素的 data-tour 属性值 */
  target?: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到 Mnx-Agent 工作台',
    description:
      '这是一站式 AI 内容创作平台：文本、语音、图片、音乐、视频一次配齐。花 30 秒了解核心布局，随时可跳过。',
  },
  {
    id: 'sidebar',
    title: '左侧导航：功能分区',
    description:
      '创作工具、资源管理、监控统计、自动化、系统管理按分区组织；顶部有全局搜索与语言/区域切换。',
    target: 'sidebar',
  },
  {
    id: 'quick-actions',
    title: '从快捷入口开始创作',
    description:
      '仪表盘的快捷入口直达各生成页。选一个工具填参数提交即可，产物会自动归档到媒体管理与图片库。',
    target: 'quick-actions',
  },
  {
    id: 'notifications',
    title: '通知中心：失败与公告一站掌握',
    description:
      '铃铛聚合任务失败、死信队列、容量告警与系统公告；错误类通知即时弹出，全部可在面板回看。',
    target: 'notification-center',
  },
  {
    id: 'help',
    title: '遇到问题？去帮助中心',
    description:
      '左下角「帮助中心」提供常见问题与错误码速查表，失败提示可直接对照原因与修复建议。',
    target: 'help-center',
  },
]

export const TOUR_STORAGE_KEY = 'tour-completed'

export function isTourCompleted(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'
  } catch {
    return true
  }
}

export function markTourCompleted(): void {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true')
  } catch {
    // 隐私模式等场景下静默降级：每次会话可能重看引导
  }
}
