import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransactionForm } from '../useTransactionForm';

const mocks = vi.hoisted(() => ({
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
}));

vi.mock('../useTransactions', () => ({
  useTransactions: () => ({
    addTransaction: mocks.addTransaction,
    updateTransaction: mocks.updateTransaction,
  }),
}));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector({
    userProfile: {
      uid: 'u1',
      partnerUid: 'u2',
      partnerName: 'Partner',
    },
  }),
}));

describe('useTransactionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addTransaction.mockResolvedValue(undefined);
    mocks.updateTransaction.mockResolvedValue(undefined);
  });

  it('menyimpan UID pasangan saat pengeluaran ditujukan untuk pasangan', async () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useTransactionForm(onClose));

    act(() => {
      result.current.setAmount('125.000');
      result.current.setDescription('  Makan malam  ');
      result.current.setExpenseFor('partner');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mocks.addTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amount: 125000,
      description: 'Makan malam',
      expenseForUserId: 'u2',
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('membaca transaksi lama milik pencatat sebagai pengeluaran pasangan', () => {
    const { result } = renderHook(() => useTransactionForm(vi.fn(), {
      id: 'tx-1',
      userId: 'u2',
      coupleId: 'c1',
      type: 'expense',
      category: 'makan',
      amount: 50000,
      description: '',
      date: '2026-07-24',
      createdAt: '',
      addedBy: 'Partner',
    }));

    expect(result.current.expenseFor).toBe('partner');
  });

  it('menyimpan pengeluaran bersama tanpa UID pemilik individual', async () => {
    const { result } = renderHook(() => useTransactionForm(vi.fn()));

    act(() => {
      result.current.setAmount('75.000');
      result.current.setExpenseFor('shared');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(mocks.addTransaction).toHaveBeenCalledWith(expect.objectContaining({
      amount: 75000,
      expenseScope: 'shared',
    }));
    expect(mocks.addTransaction.mock.calls[0][0]).not.toHaveProperty('expenseForUserId');
  });
});
