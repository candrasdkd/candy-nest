import { useState, useMemo } from 'react';
import { useSavingsStore } from '../store/useSavingsStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { parseRupiah, POT_COLORS, POT_EMOJIS, MAX_POTS } from '../types';

export type ModalMode =
  | { type: 'none' }
  | { type: 'add_pot' }
  | { type: 'edit_pot'; potId: string }
  | { type: 'deposit'; potId: string }
  | { type: 'withdraw'; potId: string }
  | { type: 'allocate' }
  | { type: 'history'; potId: string }
  | { type: 'delete_confirm'; potId: string };

export function useSavingsPage() {
  const { confirm, close, setLoading: setConfirmLoading } = useConfirmStore();
  const { pots, potTransactions, potsLoading, addPot, updatePot, deletePot, depositToPot, withdrawFromPot, allocateIncome, deletePotTransaction } = useSavingsStore();

  const [modal, setModal] = useState<ModalMode>({ type: 'none' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state – pot upsert
  const [potName, setPotName] = useState('');
  const [potEmoji, setPotEmoji] = useState(POT_EMOJIS[0]);
  const [potColor, setPotColor] = useState(POT_COLORS[0]);
  const [potTarget, setPotTarget] = useState('');

  // Form state – money movement
  const [moveAmount, setMoveAmount] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [moveDate, setMoveDate] = useState(new Date().toISOString().slice(0, 10));

  // Form state – allocation wizard
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [allocNote, setAllocNote] = useState('Alokasi Gaji');

  const totalBalance = useMemo(() => pots.reduce((s, p) => s + p.currentBalance, 0), [pots]);

  const selectedPot = useMemo(() => {
    if (['edit_pot', 'deposit', 'withdraw', 'history', 'delete_confirm'].includes(modal.type)) {
      return pots.find(p => p.id === (modal as any).potId) || null;
    }
    return null;
  }, [modal, pots]);

  const potHistory = useMemo(() => {
    if (modal.type !== 'history' || !modal.potId) return [];
    return potTransactions.filter(tx => tx.potId === modal.potId);
  }, [modal, potTransactions]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((s, v) => s + parseRupiah(v), 0);
  }, [allocations]);

  function openAdd() {
    setPotName('');
    setPotEmoji(POT_EMOJIS[pots.length % POT_EMOJIS.length]);
    setPotColor(POT_COLORS[pots.length % POT_COLORS.length]);
    setPotTarget('');
    setError('');
    setModal({ type: 'add_pot' });
  }

  function openEdit(potId: string) {
    const pot = pots.find(p => p.id === potId);
    if (!pot) return;
    setPotName(pot.name);
    setPotEmoji(pot.emoji);
    setPotColor(pot.color);
    setPotTarget(pot.targetAmount ? String(pot.targetAmount) : '');
    setError('');
    setModal({ type: 'edit_pot', potId });
  }

  function openDeposit(potId: string) {
    setMoveAmount('');
    setMoveNote('');
    setMoveDate(new Date().toISOString().slice(0, 10));
    setError('');
    setModal({ type: 'deposit', potId });
  }

  function openWithdraw(potId: string) {
    setMoveAmount('');
    setMoveNote('');
    setMoveDate(new Date().toISOString().slice(0, 10));
    setError('');
    setModal({ type: 'withdraw', potId });
  }

  function openAllocate() {
    const init: Record<string, string> = {};
    pots.forEach(p => { init[p.id] = ''; });
    setAllocations(init);
    setAllocNote('Alokasi Gaji');
    setMoveDate(new Date().toISOString().slice(0, 10));
    setError('');
    setModal({ type: 'allocate' });
  }

  function openHistory(potId: string) {
    setModal({ type: 'history', potId });
  }

  function openDeleteConfirm(potId: string) {
    setModal({ type: 'delete_confirm', potId });
  }

  function closeModal() {
    setModal({ type: 'none' });
    setError('');
  }

  function formatAmount(raw: string) {
    const nums = raw.replace(/\D/g, '');
    if (!nums) return '';
    return Number(nums).toLocaleString('id-ID');
  }

  async function handleSavePot() {
    if (!potName.trim()) { setError('Nama pos tidak boleh kosong'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (modal.type === 'add_pot') {
        await addPot({
          name: potName,
          emoji: potEmoji,
          color: potColor,
          targetAmount: potTarget ? parseRupiah(potTarget) : null,
        });
      } else if (modal.type === 'edit_pot') {
        await updatePot(modal.potId, {
          name: potName,
          emoji: potEmoji,
          color: potColor,
          targetAmount: potTarget ? parseRupiah(potTarget) : null,
        });
      }
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMove() {
    const amount = parseRupiah(moveAmount);
    if (!amount || amount <= 0) { setError('Masukkan jumlah yang valid'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (modal.type === 'deposit') {
        await depositToPot(modal.potId, amount, moveNote, moveDate);
      } else if (modal.type === 'withdraw') {
        await withdrawFromPot(modal.potId, amount, moveNote, moveDate);
      }
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAllocate() {
    const entries = Object.entries(allocations)
      .map(([potId, v]) => ({ potId, amount: parseRupiah(v) }))
      .filter(e => e.amount > 0);

    if (entries.length === 0) { setError('Masukkan minimal satu alokasi'); return; }
    setSubmitting(true);
    setError('');
    try {
      await allocateIncome(entries, allocNote, moveDate);
      closeModal();
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePot() {
    if (modal.type !== 'delete_confirm') return;
    setSubmitting(true);
    try {
      await deletePot(modal.potId);
      closeModal();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleDeleteHistory = (potTxId: string) => {
    confirm({
      title: 'Hapus Riwayat Pos',
      message: 'Apakah Anda yakin ingin menghapus riwayat transaksi pos ini? Saldo pos dan transaksi utama terkait akan otomatis diperbarui.',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await deletePotTransaction(potTxId);
          close();
        } catch (e: any) {
          console.error("Gagal menghapus riwayat pos:", e);
          setError(e.message || 'Gagal menghapus riwayat');
        } finally {
          setConfirmLoading(false);
        }
      }
    });
  };

  return {
    // data
    pots,
    potTransactions,
    potsLoading,
    totalBalance,
    selectedPot,
    potHistory,
    totalAllocated,
    canAddPot: pots.length < MAX_POTS,
    // modal state
    modal,
    error,
    submitting,
    // pot form
    potName, setPotName,
    potEmoji, setPotEmoji,
    potColor, setPotColor,
    potTarget, setPotTarget,
    // move form
    moveAmount, setMoveAmount,
    moveNote, setMoveNote,
    moveDate, setMoveDate,
    // allocation form
    allocations, setAllocations,
    allocNote, setAllocNote,
    // helpers
    formatAmount,
    // handlers
    openAdd, openEdit, openDeposit, openWithdraw, openAllocate, openHistory, openDeleteConfirm, closeModal,
    handleSavePot, handleMove, handleAllocate, handleDeletePot, handleDeleteHistory,
  };
}
