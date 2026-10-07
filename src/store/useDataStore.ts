import { create } from 'zustand';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, MonthlyAllocation } from '../types';
import { useAuthStore } from './useAuthStore';

interface DataState {
  transactions: Transaction[];
  allocations: MonthlyAllocation[];
  txLoading: boolean;
  allocationLoading: boolean;
  txError: string | null;
  allocationError: string | null;

  // Listeners
  initTransactions: () => () => void;
  initAllocations: () => () => void;
  clearData: () => void;

  // Actions
  addTransaction: (data: Omit<Transaction, 'id' | 'coupleId' | 'userId' | 'createdAt' | 'addedBy'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id' | 'coupleId' | 'userId' | 'createdAt' | 'addedBy'>>) => Promise<void>;
  
  // Allocation Actions
  addAllocation: (data: Omit<MonthlyAllocation, 'id' | 'coupleId'>) => Promise<void>;
  updateAllocation: (id: string, data: Partial<MonthlyAllocation>) => Promise<void>;
  deleteAllocation: (id: string) => Promise<void>;
}

const getCachedTransactions = (): Transaction[] => {
  try {
    const val = localStorage.getItem('candy-nest:transactions');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
};

const getCachedAllocations = (): MonthlyAllocation[] => {
  try {
    const val = localStorage.getItem('candy-nest:allocations');
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
};

const initialTransactions = getCachedTransactions();
const initialAllocations = getCachedAllocations();

export const useDataStore = create<DataState>((set, get) => ({
  transactions: initialTransactions,
  allocations: initialAllocations,
  txLoading: initialTransactions.length === 0,
  allocationLoading: initialAllocations.length === 0,
  txError: null,
  allocationError: null,

  initTransactions: () => {
    const { transactions, txLoading } = get();
    const userProfile = useAuthStore.getState().userProfile;
    
    if (!userProfile?.coupleId) {
      if (transactions.length > 0 || txLoading) {
        set({ transactions: [], txLoading: false });
      }
      return () => {};
    }

    const q = query(
      collection(db, 'transactions'),
      where('coupleId', '==', userProfile.coupleId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Transaction))
          .sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            const bTime = b.createdAt || '';
            const aTime = a.createdAt || '';
            return bTime.localeCompare(aTime);
          });
        localStorage.setItem('candy-nest:transactions', JSON.stringify(data));
        set({ transactions: data, txLoading: false, txError: null });
      },
      (err) => {
        console.error('Firestore Error:', err);
        set({ txError: 'Gagal memuat data transaksi.', txLoading: false });
      }
    );

    return unsub;
  },


  initAllocations: () => {
    const userProfile = useAuthStore.getState().userProfile;
    if (!userProfile?.coupleId) {
      set({ allocations: [], allocationLoading: false });
      return () => {};
    }

    const q = query(
      collection(db, 'allocations'),
      where('coupleId', '==', userProfile.coupleId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as MonthlyAllocation))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        localStorage.setItem('candy-nest:allocations', JSON.stringify(data));
        set({ allocations: data, allocationLoading: false, allocationError: null });
      },
      (err) => {
        console.error('Firestore Error:', err);
        set({ allocationError: 'Gagal memuat data alokasi.', allocationLoading: false });
      }
    );

    return unsub;
  },

  addTransaction: async (data) => {
    const userProfile = useAuthStore.getState().userProfile;
    if (!userProfile?.coupleId) throw new Error('Belum terhubung dengan pasangan');
    
    await addDoc(collection(db, 'transactions'), {
      ...data,
      userId: userProfile.uid,
      coupleId: userProfile.coupleId,
      addedBy: userProfile.displayName,
      createdAt: new Date().toISOString(),
    });
  },

  deleteTransaction: async (id) => {
    try {
      const txRef = doc(db, 'transactions', id);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) return;

      try {
        await deleteDoc(txRef);
        console.log("Successfully deleted main transaction:", id);
      } catch (err) {
        console.error("Failed to delete main transaction:", err);
        throw err;
      }

    } catch (e) {
      console.error("Error in deleteTransaction:", e);
      throw e;
    }
  },

  updateTransaction: async (id, updatedData) => {
    try {
      const txRef = doc(db, 'transactions', id);
      const txSnap = await getDoc(txRef);
      if (!txSnap.exists()) return;
      const oldTxData = txSnap.data() as Transaction;

      const newAmount = updatedData.amount ?? oldTxData.amount;
      const newType = updatedData.type ?? oldTxData.type;
      const newCategory = updatedData.category ?? oldTxData.category;
      const newDescription = updatedData.description ?? oldTxData.description;
      const newDate = updatedData.date ?? oldTxData.date;
      const newExpenseForUserId = updatedData.expenseForUserId ?? oldTxData.expenseForUserId ?? oldTxData.userId;
      const newExpenseScope = updatedData.expenseScope ?? oldTxData.expenseScope ?? 'personal';

      await updateDoc(txRef, {
        amount: newAmount,
        type: newType,
        category: newCategory,
        description: newDescription,
        date: newDate,
        expenseForUserId: newExpenseForUserId,
        expenseScope: newExpenseScope,
      });
    } catch (e) {
      console.error("Error in updateTransaction:", e);
      throw e;
    }
  },


  addAllocation: async (data) => {
    const userProfile = useAuthStore.getState().userProfile;
    if (!userProfile?.coupleId) throw new Error('Belum terhubung dengan pasangan');
    await addDoc(collection(db, 'allocations'), {
      ...data,
      coupleId: userProfile.coupleId,
    });
  },

  updateAllocation: async (id, data) => {
    await updateDoc(doc(db, 'allocations', id), data);
  },

  deleteAllocation: async (id) => {
    await deleteDoc(doc(db, 'allocations', id));
  },

  clearData: () => {
    localStorage.removeItem('candy-nest:transactions');
    localStorage.removeItem('candy-nest:allocations');
    set({
      transactions: [],
      allocations: [],
      txLoading: true,
      allocationLoading: true,
      txError: null,
      allocationError: null
    });
  }
}));
