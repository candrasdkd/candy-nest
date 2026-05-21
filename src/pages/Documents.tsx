import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Upload, FileText, ChevronDown, FolderOpen, Loader2, Filter, X, CheckCircle2, Download, User, AlertCircle } from 'lucide-react';
import { useDocuments, CATEGORY_INFO, DocCategory } from '../hooks/useDocuments';
import DocumentUploadModal from '../components/DocumentUploadModal';
import DocumentDetailModal from '../components/DocumentDetailModal';

const cv: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const iv: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 120 } }
};

const CATS = Object.entries(CATEGORY_INFO) as [DocCategory, typeof CATEGORY_INFO[DocCategory]][];

export default function Documents() {
  const {
    documents, loading, error, updateDocument,
    showUpload, setShowUpload,
    selected, setSelected,
    activeCat, setActiveCat,
    activePartnerId, setActivePartnerId,
    showCatDropdown, setShowCatDropdown,
    isSelectMode, setIsSelectMode,
    selectedIds, setSelectedIds,
    isExporting,
    partners,
    filtered,
    activeLabel,
    toggleDocSelection,
    handleExportPDF,
    handleDelete,
    getInitials,
    getUploaderName
  } = useDocuments();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const docId = searchParams.get('id');
  const action = searchParams.get('action');

  useEffect(() => {
    if (docId && documents.length > 0) {
      const foundDoc = documents.find(d => d.id === docId);
      if (foundDoc) {
        setSelected(foundDoc);
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [docId, documents, setSelected, searchParams, setSearchParams]);

  useEffect(() => {
    if (action === 'add') {
      setShowUpload(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [action, setShowUpload, searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-sage-300" />
        <p className="text-sm text-sage-400 font-medium">Menyusun brankas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 pt-10 md:pt-16 pb-32">
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
        <div className="space-y-2 text-center md:text-left">
          <h1 className="text-4xl font-display text-sage-900 tracking-tight">Katalog Berkas</h1>
          <p className="text-sage-500 text-sm font-medium">Simpan dan kelola dokumen penting keluarga.</p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if (isSelectMode) setSelectedIds([]);
            }}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-[1.5rem] font-bold transition-all active:scale-95 border ${isSelectMode ? 'bg-sage-100 border-sage-200 text-sage-700' : 'bg-white border-sage-100 text-sage-600'}`}
          >
            {isSelectMode ? <X className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            {isSelectMode ? 'Batal' : 'Pilih Berkas'}
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-sage-900 text-white rounded-[1.5rem] font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-95 group"
          >
            <Upload className="w-5 h-5" />
            Upload
          </button>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-white rounded-[1.5rem] p-2 border border-sage-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-10">
        <div className="relative flex-1 md:flex-none">
          <button
            onClick={() => setShowCatDropdown(!showCatDropdown)}
            className="w-full md:w-auto flex items-center justify-between md:justify-start gap-3 px-5 py-3 bg-white border border-sage-100 rounded-2xl text-sm font-bold text-sage-700 shadow-sm hover:border-sage-200 transition-all"
          >
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-sage-400" />
              <span>Kategori: <span className="text-sage-900 ml-1">{activeLabel}</span></span>
            </div>
            <ChevronDown className={`w-4 h-4 text-sage-300 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showCatDropdown && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-sage-950/80 z-[150]" onClick={() => setShowCatDropdown(false)} />
                <div className="fixed inset-0 flex items-end md:items-center justify-center z-[160] pointer-events-none pb-0 md:p-4">
                  <motion.div initial={{ opacity: 0, y: 100, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 100, scale: 0.95 }}
                    className="w-full md:w-[480px] bg-white border-t md:border border-sage-100 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl p-6 pb-10 md:pb-8 md:p-8 overflow-hidden max-h-[85vh] flex flex-col pointer-events-auto"
                  >
                    <div className="flex items-center justify-between mb-6 flex-shrink-0">
                      <p className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.15em] ml-1">Pilih Jenis Dokumen</p>
                      <button onClick={() => setShowCatDropdown(false)} className="md:hidden w-8 h-8 rounded-full bg-sage-50 flex items-center justify-center">
                        <X className="w-4 h-4 text-sage-400" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 md:gap-4 overflow-y-auto pr-1 scrollbar-hide flex-1">
                      <button onClick={() => { setActiveCat('all'); setShowCatDropdown(false); }}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${activeCat === 'all' ? 'bg-sage-900 border-sage-900 text-white shadow-xl' : 'bg-white border-sage-100 text-sage-600 hover:bg-sage-50'}`}
                      >
                        <div className="text-2xl mb-1">📂</div>
                        <div className="text-[10px] font-bold text-center leading-tight">Semua</div>
                      </button>
                      {CATS.map(([key, info]) => (
                        <button key={key} onClick={() => { setActiveCat(key); setShowCatDropdown(false); }}
                          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${activeCat === key ? 'bg-sage-900 border-sage-900 text-white shadow-xl' : 'bg-white border-sage-100 text-sage-600 hover:bg-sage-50'}`}
                        >
                          <div className="text-2xl mb-1">{info.emoji}</div>
                          <div className="text-[10px] font-bold text-center leading-tight">{info.label}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Partner Filter Pills */}
        {partners.length > 1 && (
          <div className="flex items-center gap-2 px-2 md:px-0 flex-wrap">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-sage-400 uppercase tracking-widest">
              <User className="w-3 h-3" />
              <span className="hidden md:inline">Pemilik</span>
            </div>
            <button
              onClick={() => setActivePartnerId('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${activePartnerId === 'all'
                ? 'bg-sage-900 text-white border-sage-900 shadow-sm'
                : 'bg-white text-sage-500 border-sage-100 hover:border-sage-200'
                }`}
            >
              Semua
            </button>
            {partners.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePartnerId(activePartnerId === p.id ? 'all' : p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${activePartnerId === p.id
                  ? 'bg-sage-900 text-white border-sage-900 shadow-sm'
                  : 'bg-white text-sage-600 border-sage-100 hover:border-sage-200'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-black ${activePartnerId === p.id ? 'bg-white/20' : 'bg-sage-100'
                  }`}>
                  {getInitials(p.name)}
                </div>
                <span className="max-w-[80px] truncate">{p.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 px-4 text-xs font-bold text-sage-400 uppercase tracking-widest ml-auto">
          <FolderOpen className="w-3.5 h-3.5" />
          {filtered.length} Berkas
        </div>
      </section>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-dashed border-sage-100 rounded-[3rem] py-20 px-10 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-sage-50 rounded-[2rem] flex items-center justify-center mx-auto border border-white">
            <FolderOpen className="w-8 h-8 text-sage-200" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-display text-sage-900">Belum ada dokumen</h3>
            <p className="text-sage-400 max-w-xs mx-auto text-sm leading-relaxed">Simpan dokumen penting keluarga kamu di sini.</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="px-8 py-3 bg-sage-50 text-sage-600 rounded-2xl font-bold hover:bg-sage-100 transition-colors inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </motion.div>
      ) : (
        <motion.div variants={cv} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 relative">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center">
                <p className="text-sage-300 font-medium italic">Tidak ada dokumen di kategori ini</p>
              </motion.div>
            ) : (
              filtered.map(doc => {
                const info = CATEGORY_INFO[doc.category];
                const safeUrls = doc.imageUrls || [doc.imageUrl!];
                const isSelected = selectedIds.includes(doc.id);
                const uploaderName = getUploaderName(doc);
                const initials = getInitials(uploaderName);

                return (
                  <motion.div
                    key={doc.id}
                    variants={iv}
                    layout
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    onClick={() => {
                      if (isSelectMode) {
                        toggleDocSelection(doc.id);
                      } else {
                        setSelected(doc);
                      }
                    }}
                    className={`group bg-white rounded-[1.75rem] overflow-hidden border transition-all duration-300 cursor-pointer relative ${
                      isSelected 
                        ? 'border-sage-900 shadow-2xl shadow-sage-900/20 ring-2 ring-sage-900/10' 
                        : 'border-sage-100/80 shadow-md hover:shadow-2xl hover:shadow-sage-900/10 hover:border-sage-200'
                    }`}
                  >
                    <div className="relative h-36 md:h-44 bg-sage-50 overflow-hidden">
                      {/* Image with smooth zoom on hover */}
                      <img 
                        src={safeUrls[0]} 
                        alt={doc.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                      />
                      
                      {/* Gradient Overlays for better contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-sage-900/60 via-sage-900/5 to-sage-900/30 opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                      
                      {/* Selection Overlay Tint */}
                      <div className={`absolute inset-0 bg-sage-900/40 transition-all duration-300 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />

                      {/* Select Indicator */}
                      {isSelectMode && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-lg ${
                            isSelected ? 'bg-sage-900 border-sage-900 text-white scale-110' : 'bg-black/20 border-white/80 text-white hover:bg-black/40'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                        </div>
                      )}

                      {/* Category Badge - Modern Glassmorphism */}
                      <div className="absolute top-3 left-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border bg-white/95 shadow-sm ${info.color.replace('bg-', 'text-')}`}>
                          <span className="text-sm leading-none">{info.emoji}</span>
                          <span className="hidden xs:inline tracking-wide">{info.label}</span>
                        </span>
                      </div>

                      {/* Direct Download Button */}
                      {!isSelectMode && (
                        <button
                          disabled={downloadingId === doc.id}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setDownloadingId(doc.id);
                            const urls = doc.imageUrls || [doc.imageUrl!];
                            try {
                              for (let i = 0; i < urls.length; i++) {
                                try {
                                  const response = await fetch(urls[i]);
                                  const blob = await response.blob();
                                  const blobUrl = window.URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = blobUrl;
                                  link.download = `${doc.name}_hal_${i + 1}.jpg`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  window.URL.revokeObjectURL(blobUrl);
                                } catch (err) {
                                  window.open(urls[i], '_blank');
                                }
                              }
                            } finally {
                              setDownloadingId(null);
                            }
                          }}
                          className={`absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg text-sage-600 hover:text-sage-900 transition-all z-20 hover:scale-105 active:scale-95 border border-sage-100 ${
                            downloadingId === doc.id ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                          }`}
                        >
                          {downloadingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-sage-900" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Multi-page indicator */}
                      {safeUrls.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/60 px-2.5 py-1 rounded-lg text-[10px] text-white font-bold border border-white/20 shadow-sm">
                          {safeUrls.length} hal
                        </div>
                      )}
                    </div>
                    
                    {/* Card Body */}
                    <div className="p-4 md:p-5 space-y-3 bg-white relative z-10">
                      <h3 className="font-bold text-sage-900 text-sm md:text-base line-clamp-1 group-hover:text-sage-700 transition-colors">{doc.name}</h3>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-sage-50/80">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-sage-50 flex items-center justify-center border border-sage-100/50">
                            <FileText className="w-3 h-3 text-sage-400" />
                          </div>
                          <span className="text-[10px] font-bold text-sage-500 uppercase tracking-widest">{doc.fields?.length || 0} Data</span>
                        </div>
                        
                        {(() => {
                          const isMine = uploaderName === 'Saya';
                          return (
                            <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl border ${isMine ? 'bg-sage-50/80 border-sage-100/50' : 'bg-rose-50/80 border-rose-100/50'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border ${isMine ? 'bg-sage-200/50 text-sage-700 border-sage-200' : 'bg-rose-200/50 text-rose-700 border-rose-200'}`}>
                                {initials}
                              </div>
                              <span className={`text-[9px] font-bold truncate max-w-[50px] ${isMine ? 'text-sage-600' : 'text-rose-600'}`}>
                                {uploaderName.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating Export Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: window.innerWidth < 768 ? '-50%' : 0 }}
            animate={{ y: 0, opacity: 1, x: window.innerWidth < 768 ? '-50%' : 0 }}
            exit={{ y: 100, opacity: 0, x: window.innerWidth < 768 ? '-50%' : 0 }}
            className="fixed bottom-24 left-1/2 md:left-auto md:right-5 -translate-x-1/2 md:translate-x-0 w-fit min-w-[280px] md:min-w-[420px] bg-sage-900 text-white rounded-full p-2 md:p-3 shadow-2xl z-[100] flex items-center gap-4 md:gap-10 border border-white/10"
          >
            <div className="flex items-center gap-2 md:gap-4 pl-1">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sage-300 flex-shrink-0 text-sm">
                {selectedIds.length}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-sm font-bold truncate">Berkas Terpilih</p>
                <p className="hidden lg:block text-[10px] text-sage-400 uppercase tracking-widest">Siap digabung</p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto pr-1">
              <button
                onClick={() => { setSelectedIds([]); setIsSelectMode(false); }}
                className="px-3 py-2 text-xs font-bold text-sage-400 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center justify-center w-10 h-10 md:w-auto md:px-8 md:h-12 bg-white text-sage-900 rounded-full font-black shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-5 h-5 md:w-4 md:h-4" />}
                <span className="hidden md:inline ml-2">{isExporting ? 'Memproses...' : 'Export PDF'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && <DocumentUploadModal onClose={() => setShowUpload(false)} />}
        {selected && (
          <DocumentDetailModal
            doc={selected}
            onClose={() => setSelected(null)}
            onDelete={() => handleDelete(selected)}
            onUpdate={updateDocument}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
