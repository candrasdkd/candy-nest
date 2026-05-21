import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Sparkles, Plus, Wallet, FileText, ArrowUpDown, Layout as LayoutIcon,
  Settings, StickyNote, X, CornerDownLeft, Eye, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotes } from '../hooks/useNotes';
import { useDocuments } from '../hooks/useDocuments';
import { useDataStore } from '../store/useDataStore';
import { useSavingsStore } from '../store/useSavingsStore';
import { formatRupiah, getCategoryInfo } from '../types';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StaticAction {
  id: string;
  label: string;
  keywords: string;
  icon: any;
  path: string;
  color: string;
}

const staticActions: StaticAction[] = [
  { id: 'add-tx', label: 'Tambah Transaksi', keywords: 'keuangan masuk keluar beli bayar belanja baru tambah', icon: Plus, path: '/transactions?action=add', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { id: 'add-note', label: 'Tambah Catatan Baru', keywords: 'memo penting resep nulis list info ide', icon: StickyNote, path: '/notes?action=add', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { id: 'add-doc', label: 'Unggah Dokumen KTP/Struk', keywords: 'scan ocr pdf ktp sim npwp invoice berkas', icon: FileText, path: '/documents?action=add', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'add-pot', label: 'Buat Pos Tabungan Baru', keywords: 'saving amplop target celengan tabung pos', icon: Wallet, path: '/savings?action=add', color: 'text-sage-700 bg-sage-50 border-sage-100' },
  { id: 'go-dashboard', label: 'Buka Dashboard Utama', keywords: 'beranda stats ringkasan home', icon: LayoutIcon, path: '/dashboard', color: 'text-sage-500 bg-sage-50 border-sage-100' },
  { id: 'go-tx', label: 'Lihat Riwayat Transaksi', keywords: 'uang history pengeluaran pemasukan', icon: ArrowUpDown, path: '/transactions', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { id: 'go-pots', label: 'Atur Pos Tabungan', keywords: 'alokasi celengan tabung', icon: Wallet, path: '/savings', color: 'text-sage-800 bg-sage-50 border-sage-100' },
  { id: 'go-notes', label: 'Buka Catatan Keluarga', keywords: 'notes ide resep daftar', icon: StickyNote, path: '/notes', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { id: 'go-docs', label: 'Buka Dokumen Bersama', keywords: 'cloud scanner berkas ocr', icon: FileText, path: '/documents', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'go-settings', label: 'Buka Pengaturan Profil', keywords: 'akun pasang hubung ganti password', icon: Settings, path: '/settings', color: 'text-sage-400 bg-sage-50 border-sage-100' },
];

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auth and reactive stores subscription
  const coupleId = useAuthStore(s => s.userProfile?.coupleId);
  const initTransactions = useDataStore(s => s.initTransactions);
  const initPots = useSavingsStore(s => s.initPots);

  const transactions = useDataStore(s => s.transactions);
  const pots = useSavingsStore(s => s.pots);
  
  // Reactively subscribe to notes and documents which fire internally inside hooks on mount
  const { notes } = useNotes();
  const { documents } = useDocuments();

  // Initialize listeners if search is open to make sure store cache is hydrated
  useEffect(() => {
    if (isOpen && coupleId) {
      const unsubTx = initTransactions();
      const unsubPots = initPots();
      return () => {
        unsubTx();
        unsubPots();
      };
    }
  }, [isOpen, coupleId, initTransactions, initPots]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Helper matching function
  const matches = (source: string | null | undefined, term: string) => {
    if (!source) return false;
    return source.toLowerCase().includes(term.toLowerCase());
  };

  // 1. Filter Quick Actions
  const filteredActions = useMemo(() => {
    if (!isOpen) return [];
    if (!query) return staticActions;
    return staticActions.filter(
      act => matches(act.label, query) || matches(act.keywords, query)
    );
  }, [query, isOpen]);

  // 2. Filter Notes
  const filteredNotes = useMemo(() => {
    if (!isOpen || !query) return [];
    return notes.filter(
      note => matches(note.title, query) || matches(note.content, query)
    );
  }, [notes, query, isOpen]);

  // 3. Filter Documents (by name, extractedText, or OCR fields)
  const filteredDocuments = useMemo(() => {
    if (!isOpen || !query) return [];
    return documents.filter(doc => {
      const nameMatch = matches(doc.name, query);
      const ocrMatch = matches(doc.extractedText, query);
      const fieldsMatch = doc.fields?.some(f => matches(f.value, query)) || false;
      return nameMatch || ocrMatch || fieldsMatch;
    });
  }, [documents, query, isOpen]);

  // 4. Filter Transactions (by description, category label, or amount)
  const filteredTransactions = useMemo(() => {
    if (!isOpen || !query) return [];
    return transactions.filter(tx => {
      const catInfo = getCategoryInfo(tx.category);
      const descMatch = matches(tx.description, query);
      const catMatch = matches(catInfo.label, query);
      const amountMatch = tx.amount.toString().includes(query) || formatRupiah(tx.amount).includes(query);
      return descMatch || catMatch || amountMatch;
    });
  }, [transactions, query, isOpen]);

  // 5. Filter Savings Pots (by name)
  const filteredPots = useMemo(() => {
    if (!isOpen || !query) return [];
    return pots.filter(pot => matches(pot.name, query));
  }, [pots, query, isOpen]);

  // Pre-flattened list for seamless arrow navigation
  const flatResults = useMemo(() => {
    if (!isOpen) return [];
    if (!query) {
      return filteredActions.map(act => ({ type: 'action', id: act.id, data: act }));
    }
    const results: any[] = [];
    filteredActions.forEach(act => results.push({ type: 'action', id: act.id, data: act }));
    filteredPots.forEach(pot => results.push({ type: 'pot', id: pot.id, data: pot }));
    filteredTransactions.forEach(tx => results.push({ type: 'transaction', id: tx.id, data: tx }));
    filteredDocuments.forEach(doc => results.push({ type: 'document', id: doc.id, data: doc }));
    filteredNotes.forEach(note => results.push({ type: 'note', id: note.id, data: note }));
    return results;
  }, [query, filteredActions, filteredPots, filteredTransactions, filteredDocuments, filteredNotes, isOpen]);

  // Re-group for semantic section layout but mapping flat indices
  const sections = useMemo(() => {
    if (!isOpen) return [];
    const secList: { title: string; type: string; items: any[] }[] = [];
    let currentIndex = 0;

    const actions = flatResults.filter(r => r.type === 'action');
    if (actions.length > 0) {
      secList.push({
        title: query ? 'Aksi Cepat Cocok' : 'Aksi Cepat',
        type: 'action',
        items: actions.map(item => ({ ...item, absoluteIndex: currentIndex++ }))
      });
    }

    const potsList = flatResults.filter(r => r.type === 'pot');
    if (potsList.length > 0) {
      secList.push({
        title: 'Pos Tabungan',
        type: 'pot',
        items: potsList.map(item => ({ ...item, absoluteIndex: currentIndex++ }))
      });
    }

    const txs = flatResults.filter(r => r.type === 'transaction');
    if (txs.length > 0) {
      secList.push({
        title: 'Transaksi Keuangan',
        type: 'transaction',
        items: txs.map(item => ({ ...item, absoluteIndex: currentIndex++ }))
      });
    }

    const docs = flatResults.filter(r => r.type === 'document');
    if (docs.length > 0) {
      secList.push({
        title: 'Dokumen & Hasil Scan OCR',
        type: 'document',
        items: docs.map(item => ({ ...item, absoluteIndex: currentIndex++ }))
      });
    }

    const nts = flatResults.filter(r => r.type === 'note');
    if (nts.length > 0) {
      secList.push({
        title: 'Catatan & Memo',
        type: 'note',
        items: nts.map(item => ({ ...item, absoluteIndex: currentIndex++ }))
      });
    }

    return secList;
  }, [flatResults, query, isOpen]);

  // Navigation handlers
  const handleSelect = (item: any) => {
    if (!item) return;
    onClose();
    if (item.type === 'action') {
      navigate(item.data.path);
    } else if (item.type === 'note') {
      navigate(`/notes?id=${item.id}`);
    } else if (item.type === 'document') {
      navigate(`/documents?id=${item.id}`);
    } else if (item.type === 'transaction') {
      navigate(`/transactions?id=${item.id}`);
    } else if (item.type === 'pot') {
      navigate('/savings');
    }
  };

  // Keyboard navigation effects
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (flatResults.length > 0 ? (prev + 1) % flatResults.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (flatResults.length > 0 ? (prev - 1 + flatResults.length) % flatResults.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatResults, selectedIndex]);

  // Scroll active item smoothly into view
  useEffect(() => {
    const activeEl = document.getElementById(`search-item-${selectedIndex}`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Format date helper safely
  const formatTxDate = (isoStr: string) => {
    try {
      return format(parseISO(isoStr), 'dd MMM yyyy', { locale: localeId });
    } catch {
      return isoStr || 'Hari ini';
    }
  };

  // Extract relevant OCR scan match snippet
  const getOcrSnippet = (doc: any, term: string) => {
    if (!term) return null;
    
    // First check OCR fields
    const matchingField = doc.fields?.find((f: any) => matches(f.value, term));
    if (matchingField) {
      return (
        <span className="text-[10px] text-sage-500 font-bold bg-sage-50 border border-sage-100/50 px-2 py-0.5 rounded-md mt-1 inline-block">
          Cocok di Field [{matchingField.key}]: "{matchingField.value}"
        </span>
      );
    }

    // Next check raw scan text
    const text = doc.extractedText || '';
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx !== -1) {
      const start = Math.max(0, idx - 15);
      const end = Math.min(text.length, idx + term.length + 15);
      const snippet = text.slice(start, end).replace(/\n/g, ' ');
      return (
        <span className="text-[10px] text-sage-400 font-medium italic mt-1 block">
          Scan Cocok: "...{snippet}..."
        </span>
      );
    }
    return null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4 md:px-0">
          {/* Sleek Fading Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-sage-950/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Spotlight Command Modal Container */}
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-white border border-sage-100 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(40,54,42,0.15)] overflow-hidden flex flex-col max-h-[70vh]"
          >
            {/* Modern Header Search Field */}
            <div className="flex items-center gap-3.5 px-6 py-5 border-b border-sage-50 flex-shrink-0">
              <Search className="w-5 h-5 text-sage-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Cari apa saja di CandyNest..."
                className="flex-1 bg-transparent border-none text-sage-900 placeholder-sage-400 focus:outline-none focus:ring-0 text-sm font-medium tracking-tight"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setSelectedIndex(0);
                  }}
                  className="p-1 text-sage-400 hover:text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1 bg-sage-50 px-2.5 py-1.5 rounded-xl text-[9px] font-black text-sage-400 uppercase tracking-widest border border-sage-100/50 flex-shrink-0 select-none">
                ESC
              </div>
            </div>

            {/* Scrollable Results Container */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide space-y-5">
              {flatResults.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 bg-sage-50 rounded-[1.8rem] flex items-center justify-center mx-auto text-sage-400 mb-4 border border-dashed border-sage-100">
                    🔍
                  </div>
                  <p className="font-display font-bold text-sage-800 text-lg">Tidak ada hasil ditemukan</p>
                  <p className="text-xs text-sage-400 mt-1 font-medium max-w-xs mx-auto">
                    Coba cari dengan kata kunci lain untuk menemukan catatan, transaksi, dokumen ocr, atau aksi cepat.
                  </p>
                </div>
              ) : (
                sections.map(section => (
                  <div key={section.title} className="space-y-1.5">
                    {/* Section Header */}
                    <h3 className="px-4 text-[10px] font-bold text-sage-400 uppercase tracking-[0.25em] flex items-center gap-2">
                      {section.type === 'action' && <Sparkles className="w-3.5 h-3.5 text-rose-400 fill-rose-100" />}
                      <span>{section.title}</span>
                    </h3>

                    {/* Section Items */}
                    <div className="space-y-1">
                      {section.items.map(item => {
                        const isActive = item.absoluteIndex === selectedIndex;

                        return (
                          <div
                            key={item.id}
                            id={`search-item-${item.absoluteIndex}`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(item.absoluteIndex)}
                            className={`group px-4 py-3.5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 border ${
                              isActive
                                ? 'bg-sage-50/70 border-sage-100/70 shadow-sm translate-x-1'
                                : 'bg-transparent border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              {/* Left Icon Panel */}
                              {item.type === 'action' && (
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${item.data.color}`}>
                                  <item.data.icon className="w-4 h-4" />
                                </div>
                              )}

                              {item.type === 'pot' && (
                                <div className="w-10 h-10 rounded-xl bg-sage-50 border border-sage-100 flex items-center justify-center text-xl shrink-0">
                                  {item.data.emoji}
                                </div>
                              )}

                              {item.type === 'transaction' && (
                                <div className="w-10 h-10 rounded-xl bg-sage-50 border border-sage-100 flex items-center justify-center text-xl shrink-0">
                                  {(() => {
                                    const catInfo = getCategoryInfo(item.data.category);
                                    return <catInfo.icon className="w-5 h-5 text-sage-500" />;
                                  })()}
                                </div>
                              )}

                              {item.type === 'document' && (
                                <div className="w-10 h-10 rounded-xl bg-sage-50 border border-sage-100 flex items-center justify-center shrink-0 text-sage-400">
                                  <FileText className="w-5 h-5" />
                                </div>
                              )}

                              {item.type === 'note' && (
                                <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.data.color}20`, borderColor: item.data.color }}>
                                  <StickyNote className="w-5 h-5" style={{ color: item.data.color }} />
                                </div>
                              )}

                              {/* Text Info */}
                              <div className="min-w-0">
                                {item.type === 'action' && (
                                  <p className="font-bold text-sage-800 text-sm tracking-tight">{item.data.label}</p>
                                )}

                                {item.type === 'pot' && (
                                  <div>
                                    <p className="font-bold text-sage-800 text-sm tracking-tight">{item.data.name}</p>
                                    <p className="text-[10px] text-sage-400 font-semibold mt-0.5 flex items-center gap-1">
                                      <span>Terkumpul: {formatRupiah(item.data.currentBalance)}</span>
                                      {item.data.targetAmount && (
                                        <>
                                          <span>·</span>
                                          <span>Target: {formatRupiah(item.data.targetAmount)}</span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                )}

                                {item.type === 'transaction' && (
                                  <div>
                                    <p className="font-bold text-sage-800 text-sm tracking-tight truncate">
                                      {item.data.description || getCategoryInfo(item.data.category).label}
                                    </p>
                                    <p className="text-[10px] text-sage-400 font-semibold mt-0.5 flex items-center gap-1.5">
                                      <span>{formatTxDate(item.data.date)}</span>
                                      <span>·</span>
                                      <span className="text-sage-500 uppercase font-black text-[8px] tracking-wider">{item.data.addedBy}</span>
                                    </p>
                                  </div>
                                )}

                                {item.type === 'document' && (
                                  <div>
                                    <p className="font-bold text-sage-800 text-sm tracking-tight truncate">{item.data.name}</p>
                                    <p className="text-[10px] text-sage-400 font-semibold mt-0.5 flex items-center gap-1.5">
                                      <span className="uppercase text-[8px] bg-sage-100 text-sage-600 px-1.5 py-0.5 rounded-md font-bold tracking-wide">
                                        {item.data.category}
                                      </span>
                                      <span>·</span>
                                      <span>Oleh {item.data.uploadedBy}</span>
                                    </p>
                                    {getOcrSnippet(item.data, query)}
                                  </div>
                                )}

                                {item.type === 'note' && (
                                  <div>
                                    <p className="font-bold text-sage-800 text-sm tracking-tight truncate">{item.data.title || 'Tanpa Judul'}</p>
                                    <p className="text-[10px] text-sage-400 font-medium truncate max-w-sm mt-0.5">
                                      {item.data.content || 'Kosong'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Decorative Elements */}
                            <div className="flex items-center gap-2 shrink-0">
                              {item.type === 'transaction' && (
                                <span className={`font-mono text-xs font-black tracking-tight ${item.data.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {item.data.type === 'income' ? '+' : '-'}{formatRupiah(item.data.amount)}
                                </span>
                              )}

                              {item.type === 'pot' && (
                                <span className="font-mono text-xs font-black tracking-tight text-sage-800">
                                  {formatRupiah(item.data.currentBalance)}
                                </span>
                              )}

                              {/* Quick Go Indicators */}
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                isActive ? 'bg-sage-800 text-white shadow-md rotate-0' : 'bg-sage-50 text-sage-300 opacity-0 group-hover:opacity-100 scale-90'
                              }`}>
                                {isActive ? <CornerDownLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Spot Light Footer Help Panel */}
            <div className="px-6 py-4.5 bg-sage-50/50 border-t border-sage-50 flex items-center justify-between text-[10px] text-sage-400 font-bold tracking-wide uppercase flex-shrink-0 select-none">
              <div className="flex items-center gap-4.5">
                <span className="flex items-center gap-1.5">
                  <span className="bg-white border border-sage-200 shadow-sm px-1.5 py-0.5 rounded-md text-sage-500">↑↓</span>
                  Pilih
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-white border border-sage-200 shadow-sm px-1.5 py-0.5 rounded-md text-sage-500">ENTER</span>
                  Buka
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Cari instant dari mana saja</span>
                <span className="bg-white border border-sage-200 shadow-sm px-1.5 py-0.5 rounded-md text-sage-500 font-black ml-1">⌘ K</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
