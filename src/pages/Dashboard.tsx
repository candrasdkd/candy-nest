import { useState, useEffect } from 'react';
import {
  Plus,
  ArrowRight,
  Heart,
  Inbox,
  Sparkles,
  Calendar,
  History,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuthStore } from '../store/useAuthStore';
import { useTransactions } from '../hooks/useTransactions';
import { formatRupiah, getCategoryInfo } from '../types';
import { useDashboardStats } from '../hooks/useDashboardStats';
import TransactionModal from '../components/TransactionModal';
import MonthlyAllocationTable from '../components/MonthlyAllocationTable';
import { Link } from 'react-router-dom';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

const COLORS = [
  '#4F6F52', // Sage Green
  '#E6A4B4', // Rose Pink
  '#7A9D54', // Olive
  '#F3D7CA', // Peach
  '#8EACCD', // Soft Blue
  '#D2E0FB', // Sky
  '#B4BDFF', // Lavender
  '#F9F3CC', // Cream
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-cream-200 p-4 rounded-[1.5rem] shadow-2xl shadow-sage-900/10">
        <p className="text-sage-400 text-[10px] font-bold uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6 text-sm font-bold">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color || p.payload.fill }} />
                <span className="text-sage-800">{p.name}</span>
              </div>
              <span className="font-mono text-sage-900">{formatRupiah(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { userProfile } = useAuthStore();
  const { transactions, loading } = useTransactions();
  const [showModal, setShowModal] = useState(false);
  const now = new Date();

  const {
    totalIncome,
    totalExpense,
    balance,
    allTimeBalance,
    pieData,
    recentTx,
  } = useDashboardStats(transactions, now);

  // Hapus badge notifikasi saat user membuka Dashboard
  useEffect(() => {
    if ('clearAppBadge' in navigator) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }, []);

  const handleShareStats = async () => {
    const text = `📊 Laporan Keuangan CandyNest (${format(now, 'MMMM yyyy', { locale: id })})\n\n` +
      `💰 Pemasukan: ${formatRupiah(totalIncome)}\n` +
      `💸 Pengeluaran: ${formatRupiah(totalExpense)}\n` +
      `🏦 Saldo Bulan Ini: ${formatRupiah(balance)}\n` +
      `✨ Total Tabungan: ${formatRupiah(allTimeBalance)}\n\n` +
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

  if (!userProfile?.coupleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-100/30 rounded-full blur-[100px] -z-10" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mb-8 border border-rose-50"
        >
          <Heart className="w-12 h-12 text-rose-400 fill-rose-400" />
        </motion.div>
        <h2 className="font-display text-3xl text-sage-900 mb-4 tracking-tight">Hubungkan Cintamu</h2>
        <p className="text-sage-500 mb-8 max-w-sm leading-relaxed">
          CandyNest bekerja paling baik saat kamu menggunakannya bersama pasangan. Hubungkan akunmu sekarang!
        </p>
        <Link
          to="/settings"
          className="px-10 py-4 bg-sage-800 text-white rounded-[2rem] font-bold hover:bg-sage-900 transition-all shadow-xl shadow-sage-900/10 active:scale-95"
        >
          Hubungkan Sekarang
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-4 md:p-8 lg:p-12 max-w-7xl mx-auto space-y-6 md:space-y-10 pb-24"
    >
      {/* Header & Greeting */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <Sparkles className="w-4 h-4 fill-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Ringkasan Bulanan</span>
          </div>
          <h1 className="font-display text-4xl lg:text-5xl text-sage-900 tracking-tight">
            Halo, {userProfile.displayName}
          </h1>
          <div className="flex items-center gap-2 text-sage-400 font-medium">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{format(now, 'EEEE, dd MMMM yyyy', { locale: id })}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShareStats}
            className="w-14 h-14 flex items-center justify-center bg-white border border-sage-100 text-sage-600 rounded-[1.5rem] hover:bg-sage-50 transition-all shadow-lg shadow-sage-900/5 active:scale-95"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-sage-800 text-white rounded-[2rem] font-bold hover:bg-sage-900 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-sage-900/20"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah</span>
          </button>
        </div>
      </motion.div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 gap-8">
        {/* Main Balance Card */}
        <motion.div
          variants={itemVariants}
          className={`p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] text-white relative overflow-hidden group transition-all duration-700 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] ${allTimeBalance >= 0 ? 'bg-gradient-to-br from-sage-700 to-sage-900' : 'bg-gradient-to-br from-rose-600 to-rose-800'}`}
        >
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-rose-400/20 rounded-full blur-[60px]" />

          <div className="flex flex-col justify-between h-full relative z-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <div className="w-8 h-8 text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" /></svg>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-[0.2em] block mb-1">Total Saldo (Tabungan)</span>
                  <span className="text-xs font-medium text-white/80">Akumulasi Seluruh Waktu</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-mono text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter drop-shadow-md leading-none">
                  {formatRupiah(allTimeBalance)}
                </div>
                {balance !== allTimeBalance && (
                  <div className="flex items-center gap-2 text-white/50 text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-4 py-1.5 rounded-full border border-white/10">
                    <Sparkles className="w-3 h-3" />
                    <span>Selisih bulan ini: {balance >= 0 ? '+' : ''}{formatRupiah(balance)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 pt-6 md:pt-8 border-t border-white/10">
              <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2 md:space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/50">Income</span>
                </div>
                <div className="font-mono text-sm md:text-2xl font-bold text-emerald-300">
                  {formatRupiah(totalIncome)}
                </div>
              </div>
              <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2 md:space-y-2 md:border-l md:border-white/10 md:pl-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/50">Expense</span>
                </div>
                <div className="font-mono text-sm md:text-2xl font-bold text-rose-300">
                  {formatRupiah(totalExpense)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monthly Allocation Plan */}
      <motion.div variants={itemVariants}>
        <MonthlyAllocationTable hideActions={true} />
      </motion.div>

      {/* Charts & Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Visual (Pie Chart & Legend) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[3rem] p-8 md:p-10 border border-sage-50 shadow-xl shadow-sage-900/[0.03] flex flex-col">
          <div className="mb-6 md:mb-8">
            <h3 className="font-display text-2xl text-sage-900 mb-1">Pengeluaran Bulan Ini</h3>
            <p className="text-sm text-sage-400 font-medium">Distribusi berdasarkan kategori</p>
          </div>

          {pieData.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 flex-1">
              <div className="relative w-full md:w-1/2 aspect-square max-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius="65%" outerRadius="90%" strokeWidth={0} paddingAngle={4}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none hover:opacity-80 transition-opacity cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                  <span className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Total Keluar</span>
                  <span className="text-xl md:text-2xl font-bold text-sage-900 tracking-tight leading-none">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
              </div>

              <div className="w-full md:w-1/2 flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-hide">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-sage-50/50 hover:bg-sage-50 transition-colors border border-sage-100/30">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-bold text-sage-900">{entry.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm font-black text-sage-900">{formatRupiah(entry.value)}</span>
                      <span className="text-[10px] font-bold text-sage-400 uppercase tracking-wider mt-0.5">
                        {((entry.value / totalExpense) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-12 text-sage-300 bg-sage-50/50 rounded-[2rem] border border-dashed border-sage-100">
              <Inbox className="w-12 h-12 mb-4 text-sage-200" />
              <p className="font-bold text-sage-900 mb-1">Belum Ada Pengeluaran</p>
              <p className="text-sm font-medium text-sage-500 text-center px-4">Transaksi pengeluaranmu akan muncul di sini.</p>
            </div>
          )}
        </motion.div>

        {/* Quick History List */}
        <motion.div variants={itemVariants} className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-10 border border-sage-50 shadow-xl shadow-sage-900/[0.03]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-display text-2xl text-sage-900 mb-1">Aktivitas</h3>
              <p className="text-sm text-sage-400 font-medium">Transaksi terbaru</p>
            </div>
            <Link to="/transactions" className="w-10 h-10 bg-sage-50 rounded-xl flex items-center justify-center text-sage-600 hover:bg-sage-100 transition-colors">
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 bg-sage-50 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-sage-50 rounded w-2/3" />
                      <div className="h-3 bg-sage-50 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentTx.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <History className="w-10 h-10 mx-auto text-sage-200" />
                <p className="text-sm text-sage-400 font-medium leading-relaxed">Belum ada transaksi yang dicatat.</p>
              </div>
            ) : (
              recentTx.slice(0, 4).map(tx => {
                const cat = getCategoryInfo(tx.category);
                const isMine = tx.userId === userProfile?.uid || (tx.addedBy === userProfile?.displayName && !tx.userId);

                return (
                  <div key={tx.id} className="group flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sage-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-500">
                      <cat.icon className="w-6 h-6 text-sage-500 group-hover:text-sage-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-bold text-sage-900 text-xs truncate leading-tight">
                          {cat.label}
                        </div>
                        <div className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${isMine ? 'bg-sage-100 text-sage-700' : 'bg-rose-100 text-rose-600'}`}>
                          {isMine ? 'Saya' : (userProfile?.partnerName || tx.addedBy || 'Pasangan')}
                        </div>
                      </div>
                      {tx.description && (
                        <div className="text-[10px] text-sage-500 italic truncate mb-1">
                          "{tx.description}"
                        </div>
                      )}
                    </div>
                    <div className={`font-mono font-bold text-sm flex-shrink-0 ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
