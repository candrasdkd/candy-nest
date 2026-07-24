import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FamilyDocument } from '../types/document';

const mocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  getDocs: mocks.getDocs,
}));

import { DOCUMENT_CACHE_TTL_MS, useDocumentsStore } from './useDocumentsStore';

const cachedDocument: FamilyDocument = {
  id: 'cached-1',
  name: 'KTP Offline',
  category: 'ktp',
  fileType: 'image',
  imageUrls: ['cached-url'],
  storagePaths: ['cached-path'],
  extractedText: '',
  fields: [],
  uploadedBy: 'User',
  createdAt: new Date('2026-07-23T08:00:00Z'),
  coupleId: 'couple-1',
};

describe('useDocumentsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T08:00:00Z'));
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    useDocumentsStore.setState({
      coupleId: 'couple-1',
      documents: [cachedDocument],
      lastSyncedAt: Date.now(),
      loading: false,
      refreshing: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('menggunakan cache tanpa membaca Firestore jika belum 24 jam', async () => {
    await useDocumentsStore.getState().refreshDocuments('couple-1');

    expect(mocks.getDocs).not.toHaveBeenCalled();
    expect(useDocumentsStore.getState().documents).toEqual([cachedDocument]);
  });

  it('refresh manual tetap membaca Firestore walau cache masih baru', async () => {
    mocks.getDocs.mockResolvedValue({
      docs: [{
        id: 'remote-1',
        data: () => ({
          ...cachedDocument,
          name: 'Dokumen Terbaru',
          createdAt: { toDate: () => new Date('2026-07-24T07:00:00Z') },
        }),
      }],
    });

    await useDocumentsStore.getState().refreshDocuments('couple-1', true);

    expect(mocks.getDocs).toHaveBeenCalledOnce();
    expect(useDocumentsStore.getState().documents[0].name).toBe('Dokumen Terbaru');
    expect(useDocumentsStore.getState().lastSyncedAt).toBe(Date.now());
  });

  it('otomatis membaca Firestore lagi setelah cache berusia 24 jam', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [] });
    useDocumentsStore.setState({
      lastSyncedAt: Date.now() - DOCUMENT_CACHE_TTL_MS - 1,
    });

    await useDocumentsStore.getState().refreshDocuments('couple-1');

    expect(mocks.getDocs).toHaveBeenCalledOnce();
    expect(useDocumentsStore.getState().lastSyncedAt).toBe(Date.now());
  });

  it('tetap menampilkan cache ketika offline dan cache sudah kedaluwarsa', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    useDocumentsStore.setState({
      lastSyncedAt: Date.now() - DOCUMENT_CACHE_TTL_MS - 1,
    });

    await useDocumentsStore.getState().refreshDocuments('couple-1', true);

    expect(mocks.getDocs).not.toHaveBeenCalled();
    expect(useDocumentsStore.getState().documents).toEqual([cachedDocument]);
    expect(useDocumentsStore.getState().loading).toBe(false);
    expect(useDocumentsStore.getState().error).toContain('data tersimpan');
  });
});
