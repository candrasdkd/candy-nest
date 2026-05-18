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
  getDocs,
  writeBatch,
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

export const useDataStore = create<DataState>((set, get) => ({
  transactions: [],
  allocations: [],
  txLoading: true,
  allocationLoading: true,
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
      const txData = txSnap.data() as Transaction;

      // 1. Delete main transaction
      try {
        await deleteDoc(txRef);
        console.log("Successfully deleted main transaction:", id);
      } catch (err) {
        console.error("Failed to delete main transaction:", err);
        throw err;
      }

      // 2. If there is a related pot, handle it
      if (txData.relatedPotId) {
        const userProfile = useAuthStore.getState().userProfile;
        if (!userProfile?.coupleId) throw new Error('Belum terhubung dengan pasangan');

        // Find matching pot transaction by potId and coupleId to satisfy Firestore rules
        const potTxsQ = query(
          collection(db, 'potTransactions'),
          where('coupleId', '==', userProfile.coupleId),
          where('potId', '==', txData.relatedPotId)
        );
        const potTxsSnap = await getDocs(potTxsQ);
        
        let targetPotTxRef: any = null;
        if (!potTxsSnap.empty) {
          // Filter in client-side JS
          const matchingDocs = potTxsSnap.docs.filter(doc => {
            const potTxData = doc.data();
            const matchesAmount = potTxData.amount === txData.amount;
            const matchesDate = potTxData.date === txData.date;
            const expectedType = txData.type === 'income' ? 'deposit' : 'withdraw';
            const matchesType = potTxData.type === expectedType;
            return matchesAmount && matchesDate && matchesType;
          });

          if (matchingDocs.length === 1) {
            targetPotTxRef = matchingDocs[0].ref;
          } else if (matchingDocs.length > 1) {
            // If multiple match, match by note in description
            const desc = txData.description || '';
            targetPotTxRef = matchingDocs.find(doc => {
              const potTxData = doc.data();
              const potTxNote = potTxData.note || '';
              return desc.endsWith(potTxNote);
            })?.ref || matchingDocs[0].ref;
          }
        }

        if (targetPotTxRef) {
          try {
            await deleteDoc(targetPotTxRef);
            console.log("Successfully deleted related pot transaction:", targetPotTxRef.id);
          } catch (err) {
            // Gracefully catch permission error if the pot transaction belongs to partner and user lacks rule rights to delete it
            console.warn("Could not delete associated pot transaction (permission denied or not found):", err);
          }
        }

        // Update pot balance
        const potRef = doc(db, 'savingsPots', txData.relatedPotId);
        const potSnap = await getDoc(potRef);
        if (potSnap.exists()) {
          const potData = potSnap.data();
          const diff = txData.type === 'income' ? -txData.amount : txData.amount;
          try {
            await updateDoc(potRef, {
              currentBalance: (potData.currentBalance || 0) + diff
            });
            console.log("Successfully updated pot balance for:", txData.relatedPotId);
          } catch (err) {
            console.error("Failed to update pot balance:", err);
          }
        }
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

      // 1. Update the main transaction document
      await updateDoc(txRef, {
        amount: newAmount,
        type: newType,
        category: newCategory,
        description: newDescription,
        date: newDate,
      });

      // 2. Handle related pot transaction if exists
      if (oldTxData.relatedPotId) {
        const userProfile = useAuthStore.getState().userProfile;
        if (userProfile?.coupleId) {
          // Find matching pot transaction
          const potTxsQ = query(
            collection(db, 'potTransactions'),
            where('coupleId', '==', userProfile.coupleId),
            where('potId', '==', oldTxData.relatedPotId)
          );
          const potTxsSnap = await getDocs(potTxsQ);
          
          let targetPotTxRef: any = null;
          let oldPotTxData: any = null;
          if (!potTxsSnap.empty) {
            const matchingDocs = potTxsSnap.docs.filter(doc => {
              const potTxData = doc.data();
              const matchesAmount = potTxData.amount === oldTxData.amount;
              const matchesDate = potTxData.date === oldTxData.date;
              const expectedType = oldTxData.type === 'income' ? 'deposit' : 'withdraw';
              const matchesType = potTxData.type === expectedType;
              return matchesAmount && matchesDate && matchesType;
            });

            if (matchingDocs.length > 0) {
              targetPotTxRef = matchingDocs[0].ref;
              oldPotTxData = matchingDocs[0].data();
            }
          }

          if (targetPotTxRef && oldPotTxData) {
            // Update pot transaction
            const expectedNewPotType = newType === 'income' ? 'deposit' : 'withdraw';
            await updateDoc(targetPotTxRef, {
              amount: newAmount,
              type: expectedNewPotType,
              note: newDescription,
              date: newDate,
            });

            // Adjust pot balance
            const potRef = doc(db, 'savingsPots', oldTxData.relatedPotId);
            const potSnap = await getDoc(potRef);
            if (potSnap.exists()) {
              const potData = potSnap.data();
              const currentBal = potData.currentBalance || 0;
              
              // First, revert the old pot transaction effect on balance
              let revertedBalance = currentBal;
              if (oldPotTxData.type === 'deposit') {
                revertedBalance -= oldPotTxData.amount;
              } else {
                revertedBalance += oldPotTxData.amount;
              }

              // Second, apply the new pot transaction effect
              let finalBalance = revertedBalance;
              if (expectedNewPotType === 'deposit') {
                finalBalance += newAmount;
              } else {
                finalBalance -= newAmount;
              }

              await updateDoc(potRef, {
                currentBalance: finalBalance
              });
            }
          }
        }
      }
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
