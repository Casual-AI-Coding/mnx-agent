/**
 * MiniMax 模型默认值集中定义（ADR-0006 Phase 2）。
 *
 * 历史：原 `server/routes/text.ts` 在 `/chat` 与 `/chat/stream` 两处分别
 * 硬编码字符串 `'abab5.5-chat'`，违反 DRY；模型升级需要逐处搜索修改。
 * 集中到常量后未来替换模型只需改这一处。
 *
 * 仅放置真正稳定的「默认值」——如果某个路由的业务语义要求强制使用
 * 特定模型（而非可被请求体覆盖），应在该路由内显式声明，不在此处
 * 隐式约束。
 */

/** Chat Completion 接口（`/chat`、`/chat/stream`）默认模型。 */
export const DEFAULT_CHAT_MODEL = 'abab5.5-chat'
