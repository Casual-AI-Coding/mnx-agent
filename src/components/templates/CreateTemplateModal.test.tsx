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
    
    expect(screen.getByText('Create Template')).toBeInTheDocument()
    expect(screen.getByText('Create a new prompt template for your projects')).toBeInTheDocument()
  })

  it('does not render modal when open prop is false', () => {
    render(<CreateTemplateModal open={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText('Create Template')).not.toBeInTheDocument()
  })

  it('closes modal when clicking cancel button', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    await user.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('closes modal when clicking close X button', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('validates required fields on submit', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
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
    
    const nameInput = screen.getByPlaceholderText('Enter template name')
    await user.type(nameInput, 'a'.repeat(101))
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Name must be 100 characters or less')).toBeInTheDocument()
    })
  })

  it('validates description field max length', async () => {
    const user = userEvent.setup()
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const descriptionInput = screen.getByPlaceholderText('Enter template description (optional)')
    await user.type(descriptionInput, 'a'.repeat(501))
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Description must be 500 characters or less')).toBeInTheDocument()
    })
  })

  it('submits form successfully with valid data', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockResolvedValue(true)
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('Enter template name'), 'Test Template')
    await user.type(screen.getByPlaceholderText('Enter prompt template content. Use {{variable}} for dynamic values.'), 'This is test content')
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddTemplate).toHaveBeenCalledWith({
        name: 'Test Template',
        description: undefined,
        content: 'This is test content',
        category: 'text',
        variables: undefined
      })
      expect(toast.toastSuccess).toHaveBeenCalledWith('Template created successfully')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('shows error toast when submission fails', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockResolvedValue(false)
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('Enter template name'), 'Test Template')
    await user.type(screen.getByPlaceholderText('Enter prompt template content. Use {{variable}} for dynamic values.'), 'This is test content')
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddTemplate).toHaveBeenCalled()
      expect(toast.toastError).toHaveBeenCalledWith('Failed to create template')
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  it('allows adding and removing variables', async () => {
    const user = userEvent.setup()
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const variableInput = screen.getByPlaceholderText('Add variable name')
    await user.type(variableInput, 'myVar')
    
    const addButton = screen.getByRole('button', { name: '' })
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText('{{myVar}}')).toBeInTheDocument()
    })
    
    const removeButton = screen.getByRole('button', { name: '' })
    await user.click(removeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('{{myVar}}')).not.toBeInTheDocument()
    })
  })

  it('prevents duplicate variables', async () => {
    const user = userEvent.setup()
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const variableInput = screen.getByPlaceholderText('Add variable name')
    await user.type(variableInput, 'myVar')
    
    const addButton = screen.getByRole('button', { name: '' })
    await user.click(addButton)
    await user.click(addButton)
    
    await waitFor(() => {
      expect(toast.toastError).toHaveBeenCalledWith('Variable already exists')
    })
  })

  it('allows selecting category', async () => {
    const user = userEvent.setup()
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    const categoryTrigger = screen.getByRole('button', { name: 'Text' })
    await user.click(categoryTrigger)
    
    await waitFor(() => {
      expect(screen.getByText('Image')).toBeInTheDocument()
    })
  })

  it('submits form with all fields including variables', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockResolvedValue(true)
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('Enter template name'), 'Full Template')
    await user.type(screen.getByPlaceholderText('Enter template description (optional)'), 'A description')
    await user.type(screen.getByPlaceholderText('Enter prompt template content. Use {{variable}} for dynamic values.'), 'Content with {{var1}} and {{var2}}')
    
    const variableInput = screen.getByPlaceholderText('Add variable name')
    await user.type(variableInput, 'var1')
    const addButtons = screen.getAllByRole('button', { name: '' })
    await user.click(addButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('{{var1}}')).toBeInTheDocument()
    })
    
    await user.type(variableInput, 'var2')
    await user.click(addButtons[0])
    
    await waitFor(() => {
      expect(screen.getByText('{{var2}}')).toBeInTheDocument()
    })
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockAddTemplate).toHaveBeenCalledWith({
        name: 'Full Template',
        description: 'A description',
        content: 'Content with {{var1}} and {{var2}}',
        category: 'text',
        variables: [{ name: 'var1' }, { name: 'var2' }]
      })
    })
  })

  it('shows creating state while submitting', async () => {
    const user = userEvent.setup()
    mockAddTemplate.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
    
    render(<CreateTemplateModal open={true} onClose={mockOnClose} />)
    
    await user.type(screen.getByPlaceholderText('Enter template name'), 'Test')
    await user.type(screen.getByPlaceholderText('Enter prompt template content. Use {{variable}} for dynamic values.'), 'Content')
    
    const submitButton = screen.getByRole('button', { name: 'Create' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })
})
