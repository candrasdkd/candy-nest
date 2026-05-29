import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Calculator,
  Wallet,
  Sparkles,
  ArrowRightLeft,
  Share2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatRupiah, parseRupiah, MonthlyAllocation } from '../types';

export default function MonthlyAllocationTable({ 
  hideActions = false,
  hideBalance = false 
}: { 
  hideActions?: boolean;
  hideBalance?: boolean;
}) {
  const { userProfile } = useAuthStore();
  const { 
    allocations, 
    initAllocations, 
    addAllocation, 
    updateAllocation, 
    deleteAllocation 
  } = useDataStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!hideActions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', amountA: 0, amountB: 0 });
  const [editValues, setEditValues] = useState({ name: '', amountA: 0, amountB: 0 });

  useEffect(() => {
    const unsub = initAllocations();
    return () => unsub();
  }, [initAllocations]);

  const handleAdd = async () => {
    if (!newItem.name || !userProfile) return;
    await addAllocation({ 
      name: newItem.name,
      amountA: newItem.amountA,
      userIdA: userProfile.uid,
      amountB: newItem.amountB,
      userIdB: userProfile.partnerUid || 'partner',
      order: allocations.length 
    });
    setNewItem({ name: '', amountA: 0, amountB: 0 });
  };

  const startEdit = (item: MonthlyAllocation) => {
    if (hideActions) return;
    setEditingId(item.id);
    
    // Map internal A/B to display Left/Right based on current user's UID
    const isUserA = item.userIdA === userProfile?.uid;
    setEditValues({ 
      name: item.name, 
      amountA: isUserA ? item.amountA : item.amountB, 
      amountB: isUserA ? item.amountB : item.amountA 
    });
  };

  const handleUpdate = async (id: string) => {
    const item = allocations.find(a => a.id === id);
    if (!item || !userProfile) return;

    const isUserA = item.userIdA === userProfile.uid;
    const updateData = {
      name: editValues.name,
      amountA: isUserA ? editValues.amountA : editValues.amountB,
      amountB: isUserA ? editValues.amountB : editValues.amountA,
    };

    await updateAllocation(id, updateData);
    setEditingId(null);
  };

  const totalA = allocations.reduce((acc, curr) => {
    const isUserA = curr.userIdA === userProfile?.uid;
    return acc + (isUserA ? curr.amountA : curr.amountB);
  }, 0);

  const totalB = allocations.reduce((acc, curr) => {
    const isUserA = curr.userIdA === userProfile?.uid;
    return acc + (isUserA ? curr.amountB : curr.amountA);
  }, 0);

  const grandTotal = totalA + totalB;

  const handleShare = async () => {
    const header = `📊 *Perencanaan Bulanan Candy Financial*\n---------------------------------\n`;
    const body = allocations.map(item => {
      const isUserA = item.userIdA === userProfile?.uid;
      const amtA = isUserA ? item.amountA : item.amountB;
      const amtB = isUserA ? item.amountB : item.amountA;
      return `${item.name}:\n   - ${userProfile?.displayName || 'Saya'}: ${formatRupiah(amtA)}\n   - ${userProfile?.partnerName || 'Pasangan'}: ${formatRupiah(amtB)}`;
    }).join('\n\n');
    
    const footer = `\n---------------------------------\nTotal ${userProfile?.displayName || 'Saya'}: ${formatRupiah(totalA)}\nTotal ${userProfile?.partnerName || 'Pasangan'}: ${formatRupiah(totalB)}\n*Grand Total: ${formatRupiah(grandTotal)}*`;
    
    const text = header + body + footer;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Perencanaan Bulanan Candy Financial',
          text: text,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(text);
      alert('Rincian perencanaan berhasil disalin ke clipboard!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      {/* Decorative background elements */}
      <div className="absolute -inset-1 bg-gradient-to-r from-sage-200 to-rose-200 rounded-[2.5rem] sm:rounded-[3.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-white/80 backdrop-blur-2xl rounded-[2rem] sm:rounded-[3rem] border border-white p-4 sm:p-6 md:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] overflow-hidden">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 md:mb-8">
          <div className="space-y-1.5 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-sage-500">
              <Sparkles className="w-4 h-4 fill-sage-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Planning Guide</span>
            </div>
            <h3 className="font-display text-3xl text-sage-900 tracking-tight">Alokasi Bulanan</h3>
            <p className="text-sm text-sage-400 font-medium">Atur siapa bayar apa untuk bulan ini secara transparan.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold bg-white border border-sage-100 text-sage-600 hover:bg-sage-50 shadow-sm transition-all text-xs sm:text-sm"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span>{isExpanded ? 'Tutup' : 'Rincian'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold bg-sage-50 text-sage-600 hover:bg-sage-100 transition-all text-xs sm:text-sm"
                title="Bagikan Rincian"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan</span>
              </button>
            </div>

            {!hideActions && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold transition-all duration-300 text-xs sm:text-sm ${isEditing ? 'bg-sage-100 text-sage-700 hover:bg-sage-200' : 'bg-sage-800 text-white shadow-xl shadow-sage-900/10 hover:bg-sage-900 hover:-translate-y-0.5 active:translate-y-0'}`}
              >
                {isEditing ? <Check className="w-4.5 h-4.5 stroke-[2.5]" /> : <Edit2 className="w-4 h-4" />}
                <span>{isEditing ? 'Simpan' : 'Kelola Alokasi'}</span>
              </button>
            )}
          </div>
        </div>

        {/* The Grid-based "Table" */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 mb-8">
                {/* Header Row */}
                <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr] items-center gap-4 px-6 py-4 border-b border-sage-50">
                  <span className="text-[10px] font-bold text-sage-300 uppercase tracking-[0.2em]">Keterangan</span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-sage-600 uppercase tracking-widest bg-sage-50 px-3 py-1 rounded-full mb-1">{userProfile?.displayName || 'Saya'}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-full mb-1">{userProfile?.partnerName || 'Pasangan'}</span>
                  </div>
                </div>

                {/* Allocation Rows */}
                <div className="divide-y divide-sage-50/50">
                  <AnimatePresence mode="popLayout">
                    {allocations.map((item) => {
                      const isUserA = item.userIdA === userProfile?.uid;
                      const displayAmountA = isUserA ? item.amountA : item.amountB;
                      const displayAmountB = isUserA ? item.amountB : item.amountA;

                      return (
                        <motion.div 
                          layout
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr] items-start md:items-center gap-3.5 md:gap-4 px-4 sm:px-6 py-5 group/row hover:bg-sage-50/40 transition-all rounded-2xl relative border-b border-sage-50 md:border-none"
                        >
                          {editingId === item.id ? (
                            <>
                              {/* Mobile Edit Mode Layout */}
                              <div className="flex flex-col gap-3.5 md:hidden w-full bg-sage-50/50 p-4 rounded-[1.5rem] border border-sage-100/50 shadow-inner">
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest ml-1">Keterangan</label>
                                  <input
                                    type="text"
                                    value={editValues.name}
                                    onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                    className="bg-white border-2 border-sage-100 rounded-xl px-4 py-2.5 text-base w-full focus:outline-none focus:border-sage-500 shadow-sm font-bold text-sage-900"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-sage-600 uppercase tracking-widest bg-sage-100/70 px-2.5 py-1 rounded-full inline-block">{userProfile?.displayName || 'Saya'}</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400 text-xs font-bold">Rp</span>
                                      <input
                                        type="text"
                                        value={formatRupiah(editValues.amountA)}
                                        onChange={(e) => setEditValues({ ...editValues, amountA: parseRupiah(e.target.value) })}
                                        className="bg-white border-2 border-sage-100 rounded-xl pl-8 pr-3 py-2 text-base w-full focus:outline-none focus:border-sage-500 shadow-sm font-mono font-bold text-sage-800"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-rose-500 uppercase tracking-widest bg-rose-100/70 px-2.5 py-1 rounded-full inline-block">{userProfile?.partnerName || 'Pasangan'}</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold">Rp</span>
                                      <input
                                        type="text"
                                        value={formatRupiah(editValues.amountB)}
                                        onChange={(e) => setEditValues({ ...editValues, amountB: parseRupiah(e.target.value) })}
                                        className="bg-white border-2 border-rose-100 rounded-xl pl-8 pr-3 py-2 text-base w-full focus:outline-none focus:border-rose-500 shadow-sm font-mono font-bold text-rose-800"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="flex-1 py-3 rounded-xl text-sage-500 hover:bg-sage-100 hover:text-sage-700 font-bold text-xs uppercase transition-all"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdate(item.id)}
                                    className="flex-1 py-3 bg-sage-800 text-white rounded-xl font-bold text-xs uppercase hover:bg-sage-900 shadow-md active:scale-95 transition-all"
                                  >
                                    Simpan
                                  </button>
                                </div>
                              </div>

                              {/* Desktop Edit Mode Layout */}
                              <div className="hidden md:contents">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editValues.name}
                                  onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                                  onBlur={() => handleUpdate(item.id)}
                                  className="bg-white border-2 border-sage-100 rounded-xl px-4 py-2 text-base md:text-sm w-full focus:outline-none focus:border-sage-500 shadow-inner"
                                />
                                <div className="text-right">
                                  <input
                                    type="text"
                                    value={formatRupiah(editValues.amountA)}
                                    onChange={(e) => setEditValues({ ...editValues, amountA: parseRupiah(e.target.value) })}
                                    onBlur={() => handleUpdate(item.id)}
                                    className="bg-white border-2 border-sage-100 rounded-xl px-4 py-2 text-base md:text-sm w-full text-right focus:outline-none focus:border-sage-500 shadow-inner"
                                  />
                                </div>
                                <div className="text-right">
                                  <input
                                    type="text"
                                    value={formatRupiah(editValues.amountB)}
                                    onChange={(e) => setEditValues({ ...editValues, amountB: parseRupiah(e.target.value) })}
                                    onBlur={() => handleUpdate(item.id)}
                                    className="bg-white border-2 border-rose-100 rounded-xl px-4 py-2 text-base md:text-sm w-full text-right focus:outline-none focus:border-rose-500 shadow-inner"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {/* Display Mode Layout */}
                              <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
                                <div className="flex items-center gap-3">
                                  {!hideActions && isEditing && (
                                    <button onClick={() => deleteAllocation(item.id)} className="p-1.5 text-rose-300 hover:bg-rose-100 hover:text-rose-500 rounded-lg transition-colors shrink-0">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <span 
                                    className="text-sm font-bold text-sage-800 cursor-pointer hover:text-sage-950 transition-colors" 
                                    onClick={() => !hideActions && isEditing && startEdit(item)}
                                  >
                                    {item.name}
                                  </span>
                                </div>
                                
                                {!hideActions && isEditing && (
                                  <button 
                                    onClick={() => startEdit(item)} 
                                    className="md:hidden p-1.5 bg-sage-50 border border-sage-100 text-sage-500 rounded-lg hover:bg-sage-100 transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Mobile Only: Split Amount View */}
                              <div className="grid grid-cols-2 gap-3 w-full md:hidden mt-1">
                                <div 
                                  className="bg-sage-50/50 p-3 rounded-2xl border border-sage-100/30 flex flex-col gap-0.5" 
                                  onClick={() => !hideActions && isEditing && startEdit(item)}
                                >
                                  <span className="text-[9px] font-bold text-sage-500 uppercase tracking-widest">{userProfile?.displayName || 'Saya'}</span>
                                  <span className={`text-sm font-mono font-bold ${displayAmountA > 0 ? 'text-sage-700' : 'text-sage-200'}`}>
                                    {hideBalance ? 'Rp ••••••' : (displayAmountA > 0 ? formatRupiah(displayAmountA) : 'Rp 0')}
                                  </span>
                                </div>
                                
                                <div 
                                  className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100/30 flex flex-col gap-0.5" 
                                  onClick={() => !hideActions && isEditing && startEdit(item)}
                                >
                                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">{userProfile?.partnerName || 'Pasangan'}</span>
                                  <span className={`text-sm font-mono font-bold ${displayAmountB > 0 ? 'text-rose-600' : 'text-rose-200'}`}>
                                    {hideBalance ? 'Rp ••••••' : (displayAmountB > 0 ? formatRupiah(displayAmountB) : 'Rp 0')}
                                  </span>
                                </div>
                              </div>

                              {/* Desktop Only Columns */}
                              <div 
                                className="hidden md:block text-right cursor-pointer w-full" 
                                onClick={() => !hideActions && isEditing && startEdit(item)}
                              >
                                <span className={`text-sm font-mono font-bold ${displayAmountA > 0 ? 'text-sage-700' : 'text-sage-200'}`}>
                                  {hideBalance ? 'Rp ••••••' : (displayAmountA > 0 ? formatRupiah(displayAmountA) : 'Rp 0')}
                                </span>
                              </div>

                              <div 
                                className="hidden md:block text-right cursor-pointer w-full" 
                                onClick={() => !hideActions && isEditing && startEdit(item)}
                              >
                                <span className={`text-sm font-mono font-bold ${displayAmountB > 0 ? 'text-rose-600' : 'text-rose-200'}`}>
                                  {hideBalance ? 'Rp ••••••' : (displayAmountB > 0 ? formatRupiah(displayAmountB) : 'Rp 0')}
                                </span>
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

            {/* Add New Item Row */}
            {!hideActions && isEditing && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4 md:grid md:grid-cols-[2fr_1fr_1fr] md:items-center px-4 sm:px-6 py-6 bg-sage-50/30 rounded-[2rem] mt-4 border-2 border-dashed border-sage-100"
              >
                {/* Column 1: Name */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest ml-1 md:hidden">Nama Alokasi</label>
                  <input
                    type="text"
                    placeholder="Keterangan baru..."
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="bg-white border-2 border-transparent rounded-xl px-4 py-3 text-base md:text-sm w-full focus:outline-none focus:border-sage-300 shadow-sm transition-all font-bold text-sage-900 placeholder:font-medium"
                  />
                </div>

                {/* Column 2: Amount A */}
                <div className="space-y-1.5 w-full">
                  <label className="text-[9px] font-bold text-sage-600 uppercase tracking-widest bg-sage-100/50 px-2.5 py-1 rounded-full inline-block md:hidden">{userProfile?.displayName || 'Saya'}</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-400 text-xs font-bold md:hidden">Rp</span>
                    <input
                      type="text"
                      placeholder="Rp 0"
                      value={formatRupiah(newItem.amountA)}
                      onChange={(e) => setNewItem({ ...newItem, amountA: parseRupiah(e.target.value) })}
                      className="bg-white border-2 border-transparent rounded-xl pl-8 pr-4 md:px-4 py-3 text-base md:text-sm w-full text-left md:text-right focus:outline-none focus:border-sage-300 shadow-sm transition-all font-mono font-bold text-sage-800"
                    />
                  </div>
                </div>

                {/* Column 3: Amount B & Actions */}
                <div className="space-y-1.5 w-full flex flex-col md:block">
                  <label className="text-[9px] font-bold text-rose-500 uppercase tracking-widest bg-rose-100/50 px-2.5 py-1 rounded-full inline-block self-start mb-1 md:hidden">{userProfile?.partnerName || 'Pasangan'}</label>
                  <div className="flex items-center gap-3 w-full">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-400 text-xs font-bold md:hidden">Rp</span>
                      <input
                        type="text"
                        placeholder="Rp 0"
                        value={formatRupiah(newItem.amountB)}
                        onChange={(e) => setNewItem({ ...newItem, amountB: parseRupiah(e.target.value) })}
                        className="bg-white border-2 border-transparent rounded-xl pl-8 pr-4 md:px-4 py-3 text-base md:text-sm w-full text-left md:text-right focus:outline-none focus:border-sage-300 shadow-sm transition-all font-mono font-bold text-rose-800"
                      />
                    </div>
                    <button
                      onClick={handleAdd}
                      disabled={!newItem.name}
                      className="w-12 h-12 bg-sage-800 text-white rounded-xl flex items-center justify-center hover:bg-sage-900 disabled:opacity-30 transition-all shadow-lg active:scale-95 shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
              </div>
            </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Stats Section */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-6 border-t border-sage-50/50">
          <div className="p-4 sm:p-6 bg-sage-50 rounded-[1.8rem] sm:rounded-[2rem] border border-sage-100 flex items-center justify-between group/total transition-all hover:bg-sage-100/50">
            <div>
              <p className="text-[10px] font-bold text-sage-400 uppercase tracking-widest mb-1">Total {userProfile?.displayName || 'Candra'}</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-sage-900">{hideBalance ? 'Rp ••••••' : formatRupiah(totalA)}</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sage-500 shadow-sm group-hover/total:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-rose-50 rounded-[1.8rem] sm:rounded-[2rem] border border-rose-100 flex items-center justify-between group/total transition-all hover:bg-rose-100/50">
            <div>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Total {userProfile?.partnerName || 'Diny'}</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-sage-900">{hideBalance ? 'Rp ••••••' : formatRupiah(totalB)}</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-400 shadow-sm group-hover/total:scale-110 transition-transform">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 sm:p-6 bg-gradient-to-br from-sage-800 to-sage-950 rounded-[1.8rem] sm:rounded-[2rem] shadow-2xl shadow-sage-900/20 flex items-center justify-between group/total transition-all hover:scale-[1.02]">
            <div>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Grand Total</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-white">{hideBalance ? 'Rp ••••••' : formatRupiah(grandTotal)}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner group-hover/total:rotate-12 transition-transform">
              <Calculator className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
