import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTransactions } from './useTransactions';
import { useConfirmStore } from '../store/useConfirmStore';
import { useAuthStore } from '../store/useAuthStore';
import { TransactionType, getCategoryInfo } from '../types';

export function useTransactionsPage() {
  const { userProfile } = useAuthStore();
  const { transactions, loading, error, deleteTransaction } = useTransactions();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const filterType = 'expense';
  const setFilterType = (_val?: any) => {};
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const { confirm, close, setLoading: setConfirmLoading } = useConfirmStore();

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (tx.type !== 'expense') return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;

      if (search) {
        const cat = getCategoryInfo(tx.category);
        const q = search.toLowerCase();
        return (
          tx.description?.toLowerCase().includes(q) ||
          cat.label.toLowerCase().includes(q) ||
          tx.addedBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, startDate, endDate, search]);

  const totalIncome = 0;
  
  const totalExpense = useMemo(() => 
    filtered.reduce((s, t) => s + t.amount, 0),
    [filtered]
  );

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(tx => {
      const key = tx.date.substring(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(tx);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const handleDelete = (id: string) => {
    confirm({
      title: 'Hapus Transaksi',
      message: 'Apakah Anda yakin ingin menghapus transaksi ini? Saldo dan statistik akan otomatis diperbarui.',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await deleteTransaction(id);
          close();
        } finally {
          setConfirmLoading(false);
        }
      }
    });
  };

  const resetFilters = () => {
    setSearch('');
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  return {
    userProfile,
    loading,
    error,
    showModal,
    setShowModal,
    search,
    setSearch,
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    totalIncome,
    totalExpense,
    grouped,
    handleDelete,
    resetFilters
  };
}
