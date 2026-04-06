export type Factory<T> = (container: Container) => T
export type Registration<T> = T | Factory<T>

export interface Container {
  register<T>(token: string, registration: Registration<T>): void
  registerSingleton<T>(token: string, factory: Factory<T>): void
  resolve<T>(token: string): T
  has(token: string): boolean
  createScope(): Container
}

class ContainerImpl implements Container {
  private registrations = new Map<string, Registration<unknown>>()
  private singletons = new Map<string, unknown>()
  private singletonFactories = new Map<string, Factory<unknown>>()

  register<T>(token: string, registration: Registration<T>): void {
    this.registrations.set(token, registration)
  }

  registerSingleton<T>(token: string, factory: Factory<T>): void {
    this.registrations.set(token, factory)
    this.singletonFactories.set(token, factory)
  }

  resolve<T>(token: string): T {
    const registration = this.registrations.get(token)

    if (!registration) {
      throw new Error(`Container: missing dependency "${token}"`)
    }

    if (typeof registration === 'function') {
      if (this.singletonFactories.has(token)) {
        if (this.singletons.has(token)) {
          return this.singletons.get(token) as T
        }
        const instance = (registration as Factory<T>)(this)
        this.singletons.set(token, instance)
        return instance
      }
      return (registration as Factory<T>)(this)
    }

    return registration as T
  }

  has(token: string): boolean {
    return this.registrations.has(token)
  }

  createScope(): Container {
    const scoped = new ContainerImpl()
    this.registrations.forEach((value, key) => scoped.registrations.set(key, value))
    this.singletonFactories.forEach((value, key) => scoped.singletonFactories.set(key, value))
    return scoped
  }
}

let globalContainer: ContainerImpl | null = null

export function createContainer(): Container {
  return new ContainerImpl()
}

export function getGlobalContainer(): Container {
  if (!globalContainer) {
    globalContainer = new ContainerImpl()
  }
  return globalContainer
}

export function resetContainer(): void {
  globalContainer = null
}
