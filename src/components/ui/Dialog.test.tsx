import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { Dialog } from './Dialog'

function DialogHarness() {
  const [open, setOpen] = useState(false)

  return (
    <div data-testid="dialog-container" className="relative overflow-hidden rounded-xl border">
      <button type="button" onClick={() => setOpen(true)}>
        打开弹窗
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="测试弹窗"
        description="用于验证挂载位置"
      >
        <div>弹窗内容</div>
      </Dialog>
    </div>
  )
}

describe('Dialog', () => {
  it('renders dialog content outside the overflow-hidden parent container', async () => {
    const user = userEvent.setup()
    render(<DialogHarness />)

    const container = screen.getByTestId('dialog-container')
    await user.click(screen.getByRole('button', { name: '打开弹窗' }))

    const dialogTitle = screen.getByRole('heading', { name: '测试弹窗' })

    expect(document.body).toContainElement(dialogTitle)
    expect(container).not.toContainElement(dialogTitle)
  })
})
