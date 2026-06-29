import { ApiError } from '../errors'
import { withApiResponse } from '../request'
import { describe, expect, it } from 'vitest'

interface UserPayload {
  readonly id: string
  readonly name: string
}

describe('withApiResponse', () => {
  it('返回标准成功响应 when 请求解析出后端 data 包装体', async () => {
    const payload: UserPayload = { id: 'user-1', name: '测试用户' }

    const result = await withApiResponse(() => Promise.resolve({ data: { data: payload } }))

    expect(result).toEqual({ success: true, data: payload })
  })

  it('返回转换后的成功响应 when 提供结果转换函数', async () => {
    const payload = { user_id: 'user-1', display_name: '测试用户' }

    const result = await withApiResponse(
      () => Promise.resolve({ data: { data: payload } }),
      (data) => ({ id: data.user_id, name: data.display_name })
    )

    expect(result).toEqual({ success: true, data: { id: 'user-1', name: '测试用户' } })
  })

  it('返回标准错误响应 when 请求抛出 ApiError', async () => {
    const result = await withApiResponse(() => Promise.reject(new ApiError('请求失败', 400)))

    expect(result).toEqual({ success: false, error: '请求失败' })
  })
})
