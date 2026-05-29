import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Copy, Check, X, ScanLine, Shield, Download, Share2, Loader2, Pencil, Save, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FamilyDocument, CATEGORY_INFO } from '../hooks/useDocuments';
import { useConfirmStore } from '../store/useConfirmStore';

interface DetailModalProps {
  doc: FamilyDocument;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (id: string, updates: Partial<FamilyDocument>) => Promise<void>;
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} title={`Salin ${label}`}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-sage-100 text-sage-600 hover:bg-sage-200'}`}>
      {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Tersalin' : 'Salin'}
    </button>
  );
}

export default function DocumentDetailModal({ doc, onClose, onDelete, onUpdate }: DetailModalProps) {
  const info = CATEGORY_INFO[doc.category];
  const hasFields = doc.fields && doc.fields.length > 0;
  const { confirm } = useConfirmStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState(doc.fields ?? []);
  const [editedName, setEditedName] = useState(doc.name);
  const [isSaving, setIsSaving] = useState(false);

  // currentFields: setelah save, pakai versi yang sudah diedit
  const [savedFields, setSavedFields] = useState(doc.fields ?? []);
  const [savedName, setSavedName] = useState(doc.name);
  const displayFields = isEditing ? editedFields : savedFields;
  const hasDisplayFields = displayFields && displayFields.length > 0;
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [activeImg, setActiveImg] = useState(0);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenImg) {
        if (e.key === 'Escape') setFullscreenImg(null);
      } else {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowLeft') {
          scrollToIndex(Math.max(0, activeImg - 1));
        } else if (e.key === 'ArrowRight') {
          scrollToIndex(Math.min((doc.imageUrls?.length || 1) - 1, activeImg + 1));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenImg, activeImg, doc.imageUrls?.length, onClose]);

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const width = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
    setActiveImg(index);
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const width = e.currentTarget.offsetWidth;
    const index = Math.round(scrollLeft / width);
    if (index !== activeImg) setActiveImg(index);
  };

  const handleUpdate = async () => {
    confirm({
      title: 'Simpan Perubahan?',
      message: 'Yakin ingin menyimpan perubahan pada dokumen ini?',
      confirmText: 'Ya, Simpan',
      variant: 'success',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await onUpdate(doc.id, { name: editedName, fields: editedFields });
          // Update local display state agar modal langsung reflect perubahan
          setSavedFields([...editedFields]);
          setSavedName(editedName);
          setIsEditing(false);
        } catch {
          alert('Gagal menyimpan perubahan');
        } finally {
          setIsSaving(false);
        }
      }
    });
  };



  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const urls = doc.imageUrls || [doc.imageUrl!];
      for (let i = 0; i < urls.length; i++) {
        const response = await fetch(urls[i]);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${doc.name}_hal_${i + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Revoke immediately after use to prevent memory leak
        window.URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      (doc.imageUrls || [doc.imageUrl!]).forEach(url => window.open(url, '_blank'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWA = () => {
    let message = `*Detail Dokumen ${info.label}: ${doc.name}*\n\n`;
    if (hasFields) doc.fields.forEach(f => { if (f.value) message += `• *${f.label}:* ${f.value}\n`; });
    const urls = doc.imageUrls || [doc.imageUrl!];
    message += `\n_Link Foto Dokumen:_\n`;
    urls.forEach((url, i) => { message += `📸 Hal ${i + 1}: ${url}\n`; });
    message += `\nShared via *CandyNest*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end sm:justify-center sm:items-center overflow-hidden">
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-sage-950/80"
        onClick={onClose}
      />

      {/* Sheet / Modal */}
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
        style={{ willChange: 'transform, opacity' }}
        className="relative bg-white w-full lg:max-w-5xl sm:max-w-2xl sm:rounded-[2.5rem] rounded-t-[2.5rem] sm:shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-white/20 mt-auto sm:my-auto"
      >
        {/* Header (Sticky) */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-sage-50 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-sage-50 flex items-center justify-center text-2xl flex-shrink-0 border border-sage-100 shadow-sm">{info.emoji}</div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)}
                    className="w-full bg-sage-50 border border-sage-200 rounded-xl px-3 py-1.5 text-lg font-display text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-500/10 transition-all" />
                ) : (
                  <h2 className="font-display text-xl text-sage-900 leading-tight truncate">{savedName}</h2>
                )}
                <p className="text-[10px] text-sage-400 font-bold uppercase tracking-widest mt-1">
                  {format(doc.createdAt, 'dd MMM yyyy', { locale: id })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button onClick={() => setIsEditing(!isEditing)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isEditing ? 'bg-amber-100 text-amber-600' : 'bg-sage-50 text-sage-400 hover:bg-sage-100'}`}>
                <Pencil className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Photo Gallery Column - Sticky on Desktop */}
            <div className="lg:sticky lg:top-0 space-y-6">
              <div className="relative group/gallery">
                <div ref={scrollRef} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 scroll-smooth relative">
                  {(doc.imageUrls || [doc.imageUrl!]).map((url, i) => (
                    <div key={i} className="relative flex-shrink-0 w-full snap-center px-1 cursor-zoom-in group/img" onClick={() => setFullscreenImg(url)}>
                      <img src={url} alt={`${doc.name} ${i+1}`} loading="lazy" decoding="async" className="w-full h-auto max-h-[40vh] lg:max-h-[60vh] object-contain rounded-3xl bg-sage-50 border border-sage-100 shadow-sm transition-transform group-hover/img:scale-[1.01]" />
                      <div className="absolute inset-0 m-1 rounded-3xl bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 p-3 rounded-full text-white">
                          <Maximize2 className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Slide Navigation Buttons */}
                {(doc.imageUrls?.length || 0) > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); scrollToIndex(Math.max(0, activeImg - 1)); }}
                      disabled={activeImg === 0}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 border border-sage-100 flex items-center justify-center shadow-lg text-sage-600 opacity-0 group-hover/gallery:opacity-100 transition-all disabled:opacity-0 hover:bg-white hover:scale-110"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); scrollToIndex(Math.min((doc.imageUrls?.length || 1) - 1, activeImg + 1)); }}
                      disabled={activeImg === (doc.imageUrls?.length || 1) - 1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 border border-sage-100 flex items-center justify-center shadow-lg text-sage-600 opacity-0 group-hover/gallery:opacity-100 transition-all disabled:opacity-0 hover:bg-white hover:scale-110"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {(doc.imageUrls?.length || 0) > 1 && (
                  <div className="flex flex-col items-center gap-3 mt-4">
                    <div className="flex justify-center gap-1.5">
                      {(doc.imageUrls || []).map((_, i) => (
                        <button key={i} onClick={() => scrollToIndex(i)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${activeImg === i ? 'w-8 bg-sage-900' : 'w-1.5 bg-sage-200'}`} />
                      ))}
                    </div>
                    <div className="bg-sage-900 text-white text-[9px] px-3 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-lg">
                      Halaman {activeImg + 1} / {(doc.imageUrls?.length || 1)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fields Column */}
            <div className="space-y-6">
              {/* Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" /> Data Dokumen
                  </label>
                </div>

                {hasDisplayFields ? (
                  <div className="grid grid-cols-1 gap-3">
                    {displayFields.map((field, i) => (
                      <div key={i} className="flex items-center gap-4 bg-sage-50/50 border border-sage-100 rounded-2xl px-5 py-4 group transition-colors hover:bg-white">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-sage-400 uppercase tracking-wider mb-1">{field.label}</p>
                          {isEditing ? (
                            <input type="text" value={editedFields[i]?.value ?? ''} onChange={e => {
                              const n = [...editedFields]; n[i] = { ...n[i], value: e.target.value }; setEditedFields(n);
                            }} className="w-full bg-white border border-sage-200 rounded-xl px-3 py-1.5 text-base md:text-sm font-bold text-sage-900 focus:outline-none" />
                          ) : (
                            <p className="text-sm font-bold text-sage-900 truncate leading-tight">{field.value || <span className="text-sage-300 italic">Kosong</span>}</p>
                          )}
                        </div>
                        {!isEditing && field.value && <CopyBtn text={field.value} label={field.label} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-sage-50/50 rounded-3xl border border-dashed border-sage-200">
                    <ScanLine className="w-10 h-10 mx-auto mb-3 text-sage-300" />
                    <p className="text-xs font-bold text-sage-400 uppercase tracking-widest">Tidak ada data teks</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide leading-relaxed">Privasi Terjaga: Hanya kamu dan pasanganmu yang bisa mengakses dokumen ini.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Sticky) */}
        <div className="flex-shrink-0 p-6 pb-12 sm:pb-6 border-t border-sage-50 bg-white">
          {isEditing ? (
            <div className="flex gap-3">
              <button onClick={() => setIsEditing(false)} className="flex-1 py-4 rounded-2xl text-sage-400 font-bold text-sm uppercase tracking-widest transition-all hover:text-sage-600">
                Batal
              </button>
              <button onClick={handleUpdate} disabled={isSaving}
                className="flex-[2] py-4 rounded-2xl bg-sage-900 text-white font-bold text-sm uppercase tracking-widest shadow-xl shadow-sage-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button onClick={handleDownload} disabled={isDownloading}
                  className="flex-1 py-4 bg-sage-50 text-sage-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-sage-100 transition-all flex items-center justify-center gap-2"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download
                </button>
                <button onClick={handleShareWA} className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10">
                  <Share2 className="w-4 h-4" /> Share WA
                </button>
              </div>
              <button onClick={onDelete} className="w-full py-4 text-rose-500 hover:bg-rose-50 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Hapus Berkas
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Fullscreen Image Preview Modal */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col"
            onClick={() => setFullscreenImg(null)}
          >
            <div className="flex justify-end p-6">
              <div className="flex items-center gap-2">
                <button
                  disabled={isDownloading}
                  onClick={async () => {
                    if (isDownloading) return;
                    setIsDownloading(true);
                    try {
                      const response = await fetch(fullscreenImg!);
                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = `document_preview.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (e) {
                      window.open(fullscreenImg!, '_blank');
                    } finally {
                      setIsDownloading(false);
                    }
                  }} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                </button>
                <button onClick={() => setFullscreenImg(null)} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 md:p-10 overflow-hidden">
              <motion.img
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                src={fullscreenImg}
                alt="Fullscreen Preview"
                className="max-w-full max-h-full object-contain rounded-xl"
                onClick={e => e.stopPropagation()} // Prevent clicking image from closing
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
