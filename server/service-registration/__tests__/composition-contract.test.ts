import { describe, expect, it } from 'vitest'
import * as publicFacade from '../../service-registration.js'
import * as getters from '../service-getters.js'
import { registerServiceDependencies } from '../service-registrations.js'
import { TOKENS } from '../tokens.js'

describe('service registration composition', () => {
  it('reexports the single token object and every getter through the public facade', () => {
    expect(publicFacade.TOKENS).toBe(TOKENS)
    expect(publicFacade).toMatchObject(getters)
  })

  it('keeps public and internal registration entry points available', () => {
    expect(publicFacade.registerServices).toBeTypeOf('function')
    expect(registerServiceDependencies).toBeTypeOf('function')
  })
})
