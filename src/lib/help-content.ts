/**
 * 帮助中心内容数据源（R-011）
 *
 * FAQ 按分类组织；API 文档链接为官方/本地文档入口。
 * 纯静态数据，Node 可加载，供测试断言完整性。
 */

export interface HelpFaq {
  id: string
  question: string
  answer: string
}

export interface HelpFaqCategory {
  id: string
  label: string
  faqs: HelpFaq[]
}

export interface HelpDocLink {
  title: string
  url: string
  description: string
}

export const FAQ_CATEGORIES: HelpFaqCategory[] = [
  {
    id: 'getting-started',
    label: '快速上手',
    faqs: [
      {
        id: 'faq-key-setup',
        question: '如何配置 API Key？',
        answer:
          '点击顶部导航的云图标打开设置弹窗，粘贴你的 MiniMax API Key 并选择区域（cn / intl）。Key 仅保存在浏览器本地，请求时由后端代理注入。',
      },
      {
        id: 'faq-first-generation',
        question: '第一次生成内容从哪里开始？',
        answer:
          '左侧「创作工具」选择文本 / 图片 / 音乐 / 视频任意生成页，填写参数后提交。生成历史在顶部历史面板查看，媒体产物在「媒体管理」与「图片库」中。',
      },
      {
        id: 'faq-region-switch',
        question: '国内站与国际站有什么区别？',
        answer:
          '顶部 Globe 按钮切换区域。两个区域的 API 域名与余额体系互相独立，切换后请确认对应区域存在有效余额。',
      },
    ],
  },
  {
    id: 'generation',
    label: '生成功能',
    faqs: [
      {
        id: 'faq-image-capacity',
        question: '图片任务提示容量不足怎么办？',
        answer:
          '系统按配额快照（用量监控 → 配额快照）预留生成额度，剩余量低于 20% 会标记「余量不足」。前往「用量配额」页手动刷新拉取最新余额，或等待配额重置。',
      },
      {
        id: 'faq-voice-clone',
        question: '如何使用自定义音色？',
        answer:
          '在「音色管理」页复制目标音色的 voice_id，到语音生成页选择「自定义音色」并粘贴。克隆新音色需要在 MiniMax 平台完成录音与审核。',
      },
      {
        id: 'faq-video-agent',
        question: '视频 Agent 与普通视频生成的差异？',
        answer:
          '视频 Agent 走多阶段编排（脚本 → 分镜 → 生成 → 合成），耗时更长但可整体控制叙事；普通视频生成是单次调用，速度更快。',
      },
    ],
  },
  {
    id: 'automation',
    label: '任务与调度',
    faqs: [
      {
        id: 'faq-cron-dlq',
        question: '任务为什么会进入死信队列？',
        answer:
          '任务重试次数耗尽（默认 max_retries=3）后进入死信队列。常见原因：上游 API 持续报错、余额不足、参数被上游拒绝。在「死信队列」页可单条重试或标记删除。',
      },
      {
        id: 'faq-workflow-test',
        question: '工作流测试失败如何定位？',
        answer:
          '执行日志页展开对应 execution 的节点明细，每个节点记录输入、输出与错误信息。测试失败也会推送到顶部通知中心。',
      },
      {
        id: 'faq-webhook-retry',
        question: 'Webhook 投递失败会重试吗？',
        answer:
          '会。Webhook 按 1 分钟窗口限流（默认 100 次/分钟/配置），失败投递按重试策略自动重试，投递记录在「Webhooks」页查看。',
      },
    ],
  },
  {
    id: 'account',
    label: '账户与配额',
    faqs: [
      {
        id: 'faq-balance-zero',
        question: '提示余额不足但余额页有余额？',
        answer:
          '确认区域与 Key 匹配（cn 站余额与国际站不互通），并确认账户未触发风控。仍异常时在「用量配额」页点击刷新同步最新余额。',
      },
      {
        id: 'faq-rate-limit-adjust',
        question: '如何调整各服务的调用频率限制？',
        answer:
          'Super 管理员可在「系统管理 → 速率限制」页面直接修改各服务 RPM，保存即时生效，无需重启（详见帮助中心「错误码速查」的 1027 条目）。',
      },
      {
        id: 'faq-token-usage',
        question: '用量监控的数据来源是什么？',
        answer:
          '页面分两部分：「运营指标」来自后端执行统计（/api/stats/operations，含服务占比、配额快照、执行趋势）；「本地记录」为浏览器内累计的个人使用量。',
      },
    ],
  },
  {
    id: 'troubleshooting',
    label: '故障排查',
    faqs: [
      {
        id: 'faq-401-loop',
        question: '一直提示登录或 401？',
        answer:
          '访问令牌过期后前端会自动用刷新令牌续期；若刷新也失败会跳转登录页。多标签页同时刷新偶发竞争，重新登录即可恢复。',
      },
      {
        id: 'faq-network-timeout',
        question: '请求超时或 5xx 如何排查？',
        answer:
          '先看「监控统计 → 内部审计日志 / 外部调用日志」确认是平台侧还是上游侧错误；错误码速查表（本页下方）列出了常见错误码的原因与处理建议。',
      },
      {
        id: 'faq-data-backup',
        question: '媒体文件会丢失吗？',
        answer:
          '媒体落盘在服务端 data/ 目录并记录于数据库；管理员可运行备份脚本将 media 与数据库快照上传到 B2/R2 云端（详见 README「云端备份」）。',
      },
    ],
  },
]

export const API_DOC_LINKS: HelpDocLink[] = [
  {
    title: 'MiniMax 平台文档',
    url: 'https://platform.minimaxi.com/document/Announcement',
    description: '各服务 API 参数、模型列表与官方错误码全表',
  },
  {
    title: '内部架构与协议',
    url: 'https://github.com/your-org/mnx-agent/blob/main/README.md',
    description: '部署方式、环境变量、目录结构与本地开发指南',
  },
  {
    title: '变更日志',
    url: 'https://github.com/your-org/mnx-agent/blob/main/CHANGELOG.md',
    description: '每个版本的特性、修复与兼容性说明',
  },
]
