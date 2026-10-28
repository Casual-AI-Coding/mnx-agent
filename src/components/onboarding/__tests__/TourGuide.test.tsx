import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TourGuide } from '../TourGuide'
import { TOUR_STEPS, TOUR_STORAGE_KEY, isTourCompleted, markTourCompleted } from '@/lib/tour-steps'

describe('tour-steps 配置', () => {
  it('步骤字段完整且目标元素唯一', () => {
    const targets = TOUR_STEPS.filter(s => s.target).map(s => s.target)
    expect(new Set(targets).size).toBe(targets.length)
    for (const step of TOUR_STEPS) {
      expect(step.id).toBeTruthy()
      expect(step.title).toBeTruthy()
      expect(step.description.length).toBeGreaterThan(10)
    }
  })

  it('localStorage 读写与降级', () => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    expect(isTourCompleted()).toBe(false)
    markTourCompleted()
    expect(isTourCompleted()).toBe(true)
  })
})

describe('TourGuide', () => {
  beforeEach(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY)
  })

  it('未开启时不渲染', () => {
    render(<TourGuide open={false} onClose={vi.fn()} />)
    expect(screen.queryByTestId('tour-guide')).toBeNull()
  })

  it('第一步渲染欢迎卡片（无目标时居中）', () => {
    render(<TourGuide open onClose={vi.fn()} />)

    expect(screen.getByTestId('tour-guide')).toBeInTheDocument()
    expect(screen.getByText(TOUR_STEPS[0].title)).toBeInTheDocument()
    expect(screen.getByText('下一步')).toBeInTheDocument()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('目标步骤展示聚光灯', () => {
    // 模拟页面目标元素
    const host = document.createElement('div')
    host.setAttribute('data-tour', 'quick-actions')
    host.getBoundingClientRect = () => ({ top: 200, left: 100, width: 400, height: 120, right: 500, bottom: 320, x: 100, y: 200, toJSON: () => ({}) })
    document.body.appendChild(host)

    render(<TourGuide open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByText(TOUR_STEPS[2].title)).toBeInTheDocument()
    expect(screen.getByTestId('tour-spotlight')).toBeInTheDocument()
    host.remove()
  })

  it('逐步推进至最后一步后完成并写入 localStorage', () => {
    const onClose = vi.fn()
    render(<TourGuide open onClose={onClose} />)

    for (let i = 0; i < TOUR_STEPS.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    }
    expect(screen.getByText('完成')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '完成' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(isTourCompleted()).toBe(true)
  })

  it('上一步回退，跳过按钮直接完成', () => {
    const onClose = vi.fn()
    render(<TourGuide open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '上一步' }))
    expect(screen.getByText('1 / 5')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '跳过引导' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(isTourCompleted()).toBe(true)
  })
})
