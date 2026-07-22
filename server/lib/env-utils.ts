/**
 * 环境探测 utility 集合。
 *
 * 仅承载「不依赖 AppConfig 的早期环境探测」需求。
 * 业务层环境判断应走 `getConfig().server.nodeEnv`。
 *
 * @see docs/decisions/0009-node-env-direct-read-strategy.md
 */

/**
 * 测试环境防呆守卫：用于强制要求测试代码使用 TEST_MEDIA_ROOT 等隔离配置。
 *
 * 注意：本函数是「防呆守卫」语义，不是业务层环境判断。
 * 业务层环境判断应走 `getConfig().server.nodeEnv === 'test'`。
 */
export function isTestEnvironmentGuard(): boolean {
  return process.env.NODE_ENV === 'test'
}
