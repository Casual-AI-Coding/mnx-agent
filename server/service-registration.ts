import { getGlobalContainer } from './container.js'
import { registerServiceDependencies } from './service-registration/service-registrations.js'

export { TOKENS } from './service-registration/tokens.js'
export * from './service-registration/service-getters.js'

export async function registerServices(): Promise<void> {
  await registerServiceDependencies(getGlobalContainer())
}
