import { create } from 'zustand';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Installment, InstallmentPayment } from '../types';
import { useAuthStore } from './useAuthStore';

interface InstallmentsState {
  installments: Installment[];
  loading: boolean;
  error: string | null;
  initInstallments: () => () => void;
  addInstallment: (data: { title: string; totalDebt: number }) => Promise<void>;
  updateInstallment: (id: string, data: { title: string; totalDebt: number }) => Promise<void>;
  deleteInstallment: (id: string) => Promise<void>;
  addPayment: (id: string, payment: Omit<InstallmentPayment, 'id' | 'createdAt'>) => Promise<void>;
  deletePayment: (id: string, paymentId: string) => Promise<void>;
}

export const useInstallmentsStore = create<InstallmentsState>((set, get) => ({
  installments: [],
  loading: true,
  error: null,

  initInstallments: () => {
    const coupleId = useAuthStore.getState().userProfile?.coupleId;
    if (!coupleId) {
      set({ installments: [], loading: false, error: null });
      return () => {};
    }

    const q = query(collection(db, 'installments'), where('coupleId', '==', coupleId));
    return onSnapshot(q, (snap) => {
      const installments = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Installment))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      set({ installments, loading: false, error: null });
    }, (err) => {
      console.error('Installments error:', err);
      const errorCode = (err as { code?: string }).code || 'unknown';
      const detail = errorCode === 'permission-denied'
        ? 'Periksa apakah Firestore Rules sudah dipublikasikan ke project yang dipakai aplikasi dan mengizinkan /installments.'
        : err.message;
      set({ error: `Gagal memuat data cicilan (${errorCode}). ${detail}`, loading: false });
    });
  },

  addInstallment: async ({ title, totalDebt }) => {
    const profile = useAuthStore.getState().userProfile;
    if (!profile?.coupleId) throw new Error('Belum terhubung dengan pasangan');
    await addDoc(collection(db, 'installments'), {
      coupleId: profile.coupleId,
      title: title.trim(),
      totalDebt,
      payments: [],
      createdAt: new Date().toISOString(),
    });
  },

  updateInstallment: async (id, data) => {
    await updateDoc(doc(db, 'installments', id), { title: data.title.trim(), totalDebt: data.totalDebt });
  },

  deleteInstallment: async (id) => {
    await deleteDoc(doc(db, 'installments', id));
  },

  addPayment: async (id, payment) => {
    const installment = get().installments.find(item => item.id === id);
    if (!installment) throw new Error('Cicilan tidak ditemukan');
    const payments = [...(installment.payments || []), {
      ...payment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }].sort((a, b) => a.month.localeCompare(b.month));
    await updateDoc(doc(db, 'installments', id), { payments });
  },

  deletePayment: async (id, paymentId) => {
    const installment = get().installments.find(item => item.id === id);
    if (!installment) return;
    await updateDoc(doc(db, 'installments', id), {
      payments: (installment.payments || []).filter(payment => payment.id !== paymentId),
    });
  },
}));
