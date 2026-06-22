import { useState } from 'react';
import {
  Plus,
  ArrowRight,
  Heart,
  Inbox,
  Sparkles,
  Calendar,
  History,
  Share2,
  TrendingDown,
  Receipt,
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
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } }
};

const COLORS = [
  '#be123c', // rose-700
  '#4F6F52', // Sage
  '#a16207', // amber-700
  '#7c3aed', // violet-600
  '#0369a1', // sky-700
  '#059669', // emerald-600
  '#c2410c', // orange-700
  '#4338ca', // indigo-700
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/98 backdrop-blur-xl border border-sage-100 p-3.5 rounded-2xl shadow-2xl shadow-sage-900/10">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: payload[0].payload.fill }} />
          <span className="text-sage-700 text-xs font-bold">{payload[0].name}</span>
        </div>
        <span className="font-mono text-sm font-black text-sage-900 mt-1 block">{formatRupiah(payload[0].value)}</span>
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
    totalExpense,
    pieData,
    recentTx,
    handleShareStats,
  } = useDashboardStats(transactions, now);

  const topCategory = pieData[0];
  const txCountThisMonth = pieData.reduce((sum, d) => sum + 1, 0);

  if (!userProfile?.coupleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-100/20 rounded-full blur-[120px] -z-10" />
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-28 h-28 bg-gradient-to-br from-rose-400 to-rose-600 rounded-[2.5rem] shadow-2xl shadow-rose-500/30 flex items-center justify-center mb-8"
        >
          <Heart className="w-14 h-14 text-white fill-white" />
        </motion.div>
        <h2 className="font-display text-3xl text-sage-900 mb-4 tracking-tight">Hubungkan Cintamu</h2>
        <p className="text-sage-500 mb-8 max-w-sm leading-relaxed text-sm">
          CandyNest bekerja paling baik saat kamu menggunakannya bersama pasangan. Hubungkan akunmu sekarang!
        </p>
        <Link
          to="/settings"
          className="px-10 py-4 bg-sage-800 text-white rounded-[2rem] font-bold hover:bg-sage-900 transition-all shadow-xl shadow-sage-900/15 active:scale-95"
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
      className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-5 md:space-y-8 pb-28"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 fill-rose-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.35em]">Ringkasan Bulanan</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-sage-900 tracking-tight leading-none">
            Halo, {userProfile.displayName} 👋
          </h1>
          <div className="flex items-center gap-1.5 text-sage-400 font-medium pt-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">{format(now, 'EEEE, dd MMMM yyyy', { locale: id })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleShareStats}
            className="w-11 h-11 flex items-center justify-center bg-white border border-sage-100 text-sage-500 rounded-2xl hover:bg-sage-50 hover:text-sage-700 transition-all shadow-sm active:scale-95"
            title="Bagikan laporan"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── Hero + Quick Stats ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* Hero Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-sage-800 via-sage-900 to-sage-950 p-7 md:p-10 text-white shadow-[0_24px_48px_-8px_rgba(20,40,20,0.3)]">
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full gap-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-rose-300" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/50 mb-0.5">Total Pengeluaran</p>
                  <p className="text-xs font-semibold text-white/70">{format(now, 'MMMM yyyy', { locale: id })}</p>
                </div>
              </div>

            </div>

            <div>
              <div className="font-mono text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-none">
                  {formatRupiah(totalExpense)}
                </div>
              {totalExpense > 0 && (
                <p className="text-xs text-white/40 font-medium mt-2">
                  dari {pieData.length} kategori pengeluaran bulan ini
                </p>
              )}
            </div>

            {/* Top category chip */}
            {topCategory && (
              <div className="flex items-center gap-2 w-fit bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5">
                <div className="w-2 h-2 rounded-full bg-rose-300" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Terbesar:</span>
                <span className="text-xs font-black text-white">{topCategory.name}</span>
                <span className="text-[10px] font-bold text-rose-300 ml-1">{((topCategory.value / totalExpense) * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Column */}
        <div className="flex flex-row lg:flex-col gap-4">
          {/* Kategori */}
          <div className="flex-1 lg:flex-none bg-white rounded-[2rem] border border-sage-50 shadow-xl shadow-sage-900/[0.04] p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-violet-500" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-sage-400">Bulan ini</span>
            </div>
            <div>
              <p className="font-mono text-2xl font-black text-sage-900">{pieData.length}</p>
              <p className="text-xs text-sage-400 font-semibold mt-0.5">Kategori aktif</p>
            </div>
          </div>

          {/* Link to Transactions */}
          <Link to="/transactions" className="flex-1 lg:flex-none group bg-gradient-to-br from-rose-50 to-white rounded-[2rem] border border-rose-100/60 shadow-xl shadow-rose-900/[0.04] p-5 flex flex-col justify-between gap-3 hover:shadow-rose-200/50 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-5 h-5 text-rose-500" />
              </div>
              <ArrowRight className="w-4 h-4 text-rose-300 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div>
              <p className="font-mono text-2xl font-black text-rose-600">{recentTx.length}</p>
              <p className="text-xs text-rose-400 font-semibold mt-0.5">Transaksi terbaru</p>
            </div>
          </Link>
        </div>
      </motion.div>

      {/* ── Charts & Recent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">

        {/* Pie Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 bg-white rounded-[2.5rem] p-6 md:p-8 border border-sage-50 shadow-xl shadow-sage-900/[0.03] flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-xl text-sage-900 leading-none mb-1">Distribusi Pengeluaran</h3>
              <p className="text-xs text-sage-400 font-medium">{format(now, 'MMMM yyyy', { locale: id })}</p>
            </div>
          </div>

          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6 flex-1">
              {/* Donut */}
              <div className="relative w-full sm:w-[200px] h-[200px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius="62%"
                      outerRadius="88%"
                      strokeWidth={0}
                      paddingAngle={3}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} className="focus:outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-bold text-sage-400 uppercase tracking-widest">Total</span>
                  <span className="font-mono text-base font-black text-sage-900 leading-tight">
                    {formatRupiah(totalExpense)}
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2 max-h-[200px] overflow-y-auto scrollbar-hide">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between group hover:bg-sage-50 rounded-xl px-3 py-2 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-semibold text-sage-800 text-xs truncate">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[9px] font-bold text-sage-400 bg-sage-100 px-1.5 py-0.5 rounded-full">
                        {((entry.value / totalExpense) * 100).toFixed(0)}%
                      </span>
                      <span className="font-mono text-xs font-black text-sage-900">
                        {formatRupiah(entry.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-sage-300 bg-sage-50/50 rounded-[1.5rem] border border-dashed border-sage-100">
              <Inbox className="w-10 h-10 mb-3 text-sage-200" />
              <p className="font-bold text-sage-700 text-sm mb-1">Belum Ada Pengeluaran</p>
              <p className="text-xs font-medium text-sage-400 text-center px-4">Catat pengeluaran pertamamu hari ini.</p>
            </div>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 md:p-8 border border-sage-50 shadow-xl shadow-sage-900/[0.03] flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-xl text-sage-900 leading-none mb-1">Aktivitas</h3>
              <p className="text-xs text-sage-400 font-medium">Pengeluaran terbaru</p>
            </div>
            <Link
              to="/transactions"
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-sage-500 hover:text-sage-700 transition-colors group"
            >
              Semua
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="flex-1 space-y-1">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                    <div className="w-10 h-10 bg-sage-100 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-sage-100 rounded-full w-3/4" />
                      <div className="h-2.5 bg-sage-100 rounded-full w-1/2" />
                    </div>
                    <div className="h-3 bg-rose-50 rounded-full w-16" />
                  </div>
                ))}
              </div>
            ) : recentTx.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <History className="w-8 h-8 mx-auto text-sage-200 mb-3" />
                <p className="text-xs text-sage-400 font-medium">Belum ada transaksi.</p>
              </div>
            ) : (
              recentTx.map((tx, idx) => {
                const cat = getCategoryInfo(tx.category);
                const isMine = tx.userId === userProfile?.uid || (tx.addedBy === userProfile?.displayName && !tx.userId);
                const color = COLORS[idx % COLORS.length];

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group flex items-center gap-3 p-2.5 rounded-2xl hover:bg-sage-50 transition-all cursor-default"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105"
                      style={{ backgroundColor: `${color}1a` }}
                    >
                      <cat.icon className="w-4.5 h-4.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sage-900 text-xs truncate">{cat.label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {tx.description && (
                          <p className="text-[9px] text-sage-400 italic truncate max-w-[80px]">"{tx.description}"</p>
                        )}
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tight ${isMine ? 'bg-sage-100 text-sage-600' : 'bg-rose-100 text-rose-500'}`}>
                          {isMine ? 'Saya' : (userProfile?.partnerName || 'Pasangan')}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-black text-rose-500 flex-shrink-0">
                      -{formatRupiah(tx.amount)}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>

          {recentTx.length > 0 && (
            <Link
              to="/transactions"
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sage-50 text-sage-600 text-xs font-bold hover:bg-sage-100 transition-colors border border-sage-100"
            >
              Lihat Semua Transaksi
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </motion.div>
      </div>

      {/* ── Monthly Allocation ── */}
      <motion.div variants={itemVariants}>
        <MonthlyAllocationTable hideActions={true} hideBalance={false} />
      </motion.div>

      <AnimatePresence>
        {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}
