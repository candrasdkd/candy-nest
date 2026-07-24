import { create } from 'zustand';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { FamilyDocument } from '../types/document';

const CACHE_KEY = 'candy-nest:documents';
export const DOCUMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface DocumentsCache {
  coupleId: string | null;
  lastSyncedAt: number | null;
  documents: FamilyDocument[];
}

interface DocumentsState extends DocumentsCache {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshDocuments: (coupleId: string, force?: boolean) => Promise<void>;
  addCachedDocument: (document: FamilyDocument) => void;
  updateCachedDocument: (id: string, updates: Partial<FamilyDocument>) => void;
  removeCachedDocument: (id: string) => void;
  clearDocuments: () => void;
}

interface SerializedDocument extends Omit<FamilyDocument, 'createdAt'> {
  createdAt: string;
}

interface SerializedCache {
  coupleId: string | null;
  lastSyncedAt: number | null;
  documents: SerializedDocument[];
}

function getBrowserStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function normalizeDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function readCache(): DocumentsCache {
  try {
    const raw = getBrowserStorage()?.getItem(CACHE_KEY);
    if (!raw) return { coupleId: null, lastSyncedAt: null, documents: [] };
    const cached = JSON.parse(raw) as SerializedCache;
    return {
      coupleId: cached.coupleId,
      lastSyncedAt: cached.lastSyncedAt,
      documents: (cached.documents || []).map(document => ({
        ...document,
        createdAt: normalizeDate(document.createdAt),
      })),
    };
  } catch {
    return { coupleId: null, lastSyncedAt: null, documents: [] };
  }
}

function writeCache(cache: DocumentsCache) {
  try {
    const serialized: SerializedCache = {
      coupleId: cache.coupleId,
      lastSyncedAt: cache.lastSyncedAt,
      documents: cache.documents.map(document => ({
        ...document,
        createdAt: normalizeDate(document.createdAt).toISOString(),
      })),
    };
    getBrowserStorage()?.setItem(CACHE_KEY, JSON.stringify(serialized));
  } catch {
    // Cache gagal ditulis tidak boleh memblokir operasi Firestore.
  }
}

const initialCache = readCache();
let activeRefresh: Promise<void> | null = null;
let activeRefreshCoupleId: string | null = null;

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  ...initialCache,
  loading: initialCache.documents.length === 0,
  refreshing: false,
  error: null,

  refreshDocuments: async (coupleId, force = false) => {
    const state = get();
    const sameCouple = state.coupleId === coupleId;
    const cacheIsFresh = sameCouple
      && state.lastSyncedAt !== null
      && Date.now() - state.lastSyncedAt < DOCUMENT_CACHE_TTL_MS;

    if (!force && cacheIsFresh) {
      set({ loading: false, error: null });
      return;
    }

    if (activeRefresh) {
      if (activeRefreshCoupleId === coupleId) return activeRefresh;
      await activeRefresh;
      return get().refreshDocuments(coupleId, force);
    }

    if (!sameCouple) {
      set({
        coupleId,
        documents: [],
        lastSyncedAt: null,
        loading: true,
        error: null,
      });
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      set({
        loading: false,
        refreshing: false,
        error: sameCouple && state.documents.length > 0
          ? 'Sedang offline. Menampilkan data tersimpan.'
          : 'Sedang offline. Dokumen akan disinkronkan saat koneksi tersedia.',
      });
      return;
    }

    set({
      refreshing: true,
      loading: sameCouple ? state.documents.length === 0 : true,
      error: null,
    });

    activeRefreshCoupleId = coupleId;
    activeRefresh = (async () => {
      try {
        const documentsQuery = query(
          collection(db, 'family_documents'),
          where('coupleId', '==', coupleId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(documentsQuery);
        const documents = snapshot.docs.map(snapshotDocument => {
          const data = snapshotDocument.data();
          return {
            id: snapshotDocument.id,
            ...data,
            createdAt: normalizeDate(data.createdAt),
          } as FamilyDocument;
        });
        const lastSyncedAt = Date.now();
        const nextCache = { coupleId, documents, lastSyncedAt };
        if (get().coupleId !== coupleId) return;
        writeCache(nextCache);
        set({
          ...nextCache,
          loading: false,
          refreshing: false,
          error: null,
        });
      } catch (error) {
        console.error('Gagal menyinkronkan dokumen:', error);
        set(current => ({
          loading: false,
          refreshing: false,
          error: current.documents.length > 0
            ? 'Sinkronisasi gagal. Menampilkan data offline.'
            : 'Gagal memuat dokumen.',
        }));
      } finally {
        activeRefresh = null;
        activeRefreshCoupleId = null;
      }
    })();

    return activeRefresh;
  },

  addCachedDocument: document => {
    const state = get();
    const documents = [document, ...state.documents.filter(item => item.id !== document.id)]
      .sort((a, b) => normalizeDate(b.createdAt).getTime() - normalizeDate(a.createdAt).getTime());
    const nextCache = { coupleId: state.coupleId, lastSyncedAt: state.lastSyncedAt, documents };
    writeCache(nextCache);
    set({ documents });
  },

  updateCachedDocument: (id, updates) => {
    const state = get();
    const documents = state.documents.map(document => (
      document.id === id ? { ...document, ...updates } : document
    ));
    const nextCache = { coupleId: state.coupleId, lastSyncedAt: state.lastSyncedAt, documents };
    writeCache(nextCache);
    set({ documents });
  },

  removeCachedDocument: id => {
    const state = get();
    const documents = state.documents.filter(document => document.id !== id);
    const nextCache = { coupleId: state.coupleId, lastSyncedAt: state.lastSyncedAt, documents };
    writeCache(nextCache);
    set({ documents });
  },

  clearDocuments: () => {
    getBrowserStorage()?.removeItem(CACHE_KEY);
    set({
      coupleId: null,
      documents: [],
      lastSyncedAt: null,
      loading: false,
      refreshing: false,
      error: null,
    });
  },
}));
