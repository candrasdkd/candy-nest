import { useMemo, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction, getCategoryInfo, getExpenseOwnerId, isSharedExpense, formatRupiah } from '../types';

export function useDashboardStats(transactions: Transaction[], date: Date = new Date()) {
  const [hideBalance, setHideBalance] = useState(true);

  // Hapus badge notifikasi saat user membuka Dashboard
  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }, []);

  // 1. Filter transaksi pengeluaran bulan ini
  const thisMonthTx = useMemo(() => {
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    return transactions.filter(tx => {
      if (tx.type !== 'expense') return false;
      try {
        const txDate = parseISO(tx.date);
        return isWithinInterval(txDate, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });
  }, [transactions, date]);

  // 2. Hitung total pengeluaran (Hanya bulan ini)
  const totalExpense = useMemo(() => {
    return thisMonthTx.reduce((sum, tx) => sum + tx.amount, 0);
  }, [thisMonthTx]);

  // 3. Hitung pengeluaran per anggota pasangan
  const expenseByUser = useMemo(() => {
    return thisMonthTx.reduce<Record<string, number>>((totals, tx) => {
      const ownerId = getExpenseOwnerId(tx);
      if (!ownerId) return totals;
      totals[ownerId] = (totals[ownerId] || 0) + tx.amount;
      return totals;
    }, {});
  }, [thisMonthTx]);

  const sharedExpense = useMemo(() => {
    return thisMonthTx.reduce((total, tx) => (
      isSharedExpense(tx) ? total + tx.amount : total
    ), 0);
  }, [thisMonthTx]);

  // 4. Breakdown kategori, termasuk pemilik pengeluarannya
  const categoryBreakdown = useMemo(() => {
    const grouped: Record<string, {
      value: number;
      expenseByUser: Record<string, number>;
      sharedValue: number;
    }> = {};

    thisMonthTx.forEach(tx => {
      if (!grouped[tx.category]) {
        grouped[tx.category] = { value: 0, expenseByUser: {}, sharedValue: 0 };
      }

      const category = grouped[tx.category];
      category.value += tx.amount;

      if (isSharedExpense(tx)) {
        category.sharedValue += tx.amount;
        return;
      }

      const ownerId = getExpenseOwnerId(tx);
      if (ownerId) {
        category.expenseByUser[ownerId] = (category.expenseByUser[ownerId] || 0) + tx.amount;
      }
    });

    return Object.entries(grouped)
      .sort(([, dataA], [, dataB]) => dataB.value - dataA.value)
      .map(([cat, data]) => {
        const info = getCategoryInfo(cat as any);
        return {
          category: cat,
          name: info.label,
          value: data.value,
          icon: info.icon,
          expenseByUser: data.expenseByUser,
          sharedValue: data.sharedValue,
        };
      });
  }, [thisMonthTx]);

  const pieData = useMemo(() => (
    categoryBreakdown.map(({ name, value, icon }) => ({ name, value, icon }))
  ), [categoryBreakdown]);

  // 5. Transaksi terbaru (5 transaksi) - Hanya ambil pengeluaran
  const recentTx = useMemo(() => {
    return transactions.filter(t => t.type === 'expense').slice(0, 5);
  }, [transactions]);

  // 6. Fungsi untuk membagikan laporan
  const handleShareStats = async () => {
    const text = `📊 Laporan Keuangan CandyNest (${format(date, 'MMMM yyyy', { locale: id })})\n\n` +
      `💸 Pengeluaran: ${formatRupiah(totalExpense)}\n\n` +
      `Ayo tetap hemat dan raih impian keluarga! ❤️`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Laporan CandyNest',
          text: text,
          url: window.location.origin,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text);
      alert('Laporan disalin ke clipboard!');
    }
  };

  return {
    thisMonthTx,
    totalIncome: 0,
    totalExpense,
    expenseByUser,
    sharedExpense,
    balance: -totalExpense,
    allTimeBalance: 0,
    pieData,
    categoryBreakdown,
    recentTx,
    hideBalance,
    setHideBalance,
    handleShareStats,
  };
}
