import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArtistMaterialEditor from '../ArtistMaterialEditor'

vi.mock('@/components/materials/artist/ArtistWorkspace', () => ({
  ArtistWorkspace: ({ materialId }: { materialId: string }) => (
    <div data-testid="artist-workspace">artist workspace: {materialId}</div>
  ),
}))

vi.mock('@/lib/api/materials', () => ({
  getMaterialDetail: vi.fn(),
}))

describe('ArtistMaterialEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the generic material editor title for supported material types', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: {
        material: {
          id: 'artist-1',
          material_type: 'artist',
          name: 'Test Artist',
          description: 'Test description',
          metadata: null,
          owner_id: 'user-1',
          sort_order: 0,
          is_deleted: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        },
        materialPrompts: [],
        items: [],
      },
    })

    render(
      <MemoryRouter initialEntries={['/materials/artist-1/edit']}>
        <Routes>
          <Route path="/materials/:id/edit" element={<ArtistMaterialEditor />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('素材编辑器')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
    expect(screen.getByTestId('artist-workspace')).toBeInTheDocument()
  })
})
