import { X, TrendingUp, TrendingDown, AlertTriangle, Loader2, Calendar, Type, Sparkles, Wallet } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { TransactionType, Transaction } from '../types';

const containerVariants: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: 'tween', 
      duration: 0.2,
      ease: 'easeOut',
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: { 
    y: '100%', 
    opacity: 0,
    transition: { type: 'tween', ease: 'easeIn', duration: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

interface Props {
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

export default function TransactionModal({ onClose, transactionToEdit }: Props) {
  const {
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
    loading,
    error,
    amountRef,
    categories,
    isExpense,
    formatAmount,
    selectedPotId,
    setSelectedPotId,
    pots,
    handleSubmit
  } = useTransactionForm(onClose, transactionToEdit);

  const theme = isExpense 
    ? {
        accent: 'rose',
        bg: 'bg-rose-500',
        text: 'text-rose-500',
        light: 'bg-rose-50',
        border: 'border-rose-100',
        shadow: 'shadow-rose-500/20'
      }
    : {
        accent: 'emerald',
        bg: 'bg-emerald-600',
        text: 'text-emerald-600',
        light: 'bg-emerald-50',
        border: 'border-emerald-100',
        shadow: 'shadow-emerald-500/20'
      };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-sage-950/80"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ willChange: 'transform, opacity' }}
        className="relative bg-white w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] sm:shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-white/20 mb-safe-offset-bottom"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header & Amount (Sticky at top) */}
          <div className="flex-shrink-0 px-6 pt-6 pb-4 space-y-4 bg-white border-b border-sage-50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-rose-400">
                  <Sparkles className="w-3 h-3 fill-rose-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em]">
                    {transactionToEdit ? 'Edit Transaksi' : 'Transaksi Baru'}
                  </span>
                </div>
                <h2 className="font-display text-2xl text-sage-900 tracking-tight leading-none">
                  {transactionToEdit ? 'Ubah Keuangan' : 'Catat Keuangan'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Toggle */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-sage-50 rounded-[1.2rem] border border-sage-100">
              {[
                { val: 'expense', label: 'Keluar', icon: TrendingDown, color: 'text-rose-500' },
                { val: 'income', label: 'Masuk', icon: TrendingUp, color: 'text-emerald-600' },
              ].map(({ val, label, icon: Icon, color }) => (
                <button
                  key={val}
                  type="button"
                  disabled={loading}
                  onClick={() => { setType(val as TransactionType); setCategory(val === 'expense' ? 'makan' : 'gaji'); }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${type === val ? `bg-white shadow-md ${color}` : 'text-sage-400 hover:text-sage-600'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Amount Input (Mandatory & Sticky) */}
            <div className={`rounded-2xl p-4 ${theme.light} border border-theme-border transition-colors duration-500`}>
              <div className="flex items-center justify-center gap-2">
                <span className={`font-mono font-black text-lg ${theme.text} opacity-40`}>Rp</span>
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  disabled={loading}
                  onChange={e => setAmount(formatAmount(e.target.value))}
                  placeholder="0"
                  required
                  className={`bg-transparent font-mono text-3xl font-black text-sage-900 focus:outline-none placeholder-sage-200 text-center w-full tracking-tighter`}
                />
              </div>
            </div>
          </div>

          {/* Scrollable Content (Categories & Details) */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-rose-600 text-[10px] font-bold uppercase tracking-widest bg-rose-50 border border-rose-100 p-4 rounded-xl shadow-lg"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Grid */}
            <div className="space-y-3">
              <label className="block text-[9px] font-bold text-sage-400 uppercase tracking-widest px-1">Pilih Kategori</label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const active = category === cat.value;
                  return (
                    <button key={cat.value} type="button" disabled={loading} onClick={() => setCategory(cat.value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-300 ${active ? `${theme.light} ${theme.text} border-transparent shadow-md` : 'border-sage-50 text-sage-300 hover:border-sage-100'}`}
                    >
                      <cat.icon className={`w-6 h-6 ${active ? 'scale-110' : 'opacity-40'}`} />
                      <span className="text-[8px] font-bold uppercase leading-tight text-center truncate w-full">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other Inputs */}
            <div className="space-y-4 pb-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[9px] font-bold text-sage-400 uppercase tracking-widest px-1">
                  <Type className="w-3 h-3" /> Keterangan
                </label>
                <input type="text" value={description} disabled={loading} onChange={e => setDescription(e.target.value)} placeholder="Misal: Makan malam"
                  className="w-full px-5 py-3.5 bg-sage-50 border border-sage-100 rounded-xl text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-500/10 transition-all font-bold text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-[9px] font-bold text-sage-400 uppercase tracking-widest px-1">
                  <Calendar className="w-3 h-3" /> Tanggal
                </label>
                <input type="date" value={date} disabled={loading} onChange={e => setDate(e.target.value)} required
                  className="w-full px-5 py-3.5 bg-sage-50 border border-sage-100 rounded-xl text-sage-900 focus:outline-none transition-all font-bold cursor-pointer text-sm"
                />
              </div>

              {!transactionToEdit && pots.length > 0 && (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-[9px] font-bold text-sage-400 uppercase tracking-widest px-1">
                    <Wallet className="w-3 h-3" /> Tautkan ke Pos (Opsional)
                  </label>
                  <select
                    value={selectedPotId}
                    disabled={loading}
                    onChange={(e) => setSelectedPotId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-sage-50 border border-sage-100 rounded-xl text-sage-900 focus:outline-none transition-all font-bold cursor-pointer text-sm appearance-none"
                  >
                    <option value="">Tidak ditautkan</option>
                    {pots.map(pot => (
                      <option key={pot.id} value={pot.id}>
                        {pot.emoji} {pot.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Submit Button (at the bottom) */}
          <div className="flex-shrink-0 p-6 pb-12 sm:pb-6 border-t border-sage-50 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.02)]">
            <button type="submit" disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold text-white text-sm uppercase tracking-widest transition-all duration-300 shadow-xl ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'} ${theme.bg} ${theme.shadow}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (transactionToEdit ? 'Simpan Perubahan' : 'Simpan Transaksi')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}