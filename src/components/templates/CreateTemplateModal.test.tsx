import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CreateTemplateModal } from './CreateTemplateModal'
import * as templatesStore from '@/stores/templates'
import * as toast from '@/lib/toast'

vi.mock('@/stores/templates', () => ({
  useTemplatesStore: vi.fn()
}))

vi.mock('@/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn()
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue || key
  })
}))

describe('CreateTemplateModal', () => {
  const mockAddTemplate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(templatesStore.useTemplatesStore).mockReturnValue({
      addTemplate: mockAddTemplate
    } as unknown as ReturnType<typeof templatesStore.useTemplatesStore>)
  })

  it('opens modal when open prop is true', () => {
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    expect(screen.getByText('创建模板')).toBeInTheDocument()
    expect(screen.getByText('创建可复用的提示词模板')).toBeInTheDocument()
  })

  it('does not render modal when open prop is false', () => {
    render(<CreateTemplateModal open={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText('创建模板')).not.toBeInTheDocument()
  })

  it('closes modal when clicking cancel button', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const cancelButton = screen.getByRole('button', { name: '取消' })
    await user.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('closes modal when clicking close X button', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByRole('button', { name: 'Close' })
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('validates required fields on submit', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Content is required')).toBeInTheDocument()
    })
    
    expect(mockAddTemplate).not.toHaveBeenCalled()
  })

  it('validates name field max length', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const nameInput = screen.getByPlaceholderText('输入模板名称')
    await user.type(nameInput, 'a'.repeat(101))
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Name must be 100 characters or less')).toBeInTheDocument()
    })
  })

  it('validates description field max length', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const descriptionInput = screen.getByPlaceholderText('简短描述模板用途（可选）')
    await user.type(descriptionInput, 'a'.repeat(501))
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Description must be 500 characters or less')).toBeInTheDocument()
    })
  })

  it('submits form successfully with valid data', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockResolvedValue(true)
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('输入模板名称'), 'Test Template')
    await user.type(screen.getByPlaceholderText('输入提示词模板内容，使用 {{变量名}} 定义动态值'), 'This is test content')
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddTemplate).toHaveBeenCalledWith({
        name: 'Test Template',
        description: '',
        content: 'This is test content',
        category: 'text',
        variables: []
      })
      expect(toast.toastSuccess).toHaveBeenCalledWith('模板创建成功')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('shows error toast when submission fails', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockResolvedValue(false)
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('输入模板名称'), 'Test Template')
    await user.type(screen.getByPlaceholderText('输入提示词模板内容，使用 {{变量名}} 定义动态值'), 'This is test content')
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddTemplate).toHaveBeenCalled()
      expect(toast.toastError).toHaveBeenCalledWith('创建模板失败')
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  it('allows adding and removing variables', async () => {
    const user = userEvent.setup()
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const variableInput = screen.getByPlaceholderText('添加变量名')
    await user.type(variableInput, 'myVar')
    
    // Find the Plus icon button (it's next to the variable input)
    const buttons = screen.getAllByRole('button')
    const addButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'))!
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('{{myVar}}')).toBeInTheDocument()
    })
    
    // Find the X icon button (it's inside the variable tag)
    const removeButton = screen.getByRole('button', { name: 'Close' })
    await user.click(removeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('{{myVar}}')).not.toBeInTheDocument()
    })
  })

  it('prevents duplicate variables', async () => {
    const user = userEvent.setup()
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const variableInput = screen.getByPlaceholderText('添加变量名')
    await user.type(variableInput, 'myVar')
    
    const buttons = screen.getAllByRole('button')
    const addButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'))!
    await user.click(addButton)
    
    await user.type(variableInput, 'myVar')
    await user.click(addButton)
    
    await waitFor(() => {
      expect(toast.toastError).toHaveBeenCalledWith('Variable already exists')
    })
  })

  it('allows selecting category', async () => {
    const user = userEvent.setup()
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const categoryTrigger = screen.getByRole('button', { name: '文本' })
    await user.click(categoryTrigger)
    
    await waitFor(() => {
      expect(screen.getByText('图像')).toBeInTheDocument()
    })
  })

  it('submits form with all fields including variables', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockResolvedValue(true)
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('输入模板名称'), 'Full Template')
    await user.type(screen.getByPlaceholderText('简短描述模板用途（可选）'), 'A description')
    await user.type(screen.getByPlaceholderText('输入提示词模板内容，使用 {{变量名}} 定义动态值'), 'Content with {{var1}} and {{var2}}')
    
    const variableInput = screen.getByPlaceholderText('添加变量名')
    await user.type(variableInput, 'var1')
    const buttons = screen.getAllByRole('button')
    const addButton = buttons.find(btn => btn.querySelector('svg.lucide-plus'))!
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('{{var1}}')).toBeInTheDocument()
    })
    
    await user.type(variableInput, 'var2')
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('{{var2}}')).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddTemplate).toHaveBeenCalledWith({
        name: 'Full Template',
        description: 'A description',
        content: 'Content with {var1}} and {var2}}',
        category: 'text',
        variables: [{ name: 'var1' }, { name: 'var2' }]
      })
    })
  })

  it('shows creating state while submitting', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('输入模板名称'), 'Test')
    await user.type(screen.getByPlaceholderText('输入提示词模板内容，使用 {{变量名}} 定义动态值'), 'Content')
    
    const submitButton = screen.getByRole('button', { name: '创建' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '创建中...' })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })
})
