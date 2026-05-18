import { X, Calendar, User, Wallet, Tag, Trash2, Edit2, Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction, formatRupiah, getCategoryInfo } from '../types';

const containerVariants = {
  hidden: { y: '100%', opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: 'tween', duration: 0.2, ease: 'easeOut' } as any
  },
  exit: { 
    y: '100%', 
    opacity: 0,
    transition: { type: 'tween', ease: 'easeIn', duration: 0.2 } as any
  }
};

interface Props {
  tx: Transaction;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  currentUserId: string | undefined;
}

export default function TransactionDetailModal({ tx, onClose, onEdit, onDelete, currentUserId }: Props) {
  const cat = getCategoryInfo(tx.category);
  const isMine = tx.userId === currentUserId;
  const isIncome = tx.type === 'income';

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
        className="relative bg-white w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] sm:shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-white/20 mb-safe-offset-bottom"
      >
        {/* Header (Sticky at top) */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-sage-50 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sage-400">
              <Sparkles className="w-3 h-3 text-sage-500" />
              <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Detail Lengkap</span>
            </div>
            <h2 className="font-display text-2xl text-sage-900 tracking-tight leading-none">Rincian Transaksi</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
          {/* Main Visual Display */}
          <div className={`p-6 rounded-[2rem] border text-center relative overflow-hidden ${
            isIncome ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-rose-50/50 border-rose-100/50'
          }`}>
            <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-sm ${
              isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'
            }`}>
              <cat.icon className="w-8 h-8" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
              isIncome ? 'bg-emerald-100/40 text-emerald-700' : 'bg-rose-100/40 text-rose-700'
            }`}>
              {cat.label}
            </span>
            <div className={`font-mono text-3xl font-black mt-4 tracking-tighter ${
              isIncome ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {isIncome ? '+' : '-'}{formatRupiah(tx.amount)}
            </div>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="space-y-4 bg-sage-50/30 p-5 rounded-3xl border border-sage-100/50">
            {/* Added By / User */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-sage-400 flex items-center gap-2">
                <User className="w-4 h-4" /> Pencatat
              </span>
              <div className="flex items-center gap-2 font-bold text-sage-900">
                <span>{tx.addedBy}</span>
                <span className={`text-[8px] font-black tracking-tight px-2 py-0.5 rounded-full ${
                  isMine ? 'bg-sage-100 text-sage-700' : 'bg-rose-100 text-rose-600'
                }`}>
                  {isMine ? 'SAYA' : 'PASANGAN'}
                </span>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-sage-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Tanggal
              </span>
              <span className="font-bold text-sage-950">
                {format(parseISO(tx.date), 'dd MMMM yyyy', { locale: id })}
              </span>
            </div>

            {/* Time */}
            {tx.createdAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-sage-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Waktu Input
                </span>
                <span className="font-bold text-sage-950">
                  {format(parseISO(tx.createdAt), 'HH:mm', { locale: id })}
                </span>
              </div>
            )}

            {/* Linked Savings Pot if exists */}
            {tx.relatedPotId && (
              <div className="flex items-center justify-between text-sm border-t border-dashed border-sage-200/50 pt-3">
                <span className="text-sage-400 flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> Pos Terhubung
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100/50">
                  Tersimpan di Pos
                </span>
              </div>
            )}
          </div>

          {/* Description Block */}
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-sage-400 uppercase tracking-widest px-1">Keterangan / Catatan</span>
            {tx.description ? (
              <p className="bg-sage-50 text-sage-800 text-sm font-semibold p-4 rounded-2xl border border-sage-100/50 leading-relaxed italic">
                "{tx.description}"
              </p>
            ) : (
              <p className="bg-sage-50 text-sage-300 text-xs font-semibold p-4 rounded-2xl border border-sage-100/50 leading-relaxed italic text-center">
                Tidak ada catatan
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Footer (Sticky at bottom) */}
        <div className="flex-shrink-0 p-6 pb-12 sm:pb-6 border-t border-sage-50 bg-white grid grid-cols-2 gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.02)]">
          <button
            onClick={() => {
              onClose();
              onEdit();
            }}
            className="flex items-center justify-center gap-2.5 py-4 bg-sage-50 text-sage-700 hover:bg-sage-100 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            <Edit2 className="w-4 h-4" />
            <span>Ubah</span>
          </button>
          
          <button
            onClick={() => {
              onClose();
              onDelete();
            }}
            className="flex items-center justify-center gap-2.5 py-4 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
