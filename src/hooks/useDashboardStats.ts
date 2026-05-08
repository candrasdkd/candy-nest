import { useMemo } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction, getCategoryInfo } from '../types';

export function useDashboardStats(transactions: Transaction[], date: Date = new Date()) {

  // 1. Filter transaksi bulan ini
  const thisMonthTx = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return transactions.filter(tx => {
      try {
        const txDate = parseISO(tx.date);
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });
  }, [transactions, date]);

  // 2. Hitung total pemasukan, pengeluaran, saldo (Hanya bulan ini)
  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    thisMonthTx.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense
    };
  }, [thisMonthTx]);

  // 2.1 Hitung Total Saldo (Seluruh Waktu / Tabungan Kumulatif)
  const allTimeBalance = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      return tx.type === 'income' ? acc + tx.amount : acc - tx.amount;
    }, 0);
  }, [transactions]);

  // 4. Pie chart data pengeluaran per kategori bulan ini
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    thisMonthTx.filter(t => t.type === 'expense').forEach(t => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount;
    });

    return Object.entries(grouped)
      .sort(([, valA], [, valB]) => valB - valA)
      .map(([cat, val]) => {
        const info = getCategoryInfo(cat as any);
        return {
          name: info.label,
          value: val,
          icon: info.icon,
        };
      });
  }, [thisMonthTx]);

  // 5. Transaksi terbaru (5 transaksi)
  const recentTx = useMemo(() => transactions.slice(0, 5), [transactions]);

  return {
    thisMonthTx,
    totalIncome,
    totalExpense,
    balance,
    allTimeBalance,
    pieData,
    recentTx,
  };
}
