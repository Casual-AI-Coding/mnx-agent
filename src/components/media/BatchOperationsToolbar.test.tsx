import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BatchOperationsToolbar, BatchDeleteDialog } from './BatchOperationsToolbar'

describe('BatchOperationsToolbar', () => {
  it('renders null when selectedCount is 0', () => {
    const { container } = render(
      <BatchOperationsToolbar
        selectedCount={0}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders toolbar when items are selected', () => {
    render(
      <BatchOperationsToolbar
        selectedCount={3}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )
    
    expect(screen.getByText('已选择 3 个项目')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /下载/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /清除选择/i })).toBeInTheDocument()
  })

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    
    render(
      <BatchOperationsToolbar
        selectedCount={2}
        onDelete={onDelete}
        onDownload={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )
    
    const deleteButton = screen.getByRole('button', { name: /删除/i })
    await user.click(deleteButton)
    
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('calls onDownload when download button is clicked', async () => {
    const user = userEvent.setup()
    const onDownload = vi.fn()
    
    render(
      <BatchOperationsToolbar
        selectedCount={2}
        onDelete={vi.fn()}
        onDownload={onDownload}
        onClearSelection={vi.fn()}
      />
    )
    
    const downloadButton = screen.getByRole('button', { name: /下载/i })
    await user.click(downloadButton)
    
    expect(onDownload).toHaveBeenCalledTimes(1)
  })

  it('calls onClearSelection when clear button is clicked', async () => {
    const user = userEvent.setup()
    const onClearSelection = vi.fn()
    
    render(
      <BatchOperationsToolbar
        selectedCount={2}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
        onClearSelection={onClearSelection}
      />
    )
    
    const clearButton = screen.getByRole('button', { name: /清除选择/i })
    await user.click(clearButton)
    
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when isDeleting is true', () => {
    render(
      <BatchOperationsToolbar
        selectedCount={2}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
        onClearSelection={vi.fn()}
        isDeleting={true}
      />
    )
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
    expect(screen.getByText('删除中...')).toBeInTheDocument()
  })

  it('disables buttons when isDownloading is true', () => {
    render(
      <BatchOperationsToolbar
        selectedCount={2}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
        onClearSelection={vi.fn()}
        isDownloading={true}
      />
    )
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
    expect(screen.getByText('下载中...')).toBeInTheDocument()
  })

  it('shows selected count badge', () => {
    render(
      <BatchOperationsToolbar
        selectedCount={5}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )
    
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})

describe('BatchDeleteDialog', () => {
  it('renders when isOpen is true', () => {
    render(
      <BatchDeleteDialog
        isOpen={true}
        selectedCount={3}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    expect(screen.getByText('确认批量删除')).toBeInTheDocument()
    expect(screen.getByText(/您即将删除 3 个文件/)).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BatchDeleteDialog
        isOpen={false}
        selectedCount={3}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    
    render(
      <BatchDeleteDialog
        isOpen={true}
        selectedCount={3}
        onClose={onClose}
        onConfirm={vi.fn()}
      />
    )
    
    const cancelButton = screen.getByRole('button', { name: /取消/i })
    await user.click(cancelButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when delete button is clicked', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    
    render(
      <BatchDeleteDialog
        isOpen={true}
        selectedCount={3}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    )
    
    const deleteButton = screen.getByRole('button', { name: /删除 3 个文件/i })
    await user.click(deleteButton)
    
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables buttons when isDeleting is true', () => {
    render(
      <BatchDeleteDialog
        isOpen={true}
        selectedCount={3}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isDeleting={true}
      />
    )
    
    const cancelButton = screen.getByRole('button', { name: /取消/i })
    const deleteButton = screen.getByRole('button', { name: /删除中/i })
    
    expect(cancelButton).toBeDisabled()
    expect(deleteButton).toBeDisabled()
  })

  it('displays correct item count in confirmation message', () => {
    render(
      <BatchDeleteDialog
        isOpen={true}
        selectedCount={10}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /删除 10 个文件/i })).toBeInTheDocument()
  })
})
