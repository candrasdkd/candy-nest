import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDataStore } from '../store/useDataStore';
import {
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  Calendar,
  Inbox,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  X,
  Edit2,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah, getCategoryInfo, Transaction } from '../types';
import TransactionModal from '../components/TransactionModal';
import TransactionDetailModal from '../components/TransactionDetailModal';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

import { useTransactionsPage } from '../hooks/useTransactionsPage';

export default function Transactions() {
  const {
    userProfile,
    loading,
    error,
    showModal,
    setShowModal,
    search,
    setSearch,
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    totalIncome,
    totalExpense,
    grouped,
    handleDelete
  } = useTransactionsPage();

  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  const transactions = useDataStore(s => s.transactions);
  const [searchParams, setSearchParams] = useSearchParams();
  const txId = searchParams.get('id');
  const action = searchParams.get('action');

  useEffect(() => {
    if (txId && transactions.length > 0) {
      const foundTx = transactions.find(t => t.id === txId);
      if (foundTx) {
        setDetailTx(foundTx);
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [txId, transactions, setSearchParams, searchParams]);

  useEffect(() => {
    if (action === 'add') {
      setEditTx(null);
      setShowModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [action, setShowModal, searchParams, setSearchParams]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 lg:p-12 max-w-5xl mx-auto space-y-10 pb-32"
    >
      {/* Header Profile Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-sage-400 mb-1">
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Riwayat Keuangan</span>
          </div>
          <h1 className="font-display text-4xl text-sage-900 tracking-tight">Semua Transaksi</h1>
        </div>

        <button
          onClick={() => {
            setEditTx(null);
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-sage-800 text-white rounded-[2rem] font-bold hover:bg-sage-900 transition-all shadow-2xl shadow-sage-900/10 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Transaksi</span>
        </button>
      </motion.div>

      {/* Modern Filter Bar */}
      <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-4 lg:p-6 shadow-2xl shadow-sage-900/5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search Input */}
          <div className="md:col-span-5 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 group-focus-within:text-sage-600 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari deskripsi atau kategori..."
              className="w-full pl-12 pr-4 py-4 bg-sage-50/50 border border-sage-100 rounded-[1.5rem] text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-500/20 focus:border-sage-500/30 transition-all text-sm font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-sage-400 hover:text-sage-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="md:col-span-3 flex p-1 bg-sage-50/50 rounded-[1.5rem] border border-sage-100">
            {(['all', 'income', 'expense'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterType === t
                  ? 'bg-white text-sage-900 shadow-sm'
                  : 'text-sage-400 hover:text-sage-600'
                  }`}
              >
                {t === 'all' ? 'Semua' : t === 'income' ? 'Masuk' : 'Keluar'}
              </button>
            ))}
          </div>

          <div className="md:col-span-4 flex items-center bg-sage-50/50 p-1 rounded-[1.5rem] border border-sage-100 overflow-hidden">
            <div className="flex-1 flex items-center px-3 gap-2 group/date relative">
              <Calendar className="w-3.5 h-3.5 text-sage-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full py-2 bg-transparent text-[11px] font-bold text-sage-700 focus:outline-none cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
            <div className="w-px h-6 bg-sage-100 shrink-0" />
            <div className="flex-1 flex items-center px-3 gap-2 group/date relative">
              <Calendar className="w-3.5 h-3.5 text-sage-400 shrink-0" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full py-2 bg-transparent text-[11px] font-bold text-sage-700 focus:outline-none cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        <div className="p-6 md:p-8 rounded-[2.5rem] bg-emerald-50/50 border border-emerald-100/50 flex items-center justify-between group transition-all hover:bg-emerald-50">
          <div className="space-y-1">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 block">Pemasukan Terfilter</span>
            <div className="font-mono text-2xl md:text-3xl font-bold text-emerald-700 tracking-tighter truncate">
              {formatRupiah(totalIncome)}
            </div>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform flex-shrink-0 ml-4">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
          </div>
        </div>

        <div className="p-6 md:p-8 rounded-[2.5rem] bg-rose-50/50 border border-rose-100/50 flex items-center justify-between group transition-all hover:bg-rose-50">
          <div className="space-y-1">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500 block">Pengeluaran Terfilter</span>
            <div className="font-mono text-2xl md:text-3xl font-bold text-rose-600 tracking-tighter truncate">
              {formatRupiah(totalExpense)}
            </div>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform flex-shrink-0 ml-4">
            <TrendingDown className="w-6 h-6 md:w-7 md:h-7" />
          </div>
        </div>
      </motion.div>

      {/* Main List */}
      <div className="space-y-12">
        {error ? (
          <div className="bg-rose-50 p-12 rounded-[3rem] border border-rose-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <h3 className="font-display text-2xl text-rose-900 mb-2">Ops! Ada Masalah</h3>
            <p className="text-rose-600 max-w-sm text-sm font-medium leading-relaxed">
              {error.includes('permission-denied') ? 'Kamu tidak memiliki akses untuk melihat data ini.' : error}
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-sage-50/50 rounded-[2rem] animate-pulse border border-sage-50" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-24 bg-sage-50/30 rounded-[3rem] border border-dashed border-sage-100">
            <Inbox className="w-16 h-16 mx-auto text-sage-200 mb-6" />
            <h3 className="font-display text-2xl text-sage-800 mb-2">Hening Sekali...</h3>
            <p className="text-sage-400 font-medium">Tidak ada transaksi yang cocok dengan pencarianmu.</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} className="space-y-12">
            {grouped.map(([date, txs]) => (
              <motion.div key={date} variants={itemVariants} className="space-y-4">
                {/* Date Header */}
                <div className="flex items-center gap-6 px-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-sage-400 uppercase tracking-[0.2em]">
                      {format(parseISO(date), 'EEEE', { locale: id })}
                    </span>
                    <span className="text-lg font-bold text-sage-900 tracking-tight">
                      {format(parseISO(date), 'dd MMMM yyyy', { locale: id })}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-sage-100/50" />
                  <div className="bg-sage-50 px-4 py-2 rounded-xl border border-sage-100">
                    <span className="font-mono text-sm font-bold text-sage-600">
                      {formatRupiah(
                        txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) -
                        txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {txs.map(tx => {
                    const cat = getCategoryInfo(tx.category);
                    const isMine = tx.userId === userProfile?.uid;

                    return (
                      <motion.div
                        key={tx.id}
                        onClick={() => setDetailTx(tx)}
                        whileHover={{ scale: 1.01, x: 5 }}
                        className="group bg-white rounded-[1.8rem] p-4 border border-sage-50 shadow-sm hover:shadow-xl hover:shadow-sage-900/[0.03] transition-all flex items-center justify-between gap-4 cursor-pointer relative overflow-hidden"
                      >
                        {/* Status Accent */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`} />

                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-sage-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <cat.icon className="w-6 h-6 text-sage-500 group-hover:text-sage-700" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-bold text-sage-900 text-sm tracking-tight truncate">
                              {cat.label}
                            </h4>
                            <p className="text-[10px] text-sage-400 font-semibold flex items-center gap-1.5 mt-0.5">
                              {tx.createdAt && format(parseISO(tx.createdAt), 'HH:mm')}
                              <span>·</span>
                              <span className={`text-[8.5px] font-black uppercase tracking-tight ${isMine ? 'text-sage-500' : 'text-rose-500'}`}>
                                {isMine ? 'Saya' : 'Pasangan'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className={`font-mono text-sm md:text-base font-black tracking-tighter whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                          </div>

                          {/* Quick Actions Panel */}
                          <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTx(tx);
                              }}
                              className="p-2 rounded-xl text-sage-400 hover:text-sage-700 hover:bg-sage-50 transition-all shrink-0"
                              title="Ubah transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(tx.id);
                              }}
                              className="p-2 rounded-xl text-sage-400 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                              title="Hapus transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
        {editTx && <TransactionModal onClose={() => setEditTx(null)} transactionToEdit={editTx} />}
        {detailTx && (
          <TransactionDetailModal
            tx={detailTx}
            onClose={() => setDetailTx(null)}
            onEdit={() => setEditTx(detailTx)}
            onDelete={() => handleDelete(detailTx.id)}
            currentUserId={userProfile?.uid}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
