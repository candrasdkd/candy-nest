import { useMemo, useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction, getCategoryInfo, formatRupiah } from '../types';

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

  // 4. Pie chart data pengeluaran per kategori bulan ini
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    thisMonthTx.forEach(t => {
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
    balance: -totalExpense,
    allTimeBalance: 0,
    pieData,
    recentTx,
    hideBalance,
    setHideBalance,
    handleShareStats,
  };
}
