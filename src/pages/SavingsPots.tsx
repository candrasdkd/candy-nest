import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  Plus, Wallet, ArrowDownCircle, ArrowUpCircle,
  Shuffle, Trash2, Pencil, X, Loader2, AlertTriangle,
  History, ChevronRight, Sparkles, Target, Calendar, FileText,
  Eye, EyeOff,
} from 'lucide-react';
import { useSavingsPage } from '../hooks/useSavingsPage';
import { useSavingsStore } from '../store/useSavingsStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatRupiah, parseRupiah, POT_COLORS, POT_EMOJIS } from '../types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120 } },
};

export default function SavingsPots() {
  const { userProfile } = useAuthStore();
  const { initPots } = useSavingsStore();

  useEffect(() => {
    const unsub = initPots();
    return unsub;
  }, [initPots, userProfile?.coupleId]);

  const s = useSavingsPage();
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action');

  useEffect(() => {
    if (action === 'add' && !s.potsLoading) {
      if (s.canAddPot) {
        s.openAdd();
      }
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [action, s.potsLoading, s.canAddPot, s.openAdd, searchParams, setSearchParams]);

  if (!userProfile?.coupleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8">
          <Wallet className="w-12 h-12 text-sage-400" />
        </div>
        <h2 className="font-display text-3xl text-sage-900 mb-3">Pos Tabungan</h2>
        <p className="text-sage-500 max-w-sm">Hubungkan akun ke pasangan terlebih dahulu untuk mulai membuat pos tabungan.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-5xl mx-auto pb-32 space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <Sparkles className="w-4 h-4 fill-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Envelope Budgeting</span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl text-sage-900 tracking-tight">Pos Tabungan</h1>
          <p className="text-sage-400 text-sm mt-1 font-medium">Bagi gaji ke pos-pos tujuan hidupmu</p>
        </div>
        <div className="flex gap-3">
          {s.pots.length > 0 && (
            <button onClick={s.openAllocate}
              className="flex items-center gap-2 px-5 py-3.5 bg-white border border-sage-100 text-sage-700 rounded-2xl font-bold text-sm hover:bg-sage-50 transition-all shadow-lg shadow-sage-900/5 active:scale-95">
              <Shuffle className="w-4 h-4" />
              <span className="hidden sm:inline">Alokasi Gaji</span>
            </button>
          )}
          {s.canAddPot && (
            <button onClick={s.openAdd}
              className="flex items-center gap-2 px-6 py-3.5 bg-sage-800 text-white rounded-2xl font-bold text-sm hover:bg-sage-900 transition-all shadow-2xl shadow-sage-900/20 active:scale-95">
              <Plus className="w-4 h-4" />
              Tambah Pos
            </button>
          )}
        </div>
      </motion.div>

      {/* Total Balance Card */}
      {s.pots.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sage-700 via-sage-800 to-sage-900 p-8 md:p-10 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)]">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-[80px]" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-rose-400/20 rounded-full blur-[60px]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-4 w-full mb-1">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.25em]">Total Seluruh Pos</p>
              <button
                type="button"
                onClick={() => s.setHideBalance(!s.hideBalance)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 active:scale-95 text-white/80 hover:text-white"
                title={s.hideBalance ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
              >
                {s.hideBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="font-mono text-4xl md:text-5xl font-black tracking-tighter">{s.hideBalance ? 'Rp ••••••' : formatRupiah(s.totalBalance)}</p>
            <p className="text-white/40 text-xs font-medium mt-2">{s.pots.length} pos aktif</p>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!s.potsLoading && s.pots.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
          <div className="w-24 h-24 bg-sage-50 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner">
            🏺
          </div>
          <div>
            <h3 className="font-display text-2xl text-sage-900 mb-2">Belum ada pos tabungan</h3>
            <p className="text-sage-400 text-sm max-w-xs">Buat pos pertamamu, misalnya: Makan, Self Reward, Darurat, atau Liburan.</p>
          </div>
          <button onClick={s.openAdd}
            className="flex items-center gap-2 px-8 py-4 bg-sage-800 text-white rounded-2xl font-bold hover:bg-sage-900 transition-all shadow-2xl shadow-sage-900/20 active:scale-95">
            <Plus className="w-5 h-5" /> Buat Pos Pertama
          </button>
        </motion.div>
      )}

      {/* Pot Cards Grid */}
      {s.potsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-52 rounded-[2.5rem] bg-sage-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {s.pots.map(pot => {
            const progress = pot.targetAmount && pot.targetAmount > 0
              ? Math.min(100, (pot.currentBalance / pot.targetAmount) * 100) : null;
            return (
              <motion.div key={pot.id} variants={item}
                className="group relative rounded-[2.5rem] bg-white border border-sage-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between overflow-hidden">
                
                {/* Dynamic Header Background */}
                <div className="absolute top-0 left-0 right-0 h-32 opacity-[0.15] transition-opacity duration-500 group-hover:opacity-25"
                  style={{ background: `linear-gradient(to bottom, ${pot.color}, transparent)` }} />
                
                {/* Large Background Emoji */}
                <div className="absolute -right-4 -bottom-4 text-9xl opacity-5 rotate-[-15deg] pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:-rotate-[25deg]">
                  {pot.emoji}
                </div>

                <div className="relative p-7 flex-1 flex flex-col gap-6">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-2xl shadow-sm bg-white/80 backdrop-blur-md border border-white ring-1 ring-black/5"
                        style={{ color: pot.color }}>
                        {pot.emoji}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sage-900 text-xl tracking-tight leading-none mb-1.5">{pot.name}</h3>
                        {pot.targetAmount ? (
                          <p className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">
                            Target {formatRupiah(pot.targetAmount)}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold text-sage-400 uppercase tracking-widest">Tanpa Target</p>
                        )}
                      </div>
                    </div>
                    {/* Context Menu / Actions (Always visible for mobile UX) */}
                    <div className="flex gap-1 bg-white/80 backdrop-blur-md rounded-xl p-1 shadow-sm ring-1 ring-black/5">
                      <button onClick={() => s.openEdit(pot.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-sage-400 hover:text-sage-700 hover:bg-sage-50 transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => s.openDeleteConfirm(pot.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balance & Progress */}
                  <div className="mt-auto space-y-5 pt-2">
                    <div>
                      <p className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1.5">Total Terkumpul</p>
                      <p className="font-mono text-4xl font-black text-sage-900 tracking-tighter">{formatRupiah(pot.currentBalance)}</p>
                    </div>

                    {progress !== null && (
                      <div className="space-y-2">
                        <div className="h-2.5 bg-sage-100/50 rounded-full overflow-hidden ring-1 ring-inset ring-black/5">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                            className="h-full rounded-full relative" 
                            style={{ backgroundColor: pot.color }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-sage-500">
                          <span>{progress.toFixed(0)}%</span>
                          <span>Sisa {formatRupiah(Math.max(0, pot.targetAmount! - pot.currentBalance))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="relative p-2 mx-5 mb-5 bg-sage-50/50 rounded-2xl flex gap-2">
                  <button onClick={() => s.openDeposit(pot.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: pot.color }}>
                    <ArrowDownCircle className="w-4 h-4" /> Masuk
                  </button>
                  <button onClick={() => s.openWithdraw(pot.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs bg-white text-sage-700 shadow-sm ring-1 ring-sage-200/50 hover:bg-sage-50 transition-all active:scale-95">
                    <ArrowUpCircle className="w-4 h-4" /> Pakai
                  </button>
                  <button onClick={() => s.openHistory(pot.id)}
                    className="w-12 flex items-center justify-center rounded-xl bg-white text-sage-400 shadow-sm ring-1 ring-sage-200/50 hover:bg-sage-50 hover:text-sage-700 transition-all active:scale-95">
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {/* Add / Edit Pot */}
        {(s.modal.type === 'add_pot' || s.modal.type === 'edit_pot') && (
          <BottomSheet onClose={s.closeModal} title={s.modal.type === 'add_pot' ? 'Buat Pos Baru' : 'Edit Pos'}>
            <div className="space-y-5">
              {/* Emoji picker */}
              <div>
                <label className="label-xs">Pilih Emoji</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {POT_EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => s.setPotEmoji(e)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${s.potEmoji === e ? 'bg-sage-100 ring-2 ring-sage-400 scale-110' : 'bg-sage-50 hover:bg-sage-100'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="label-xs">Pilih Warna</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {POT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => s.setPotColor(c)}
                      className={`w-8 h-8 rounded-xl transition-all ${s.potColor === c ? 'ring-2 ring-offset-2 ring-sage-700 scale-110' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="label-xs">Nama Pos</label>
                <input value={s.potName} onChange={e => s.setPotName(e.target.value)} placeholder="Misal: Makan, Self Reward…"
                  className="input-field mt-1" />
              </div>
              <div>
                <label className="label-xs">Target (opsional)</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400 font-bold text-sm">Rp</span>
                  <input value={s.potTarget} onChange={e => s.setPotTarget(s.formatAmount(e.target.value))}
                    inputMode="numeric" placeholder="0" className="input-field pl-10" />
                </div>
              </div>

              {s.error && <ErrorBox msg={s.error} />}

              <button onClick={s.handleSavePot} disabled={s.submitting} className="btn-primary w-full">
                {s.submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Pos'}
              </button>
            </div>
          </BottomSheet>
        )}

        {/* Deposit / Withdraw */}
        {(s.modal.type === 'deposit' || s.modal.type === 'withdraw') && s.selectedPot && (
          <BottomSheet onClose={s.closeModal}
            title={s.modal.type === 'deposit' ? `Masukkan ke ${s.selectedPot.name}` : `Pakai dari ${s.selectedPot.name}`}>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-sage-50">
                <span className="text-3xl">{s.selectedPot.emoji}</span>
                <div>
                  <p className="font-bold text-sage-900">{s.selectedPot.name}</p>
                  <p className="text-sm text-sage-400">Saldo: {formatRupiah(s.selectedPot.currentBalance)}</p>
                </div>
              </div>

              <div>
                <label className="label-xs">Jumlah</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-400 font-bold">Rp</span>
                  <input value={s.moveAmount} onChange={e => s.setMoveAmount(s.formatAmount(e.target.value))}
                    inputMode="numeric" placeholder="0"
                    className="input-field pl-10 text-center font-mono text-xl font-black" />
                </div>
              </div>
              <div>
                <label className="label-xs flex items-center gap-1"><FileText className="w-3 h-3" /> Keterangan</label>
                <input value={s.moveNote} onChange={e => s.setMoveNote(e.target.value)}
                  placeholder="Misal: Gajian, Makan siang…" className="input-field mt-1" />
              </div>
              <div>
                <label className="label-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal</label>
                <input type="date" value={s.moveDate} onChange={e => s.setMoveDate(e.target.value)} className="input-field mt-1" />
              </div>

              {s.error && <ErrorBox msg={s.error} />}

              <button onClick={s.handleMove} disabled={s.submitting}
                className={`w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-widest transition-all shadow-xl ${s.submitting ? 'opacity-50' : 'hover:scale-[1.02] active:scale-95'} ${s.modal.type === 'deposit' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
                {s.submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> :
                  s.modal.type === 'deposit' ? 'Masukkan' : 'Pakai'}
              </button>
            </div>
          </BottomSheet>
        )}

        {/* Allocate Income Wizard */}
        {s.modal.type === 'allocate' && (
          <BottomSheet onClose={s.closeModal} title="Alokasi Gaji">
            <div className="space-y-5">
              <p className="text-sm text-sage-400">Masukkan nominal yang ingin dialokasikan ke setiap pos.</p>

              <div>
                <label className="label-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal</label>
                <input type="date" value={s.moveDate} onChange={e => s.setMoveDate(e.target.value)} className="input-field mt-1" />
              </div>
              <div>
                <label className="label-xs">Keterangan</label>
                <input value={s.allocNote} onChange={e => s.setAllocNote(e.target.value)} className="input-field mt-1" />
              </div>

              <div className="space-y-3">
                {s.pots.map(pot => (
                  <div key={pot.id} className="flex items-center gap-3 p-3 rounded-2xl bg-sage-50 border border-sage-100">
                    <span className="text-2xl">{pot.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sage-900 text-sm truncate">{pot.name}</p>
                      <p className="text-[10px] text-sage-400">Saldo: {formatRupiah(pot.currentBalance)}</p>
                    </div>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 text-xs font-bold">Rp</span>
                      <input
                        value={s.allocations[pot.id] || ''}
                        onChange={e => s.setAllocations(prev => ({ ...prev, [pot.id]: s.formatAmount(e.target.value) }))}
                        inputMode="numeric" placeholder="0"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-sage-200 rounded-xl text-sage-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-sage-400/20 text-right"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 rounded-2xl bg-sage-900 text-white">
                <span className="text-sm font-bold">Total Dialokasikan</span>
                <span className="font-mono font-black">{formatRupiah(s.totalAllocated)}</span>
              </div>

              {s.error && <ErrorBox msg={s.error} />}

              <button onClick={s.handleAllocate} disabled={s.submitting} className="btn-primary w-full">
                {s.submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Alokasikan Sekarang'}
              </button>
            </div>
          </BottomSheet>
        )}

        {/* History / Expense Checker by Pot & Date Range */}
        {s.modal.type === 'history' && s.selectedPot && (
          <BottomSheet onClose={s.closeModal} title="Cek & Analisis Pos">
            <div className="space-y-5">
              
              {/* Pot Selector Dropdown */}
              <div>
                <label className="label-xs flex items-center gap-1.5 mb-1.5">
                  <Wallet className="w-3 h-3 text-sage-500" />
                  Pilih Pos Tabungan
                </label>
                <div className="relative">
                  <select
                    value={s.selectedPot.id}
                    onChange={(e) => s.changeHistoryPotId(e.target.value)}
                    className="w-full px-4 py-3 bg-sage-50/50 border border-sage-100 rounded-2xl text-sm font-bold text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-400/20 appearance-none cursor-pointer"
                  >
                    {s.pots.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name} (Saldo: {formatRupiah(p.currentBalance)})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-sage-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* Date Range Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-sage-400" />
                    Mulai Tanggal
                  </label>
                  <input
                    type="date"
                    value={s.historyStartDate}
                    onChange={(e) => s.setHistoryStartDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full px-3 py-2.5 bg-sage-50/50 border border-sage-100 rounded-xl text-xs font-bold text-sage-700 focus:outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="label-xs flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-sage-400" />
                    Akhir Tanggal
                  </label>
                  <input
                    type="date"
                    value={s.historyEndDate}
                    onChange={(e) => s.setHistoryEndDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="w-full px-3 py-2.5 bg-sage-50/50 border border-sage-100 rounded-xl text-xs font-bold text-sage-700 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Clear Filter if dates are filled */}
              {(s.historyStartDate || s.historyEndDate) && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      s.setHistoryStartDate('');
                      s.setHistoryEndDate('');
                    }}
                    className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg hover:bg-rose-100 transition-all flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Bersihkan Filter
                  </button>
                </div>
              )}

              {/* Statistics Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 text-center">
                  <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 block mb-0.5">Total Masuk</span>
                  <span className="font-mono text-sm font-black text-emerald-700 block truncate">
                    {formatRupiah(s.historyTotalIncome)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100/50 text-center">
                  <span className="text-[8px] font-black uppercase tracking-wider text-rose-500 block mb-0.5">Total Pengeluaran</span>
                  <span className="font-mono text-sm font-black text-rose-600 block truncate">
                    {formatRupiah(s.historyTotalExpense)}
                  </span>
                </div>
              </div>

              {/* Scrollable Transaction List */}
              <div className="space-y-2.5 max-h-[35vh] overflow-y-auto scrollbar-hide pr-1 border-t border-sage-50 pt-3">
                {s.error && <ErrorBox msg={s.error} />}
                {s.filteredHistory.length === 0 ? (
                  <div className="text-center py-10 text-sage-300">
                    <History className="w-8 h-8 mx-auto mb-2 text-sage-200" />
                    <p className="text-xs font-semibold">Tidak ada riwayat untuk periode ini</p>
                  </div>
                ) : (
                  s.filteredHistory.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-sage-50 border border-sage-100/50 hover:bg-sage-100/30 transition-all">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'deposit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                        {tx.type === 'deposit' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sage-900 text-xs truncate">{tx.note || (tx.type === 'deposit' ? 'Deposit' : 'Penarikan')}</p>
                        <p className="text-[9px] text-sage-400 font-medium">
                          {format(new Date(tx.date || tx.createdAt), 'dd MMM yyyy', { locale: localeId })} · {tx.addedBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className={`font-mono font-black text-xs flex-shrink-0 ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatRupiah(tx.amount)}
                        </span>
                        <button
                          onClick={() => s.handleDeleteHistory(tx.id)}
                          className="p-1.5 rounded-lg text-sage-400 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                          title="Hapus riwayat pos"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </BottomSheet>
        )}

        {/* Delete Confirmation */}
        {s.modal.type === 'delete_confirm' && s.selectedPot && (
          <BottomSheet onClose={s.closeModal} title="Hapus Pos">
            <div className="space-y-6 text-center pt-2">
              <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-display text-xl text-sage-900">Hapus Pos "{s.selectedPot.name}"?</h3>
                <p className="text-sage-500 text-sm mt-2">
                  Saldo <b>{formatRupiah(s.selectedPot.currentBalance)}</b> beserta seluruh riwayat masuk-keluar akan dihapus secara permanen dari sistem.
                </p>
              </div>
              
              {s.error && <ErrorBox msg={s.error} />}

              <div className="flex gap-3">
                <button onClick={s.closeModal} disabled={s.submitting}
                  className="flex-1 py-4 bg-sage-50 text-sage-600 font-bold rounded-2xl hover:bg-sage-100 transition-all">
                  Batal
                </button>
                <button onClick={s.handleDeletePot} disabled={s.submitting}
                  className="flex-1 py-4 bg-rose-500 text-white font-bold rounded-2xl hover:bg-rose-600 transition-all shadow-xl shadow-rose-500/20 flex items-center justify-center">
                  {s.submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sub-components ── */

function BottomSheet({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-sage-950/80" onClick={onClose} />
      <motion.div
        initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
        className="relative bg-white w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-sage-50 flex-shrink-0">
          <div className="flex items-center gap-2 text-rose-400">
            <Sparkles className="w-3 h-3 fill-rose-400" />
            <h2 className="font-display text-xl text-sage-900 tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 pb-10 sm:pb-6 scrollbar-hide">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {msg}
    </div>
  );
}
