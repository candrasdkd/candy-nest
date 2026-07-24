import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Documents from './Documents';

const refreshDocuments = vi.fn().mockResolvedValue(true);

vi.mock('../hooks/useDocuments', () => ({
  CATEGORY_INFO: {
    lainnya: { label: 'Lainnya', emoji: '📁', color: 'bg-sage-50 text-sage-700 border-sage-100' },
  },
  useDocuments: () => ({
    documents: [],
    filtered: [],
    loading: false,
    refreshing: false,
    lastSyncedAt: Date.now(),
    error: null,
    updateDocument: vi.fn(),
    refreshDocuments,
    showUpload: false,
    setShowUpload: vi.fn(),
    selected: null,
    setSelected: vi.fn(),
    activeCat: 'all',
    setActiveCat: vi.fn(),
    activePartnerId: 'all',
    setActivePartnerId: vi.fn(),
    showCatDropdown: false,
    setShowCatDropdown: vi.fn(),
    isSelectMode: false,
    setIsSelectMode: vi.fn(),
    selectedIds: [],
    setSelectedIds: vi.fn(),
    isExporting: false,
    partners: [],
    activeLabel: 'Semua Dokumen',
    toggleDocSelection: vi.fn(),
    handleExportPDF: vi.fn(),
    handleDelete: vi.fn(),
    getInitials: vi.fn(),
    getUploaderName: vi.fn(),
  }),
}));

vi.mock('../components/DocumentUploadModal', () => ({ default: () => null }));
vi.mock('../components/DocumentDetailModal', () => ({ default: () => null }));

describe('Documents manual refresh feedback', () => {
  it('menampilkan konfirmasi setelah refresh manual berhasil', async () => {
    render(
      <MemoryRouter>
        <Documents />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTitle('Perbarui dokumen sekarang'));

    expect(await screen.findByText('Dokumen berhasil diperbarui')).toBeInTheDocument();
  });
});
