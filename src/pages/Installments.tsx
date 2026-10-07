import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, CircleDollarSign, Clock3, CreditCard, Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuthStore } from '../store/useAuthStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { useInstallmentsStore } from '../store/useInstallmentsStore';
import { Installment } from '../types';
import { formatRupiah, parseRupiah } from '../types';

const thisMonth = new Date().toISOString().slice(0, 7);

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: localeId });
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-sage-950/50 backdrop-blur-sm p-0 sm:p-4" onMouseDown={onClose}>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-2xl" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-sage-900">{title}</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-xl bg-sage-50 text-sage-500 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export default function Installments() {
  const { userProfile } = useAuthStore();
  const { installments, loading, error, initInstallments, addInstallment, updateInstallment, deleteInstallment, addPayment, deletePayment } = useInstallmentsStore();
  const { confirm, close } = useConfirmStore();
  const [formInstallment, setFormInstallment] = useState<Installment | null | undefined>(undefined);
  const [paymentFor, setPaymentFor] = useState<Installment | null>(null);
  const [title, setTitle] = useState('');
  const [totalDebt, setTotalDebt] = useState('');
  const [paymentMonth, setPaymentMonth] = useState(thisMonth);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [paymentPages, setPaymentPages] = useState<Record<string, number>>({});

  useEffect(() => initInstallments(), [initInstallments, userProfile?.coupleId]);

  const summary = useMemo(() => installments.reduce((result, item) => {
    const paid = (item.payments || []).reduce((sum, payment) => sum + payment.amount, 0);
    result.debt += item.totalDebt;
    result.paid += paid;
    return result;
  }, { debt: 0, paid: 0 }), [installments]);

  function openCreate() {
    setTitle(''); setTotalDebt(''); setFormError(''); setFormInstallment(null);
  }
  function openEdit(item: Installment) {
    setTitle(item.title); setTotalDebt(String(item.totalDebt)); setFormError(''); setFormInstallment(item);
  }
  function openPayment(item: Installment) {
    setPaymentPages(current => ({ ...current, [item.id]: 0 }));
    setPaymentFor(item); setPaymentMonth(thisMonth); setPaymentAmount(''); setFormError('');
  }
  function formatInput(value: string) {
    const digits = value.replace(/\D/g, '');
    return digits ? Number(digits).toLocaleString('id-ID') : '';
  }
  async function saveInstallment(event: FormEvent) {
    event.preventDefault();
    const amount = parseRupiah(totalDebt);
    if (!title.trim()) { setFormError('Judul cicilan wajib diisi.'); return; }
    if (amount < 1) { setFormError('Total utang harus lebih dari 0.'); return; }
    if (formInstallment && amount < (formInstallment.payments || []).reduce((sum, payment) => sum + payment.amount, 0)) {
      setFormError('Total utang tidak boleh lebih kecil dari jumlah yang sudah dibayarkan.'); return;
    }
    setSaving(true); setFormError('');
    try {
      if (formInstallment) await updateInstallment(formInstallment.id, { title, totalDebt: amount });
      else await addInstallment({ title, totalDebt: amount });
      setFormInstallment(undefined);
    } catch (e: any) { setFormError(e.message || 'Gagal menyimpan cicilan.'); }
    finally { setSaving(false); }
  }
  async function savePayment(event: FormEvent) {
    event.preventDefault();
    if (!paymentFor) return;
    const amount = parseRupiah(paymentAmount);
    if (!paymentMonth || amount < 1) { setFormError('Bulan dan nominal pembayaran wajib diisi.'); return; }
    const paid = (paymentFor.payments || []).reduce((sum, item) => sum + item.amount, 0);
    if (paid + amount > paymentFor.totalDebt) { setFormError('Pembayaran melebihi sisa utang.'); return; }
    setSaving(true); setFormError('');
    try {
      await addPayment(paymentFor.id, { month: paymentMonth, amount });
      setPaymentFor(null);
    } catch (e: any) { setFormError(e.message || 'Gagal menyimpan pembayaran.'); }
    finally { setSaving(false); }
  }
  function askDelete(item: Installment) {
    confirm({
      title: 'Hapus cicilan?', message: `Data cicilan “${item.title}” beserta riwayat pembayarannya akan dihapus.`, confirmText: 'Hapus', variant: 'danger',
      onConfirm: async () => { await deleteInstallment(item.id); close(); },
    });
  }
  function askDeletePayment(item: Installment, paymentId: string) {
    confirm({ title: 'Hapus pembayaran?', message: 'Pembayaran ini akan dihapus dari riwayat cicilan.', confirmText: 'Hapus', variant: 'danger',
      onConfirm: async () => { await deletePayment(item.id, paymentId); close(); },
    });
  }

  if (!userProfile?.coupleId) return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6"><CreditCard className="w-9 h-9 text-sage-400" /></div>
      <h2 className="font-display text-3xl text-sage-900 mb-2">Cicilan</h2>
      <p className="text-sage-500 max-w-sm">Hubungkan akun ke pasangan terlebih dahulu untuk mencatat cicilan bersama.</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto pb-32 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-rose-400 mb-1"><CreditCard className="w-4 h-4" /><span className="text-[10px] font-bold uppercase tracking-[0.3em]">Debt Tracker</span></div>
          <h1 className="font-display text-4xl lg:text-5xl text-sage-900 tracking-tight">Cicilan</h1>
          <p className="text-sage-400 font-medium mt-1">Pantau total utang dan pembayaran setiap bulan.</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-5 py-3.5 bg-sage-800 text-white rounded-2xl font-bold text-sm hover:bg-sage-900 transition-all shadow-lg shadow-sage-900/10 active:scale-95"><Plus className="w-4 h-4" />Tambah Cicilan</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 sm:gap-5">
        <SummaryCard label="Total Utang" amount={summary.debt} icon={<CircleDollarSign className="w-5 h-5" />} tone="sage" />
        <SummaryCard label="Sudah Dibayarkan" amount={summary.paid} icon={<Check className="w-5 h-5" />} tone="rose" />
        <SummaryCard label="Sisa Utang" amount={Math.max(0, summary.debt - summary.paid)} icon={<Clock3 className="w-5 h-5" />} tone="amber" />
      </div>

      {error && <div className="rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 text-sm font-semibold">{error}</div>}
      {loading ? <div className="grid md:grid-cols-2 gap-5">{[1, 2].map(i => <div key={i} className="h-64 rounded-[2rem] bg-sage-100/70 animate-pulse" />)}</div> : installments.length === 0 ? (
        <div className="bg-white border border-sage-100 rounded-[2rem] py-16 px-6 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sage-50 text-sage-400 flex items-center justify-center mx-auto mb-4"><CreditCard className="w-8 h-8" /></div>
          <h3 className="font-display text-2xl text-sage-900 mb-2">Belum ada cicilan</h3>
          <p className="text-sage-400 text-sm mb-6">Tambahkan cicilan untuk memantau pembayaran dan sisa utang.</p>
          <button onClick={openCreate} className="px-6 py-3 bg-sage-800 text-white rounded-xl text-sm font-bold"><Plus className="w-4 h-4 inline mr-2" />Tambah Cicilan Pertama</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {installments.map(item => {
            const payments = item.payments || [];
            const sortedPayments = [...payments].sort((a, b) => b.month.localeCompare(a.month));
            const pageCount = Math.ceil(sortedPayments.length / 4);
            const currentPage = Math.min(paymentPages[item.id] || 0, Math.max(0, pageCount - 1));
            const visiblePayments = sortedPayments.slice(currentPage * 4, currentPage * 4 + 4);
            const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
            const progress = item.totalDebt ? Math.min(100, paid / item.totalDebt * 100) : 0;
            return <motion.section key={item.id} layout className="bg-white border border-sage-100 rounded-[2rem] p-5 sm:p-7 shadow-[0_12px_36px_rgba(34,54,38,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h2 className="font-display text-xl sm:text-2xl font-bold text-sage-900 truncate">{item.title}</h2><p className="text-xs text-sage-400 mt-1">Dibuat {format(new Date(item.createdAt), 'd MMM yyyy', { locale: localeId })}</p></div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} aria-label="Edit cicilan" className="w-9 h-9 rounded-xl bg-sage-50 text-sage-500 hover:text-sage-800 flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => askDelete(item)} aria-label="Hapus cicilan" className="w-9 h-9 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="rounded-2xl bg-sage-50/80 p-4"><p className="text-[10px] uppercase tracking-wider text-sage-400 font-bold mb-1">Total utang</p><p className="font-mono text-base sm:text-lg font-black text-sage-900">{formatRupiah(item.totalDebt)}</p></div>
                <div className="rounded-2xl bg-rose-50/70 p-4"><p className="text-[10px] uppercase tracking-wider text-rose-400 font-bold mb-1">Sudah dibayar</p><p className="font-mono text-base sm:text-lg font-black text-sage-900">{formatRupiah(paid)}</p></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-sage-500 font-semibold mb-2"><span>Sisa {formatRupiah(Math.max(0, item.totalDebt - paid))}</span><span>{progress.toFixed(0)}%</span></div>
                <div className="h-2.5 rounded-full bg-sage-100 overflow-hidden"><div className="h-full rounded-full bg-rose-300 transition-all" style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="flex items-center justify-between mt-7 mb-3">
                <h3 className="text-sm font-bold text-sage-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-sage-400" />Riwayat Pembayaran <span className="text-[10px] text-sage-400 font-bold">{payments.length}</span></h3>
                <button onClick={() => openPayment(item)} disabled={paid >= item.totalDebt} className="text-xs font-bold text-sage-700 hover:text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"><Plus className="w-3.5 h-3.5 inline mr-1" />Catat Bayar</button>
              </div>
              {payments.length === 0 ? <p className="text-xs text-sage-400 bg-sage-50 rounded-xl px-4 py-3">Belum ada pembayaran tercatat.</p> : <div className="divide-y divide-sage-50">
                {visiblePayments.map(payment => <div key={payment.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-sage-50 text-sage-500 flex items-center justify-center"><CalendarDays className="w-4 h-4" /></div><span className="text-sm font-semibold text-sage-700 capitalize">{monthLabel(payment.month)}</span></div>
                  <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-sage-900">{formatRupiah(payment.amount)}</span><button onClick={() => askDeletePayment(item, payment.id)} aria-label="Hapus pembayaran" className="text-sage-300 hover:text-rose-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button></div>
                </div>)}
              </div>}
              {pageCount > 1 && <nav aria-label={`Halaman riwayat pembayaran ${item.title}`} className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-sage-50">
                <button type="button" disabled={currentPage === 0} onClick={() => setPaymentPages(current => ({ ...current, [item.id]: Math.max(0, currentPage - 1) }))} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-sage-600 hover:bg-sage-50 disabled:opacity-35 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />Sebelumnya
                </button>
                <div className="flex items-center gap-1" aria-label={`Halaman ${currentPage + 1} dari ${pageCount}`}>
                  {Array.from({ length: pageCount }, (_, page) => <button key={page} type="button" onClick={() => setPaymentPages(current => ({ ...current, [item.id]: page }))} aria-current={page === currentPage ? 'page' : undefined} aria-label={`Halaman ${page + 1}`} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === currentPage ? 'bg-sage-800 text-white' : 'text-sage-500 hover:bg-sage-50'}`}>
                    {page + 1}
                  </button>)}
                </div>
                <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPaymentPages(current => ({ ...current, [item.id]: Math.min(pageCount - 1, currentPage + 1) }))} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-sage-600 hover:bg-sage-50 disabled:opacity-35 disabled:cursor-not-allowed">
                  Selanjutnya<ChevronRight className="w-4 h-4" />
                </button>
              </nav>}
            </motion.section>;
          })}
        </div>
      )}

      {formInstallment !== undefined && <Modal title={formInstallment ? 'Edit Cicilan' : 'Tambah Cicilan'} onClose={() => setFormInstallment(undefined)}>
        <form onSubmit={saveInstallment} className="space-y-5">
          <Field label="Judul cicilan" placeholder="Contoh: Cicilan motor" value={title} onChange={setTitle} />
          <Field label="Total utang" placeholder="Contoh: 12.000.000" inputMode="numeric" value={totalDebt} onChange={value => setTotalDebt(formatInput(value))} />
          {formError && <p className="text-sm text-rose-500 font-semibold">{formError}</p>}
          <div className="flex gap-3 pt-2"><button type="button" onClick={() => setFormInstallment(undefined)} className="flex-1 py-3 rounded-xl bg-sage-50 text-sage-600 font-bold text-sm">Batal</button><button disabled={saving} className="flex-1 py-3 rounded-xl bg-sage-800 text-white font-bold text-sm disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button></div>
        </form>
      </Modal>}

      {paymentFor && <Modal title="Catat Pembayaran" onClose={() => setPaymentFor(null)}>
        <form onSubmit={savePayment} className="space-y-5">
          <p className="text-sm text-sage-500 -mt-3">{paymentFor.title}</p>
          <MonthYearPicker value={paymentMonth} onChange={setPaymentMonth} />
          <Field label="Nominal pembayaran" placeholder="Contoh: 1.000.000" inputMode="numeric" value={paymentAmount} onChange={value => setPaymentAmount(formatInput(value))} />
          {formError && <p className="text-sm text-rose-500 font-semibold">{formError}</p>}
          <div className="flex gap-3 pt-2"><button type="button" onClick={() => setPaymentFor(null)} className="flex-1 py-3 rounded-xl bg-sage-50 text-sage-600 font-bold text-sm">Batal</button><button disabled={saving} className="flex-1 py-3 rounded-xl bg-sage-800 text-white font-bold text-sm disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Pembayaran'}</button></div>
        </form>
      </Modal>}
    </div>
  );
}

function SummaryCard({ label, amount, icon, tone }: { label: string; amount: number; icon: React.ReactNode; tone: 'sage' | 'rose' | 'amber' }) {
  const colors = tone === 'sage' ? 'bg-sage-900 text-white' : tone === 'rose' ? 'bg-rose-50 text-sage-900 border border-rose-100' : 'bg-amber-50 text-sage-900 border border-amber-100';
  const iconTone = tone === 'sage' ? 'bg-white/10 text-rose-300' : tone === 'rose' ? 'bg-white text-rose-400' : 'bg-white text-amber-500';
  return <div className={`rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-6 ${colors}`}><div className="flex justify-between items-center mb-4"><p className={`text-[10px] uppercase tracking-[0.18em] font-bold ${tone === 'sage' ? 'text-white/50' : 'text-sage-400'}`}>{label}</p><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconTone}`}>{icon}</div></div><p className="font-mono text-xl sm:text-2xl font-black tracking-tight">{formatRupiah(amount)}</p></div>;
}

function Field({ label, placeholder, value, onChange, inputMode }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; inputMode?: 'numeric' }) {
  return <label className="block"><span className="label-xs">{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} className="mt-2 w-full rounded-xl border border-sage-200 px-4 py-3 text-sm text-sage-800 outline-none focus:border-sage-500" /></label>;
}

function MonthYearPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [year, month] = value.split('-').map(Number);
  const years = Array.from({ length: 61 }, (_, index) => new Date().getFullYear() - 50 + index);
  const monthNames = Array.from({ length: 12 }, (_, index) => format(new Date(2024, index, 1), 'MMMM', { locale: localeId }));

  function updateMonth(nextMonth: number) {
    onChange(`${year}-${String(nextMonth).padStart(2, '0')}`);
  }
  function updateYear(nextYear: number) {
    onChange(`${nextYear}-${String(month).padStart(2, '0')}`);
  }

  return (
    <fieldset className="rounded-2xl border border-sage-100 bg-sage-50/70 p-4 sm:p-5">
      <legend className="sr-only">Bulan dan tahun pembayaran</legend>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-white text-sage-600 flex items-center justify-center shadow-sm border border-sage-100"><CalendarDays className="w-5 h-5" /></div>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sage-400">Bulan pembayaran</p><p className="font-display text-lg font-bold text-sage-900 capitalize">{monthLabel(value)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className="text-[10px] font-bold uppercase tracking-widest text-sage-400">Bulan</span><select value={month} onChange={event => updateMonth(Number(event.target.value))} className="mt-1.5 w-full appearance-none rounded-xl border border-sage-200 bg-white px-3 py-3 text-sm font-semibold text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200">
          {monthNames.map((name, index) => <option key={name} value={index + 1} className="capitalize">{name}</option>)}
        </select></label>
        <label className="block"><span className="text-[10px] font-bold uppercase tracking-widest text-sage-400">Tahun</span><select value={year} onChange={event => updateYear(Number(event.target.value))} className="mt-1.5 w-full appearance-none rounded-xl border border-sage-200 bg-white px-3 py-3 text-sm font-semibold text-sage-800 outline-none focus:border-sage-500 focus:ring-2 focus:ring-sage-200">
          {years.map(option => <option key={option} value={option}>{option}</option>)}
        </select></label>
      </div>
    </fieldset>
  );
}
