import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useDashboardStats } from '../useDashboardStats';
import { Transaction } from '../../types';

describe('useDashboardStats', () => {
  it('seharusnya menghitung total pemasukan, pengeluaran, dan saldo dengan benar untuk bulan yang aktif', () => {
    // Kita kunci tanggal tes di bulan April 2026 supaya hasil tes selalu konsisten (tidak terpengaruh waktu komputer berjalan)
    const mockDate = new Date('2026-04-15T12:00:00Z');
    
    const mockTransactions: Transaction[] = [
      // Transaksi bulan ini (April)
      { id: '1', amount: 5000000, type: 'income', category: 'gaji', date: '2026-04-05', description: 'Gaji Bulanan', addedBy: 'Suami', coupleId: 'c1', userId: 'u1', createdAt: '' },
      { id: '2', amount: 1500000, type: 'expense', category: 'makan', date: '2026-04-10', description: 'Belanja Dapur', addedBy: 'Istri', coupleId: 'c1', userId: 'u2', createdAt: '' },
      
      // Transaksi bulan lalu (Maret) -> Harusnya diabaikan oleh useDashboardStats
      { id: '3', amount: 500000, type: 'expense', category: 'transport', date: '2026-03-25', description: 'Bensin', addedBy: 'Suami', coupleId: 'c1', userId: 'u1', createdAt: '' },
    ];

    const { result } = renderHook(() => useDashboardStats(mockTransactions, mockDate));

    // Ekspektasi
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalExpense).toBe(1500000);
    expect(result.current.balance).toBe(-1500000);
    
    // Pastikan hanya 1 transaksi pengeluaran yang terbaca untuk bulan April
    expect(result.current.thisMonthTx).toHaveLength(1);
  });
});
