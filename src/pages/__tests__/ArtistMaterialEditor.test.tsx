import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArtistMaterialEditor from '../ArtistMaterialEditor'

vi.mock('@/components/materials/artist/ArtistWorkspace', () => ({
  ArtistWorkspace: ({ materialId, initialDetail }: { materialId: string; initialDetail?: unknown }) => (
    <div data-testid="artist-workspace" data-initial-detail={initialDetail ? 'true' : 'false'}>
      artist workspace: {materialId}
    </div>
  ),
}))

vi.mock('@/lib/api/materials', () => ({
  getMaterialDetail: vi.fn(),
}))

describe('ArtistMaterialEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes initialDetail to ArtistWorkspace for artist materials', async () => {
    const { getMaterialDetail } = await import('@/lib/api/materials')
    const mockDetail = {
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
    }
    vi.mocked(getMaterialDetail).mockResolvedValue({
      success: true,
      data: mockDetail,
    })

    render(
      <MemoryRouter initialEntries={['/materials/artist-1/edit']}>
        <Routes>
          <Route path="/materials/:id/edit" element={<ArtistMaterialEditor />} />
        </Routes>
      </MemoryRouter>
    )

    const workspace = await screen.findByTestId('artist-workspace')
    // initialDetail must be passed so ArtistWorkspace skips redundant re-fetch
    expect(workspace).toHaveAttribute('data-initial-detail', 'true')
  })
})
