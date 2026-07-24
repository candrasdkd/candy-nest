import { useState, useEffect, useRef } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { Category, EXPENSE_CATEGORIES, MAX_AMOUNT, parseRupiah, Transaction } from '../types';
import { format } from 'date-fns';
import { useAuthStore } from '../store/useAuthStore';

export type ExpenseFor = 'self' | 'partner' | 'shared';

export function useTransactionForm(onClose: () => void, transactionToEdit?: Transaction | null) {
  const { addTransaction, updateTransaction } = useTransactions();
  const userProfile = useAuthStore(s => s.userProfile);
  const [amount, setAmount] = useState(transactionToEdit ? (transactionToEdit.amount).toLocaleString('id-ID') : '');
  const [category, setCategory] = useState<Category>(transactionToEdit?.category || 'makan');
  const [description, setDescription] = useState(transactionToEdit?.description || '');
  const [date, setDate] = useState(transactionToEdit?.date || format(new Date(), 'yyyy-MM-dd'));
  const [expenseFor, setExpenseFor] = useState<ExpenseFor>(() => {
    if (transactionToEdit?.expenseScope === 'shared') return 'shared';
    const expenseOwnerId = transactionToEdit?.expenseForUserId || transactionToEdit?.userId;
    return expenseOwnerId && expenseOwnerId !== userProfile?.uid ? 'partner' : 'self';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  const type = 'expense';
  const setType = () => {};
  const selectedPotId = '';
  const setSelectedPotId = () => {};
  const pots: any[] = [];
  const categories = EXPENSE_CATEGORIES;
  const isExpense = true;

  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 400);
  }, []);

  const formatAmount = (val: string) => {
    const num = parseRupiah(val);
    return num ? num.toLocaleString('id-ID') : '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const numAmount = parseRupiah(amount);
    
    if (!numAmount || numAmount <= 0) {
      setError('Masukkan jumlah yang valid');
      return;
    }
    
    if (numAmount > MAX_AMOUNT) {
      setError(`Maksimal transaksi adalah Rp ${MAX_AMOUNT.toLocaleString('id-ID')}`);
      return;
    }

    const expenseForUserId = expenseFor === 'self'
      ? userProfile?.uid
      : expenseFor === 'partner'
        ? userProfile?.partnerUid
        : null;
    if (expenseFor !== 'shared' && !expenseForUserId) {
      setError(expenseFor === 'partner' ? 'Data pasangan belum tersedia' : 'Data pengguna belum tersedia');
      return;
    }

    const expenseOwnership = expenseFor === 'shared'
      ? { expenseScope: 'shared' as const }
      : { expenseScope: 'personal' as const, expenseForUserId: expenseForUserId as string };

    setLoading(true);
    try {
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, {
          type: 'expense',
          category,
          amount: numAmount,
          description: description.trim(),
          date,
          ...expenseOwnership,
        });
      } else {
        await addTransaction({
          type: 'expense',
          category,
          amount: numAmount,
          description: description.trim(),
          date,
          ...expenseOwnership,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setLoading(false);
    }
  };

  return {
    type,
    setType,
    amount,
    setAmount,
    category,
    setCategory,
    description,
    setDescription,
    date,
    setDate,
    expenseFor,
    setExpenseFor,
    partnerName: userProfile?.partnerName || 'Pasangan',
    selectedPotId,
    setSelectedPotId,
    pots,
    loading,
    error,
    setError,
    amountRef,
    categories,
    isExpense,
    formatAmount,
    handleSubmit
  };
}
