import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon, Loader2, ScanLine, Check, Copy, AlertCircle, Sparkles } from 'lucide-react';
import { useDocuments, CATEGORY_INFO, FIELD_TEMPLATES, OcrField, DocCategory } from '../hooks/useDocuments';
import { formatFileSize } from '../utils/document';

type Step = 'select' | 'processing' | 'review';
const CATS = Object.entries(CATEGORY_INFO) as [DocCategory, typeof CATEGORY_INFO[DocCategory]][];

export default function DocumentUploadModal({ onClose }: { onClose: () => void }) {
  const { compress, uploadAndSave, uploading, uploadProgress, error: hookError } = useDocuments();

  const [step, setStep] = useState<Step>('select');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [category, setCategory] = useState<DocCategory>('ktp');
  const [customName, setCustomName] = useState('');
  const [fields, setFields] = useState<OcrField[]>([]);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);
  const [fileStats, setFileStats] = useState<{ original: number; compressed: number }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [done, setDone] = useState(false);
  const [compressionTarget, setCompressionTarget] = useState(300);
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);

  // Cleanup semua blob URL saat modal ditutup/unmount
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const recompressFiles = async (targetKB: number, existingOriginals: File[]) => {
    setIsCompressing(true);
    try {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];
      const newStats: { original: number; compressed: number }[] = [];
      
      // Cleanup old previews
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];

      for (const f of existingOriginals) {
        const processedFile = await compress(f, targetKB);
        
        const newUrl = URL.createObjectURL(processedFile);
        previewUrlsRef.current.push(newUrl);
        newFiles.push(processedFile);
        newPreviews.push(newUrl);
        newStats.push({ original: f.size, compressed: processedFile.size });
      }

      setFiles(newFiles);
      setPreviews(newPreviews);
      setFileStats(newStats);
    } catch (err) {
      setLocalError('Gagal mengompres ulang file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFile = async (f: File) => {
    setLocalError(null);
    setIsInvalid(false);

    if (f.size < 100 * 1024) {
      setLocalError('Ukuran foto terlalu kecil (di bawah 100KB). Harap ambil foto ulang yang lebih jelas agar data bisa terbaca.');
      setIsInvalid(true);
    }

    setOriginalFiles(prev => [...prev, f]);
    
    setIsCompressing(true);
    try {
      const processedFile = await compress(f, compressionTarget);

      const newUrl = URL.createObjectURL(processedFile);
      previewUrlsRef.current.push(newUrl);
      setFiles(prev => [...prev, processedFile]);
      setPreviews(prev => [...prev, newUrl]);
      setFileStats(prev => [...prev, { original: f.size, compressed: processedFile.size }]);
    } catch (err) {
      setLocalError('Gagal mengompres file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleContinue = async () => {
    if (files.length === 0) return;

    const templates = FIELD_TEMPLATES[category];
    setFields(templates.map(label => ({ label, value: '' })));
    setStep('review');
  };

  const handleSave = async () => {
    if (files.length === 0 || !fields) return;
    setSaving(true);
    try {
      await uploadAndSave({
        files,
        name: customName || `${CATEGORY_INFO[category].label} — ${new Date().toLocaleDateString('id-ID')}`,
        category,
        fields,
        rawText: '',
      });
      setDone(true);
      setTimeout(onClose, 1000);
    } catch {
      setSaving(false);
    }
  };

  const error = localError || hookError;

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
        className={`relative bg-white w-full sm:rounded-[2.5rem] rounded-t-[2.5rem] sm:shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-white/20 mt-auto sm:my-auto transition-all duration-500 ${step === 'review' ? 'sm:max-w-4xl' : 'sm:max-w-lg'
          }`}
      >
        {/* Header (Sticky) */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-sage-50 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-rose-400">
                <Sparkles className="w-3 h-3 fill-rose-400" />
                <span className="text-[9px] font-bold uppercase tracking-[0.3em]">
                  {step === 'select' ? 'Unggah Berkas' : 'Verifikasi Data'}
                </span>
              </div>
              <h2 className="font-display text-2xl text-sage-900 tracking-tight leading-none">
                {step === 'select' ? 'Tambah Dokumen' : 'Simpan Dokumen'}
              </h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-1 mt-4">
            {(['select', 'review'] as Step[]).map((s, i) => (
              <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-sage-700' : 'w-4 bg-sage-100'}`} />
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence mode="wait">
            {step === 'select' && (
              <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div>
                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest mb-3 block px-1">Jenis Dokumen</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATS.map(([key, info]) => (
                      <button key={key} onClick={() => setCategory(key)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-300 ${category === key ? 'bg-sage-900 border-sage-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-sage-200 text-sage-500 hover:bg-sage-50 hover:text-sage-800 hover:border-sage-300'}`}>
                        <div className="text-xl mb-0.5">{info.emoji}</div>
                        <div className="text-[8px] font-bold uppercase leading-tight text-center truncate w-full">{info.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest block">Nama Dokumen (Opsional)</label>
                  </div>
                  <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder={`${CATEGORY_INFO[category].label} — ${new Date().toLocaleDateString('id-ID')}`}
                    className="w-full px-5 py-4 bg-sage-50 border border-sage-100 rounded-2xl text-sage-900 focus:outline-none transition-all font-bold text-base md:text-sm" />
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest block px-1">Kualitas Kompresi</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Hemat', kb: 150, icon: '📉' },
                      { label: 'Standar', kb: 300, icon: '⚖️' },
                      { label: 'Tajam', kb: 500, icon: '✨' }
                    ].map((opt) => (
                      <button
                        key={opt.kb}
                        onClick={() => {
                          setCompressionTarget(opt.kb);
                          if (originalFiles.length > 0) {
                            recompressFiles(opt.kb, originalFiles);
                          }
                        }}
                        className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${compressionTarget === opt.kb
                          ? 'bg-sage-900 border-sage-900 text-white shadow-lg scale-[1.02]'
                          : 'bg-white border-sage-100 text-sage-500 hover:bg-sage-50 hover:border-sage-200'
                          }`}
                      >
                        <span className="text-sm">{opt.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                        <span className="text-[8px] opacity-60">~{opt.kb}KB</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest mb-3 block px-1">Foto Dokumen</label>
                  <div className="grid grid-cols-2 gap-3">
                    {previews.map((url, i) => (
                      <div key={i} className="relative group aspect-[4/3] rounded-2xl overflow-hidden border border-sage-100 bg-sage-50">
                        <img src={url} className="w-full h-full object-cover" />
                        <button 
                          onClick={() => setFullScreenUrl(url)}
                          className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center group/btn"
                        >
                          <ScanLine className="w-8 h-8 text-white opacity-0 group-hover/btn:opacity-100 transition-all scale-75 group-hover/btn:scale-100" />
                        </button>
                        {fileStats[i]?.original > 0 && (
                          <div className={`absolute inset-x-0 bottom-0 p-2 flex flex-col gap-0.5 pointer-events-none transition-colors ${fileStats[i].compressed > compressionTarget * 1024 ? 'bg-amber-600/80' : 'bg-black/60'} backdrop-blur-sm`}>
                            <p className="text-[7px] text-white/70 uppercase font-black tracking-[0.15em]">
                              {fileStats[i].compressed > fileStats[i].original ? 'Ukuran Asli' : 'Optimasi Selesai'}
                            </p>
                            <p className="text-[10px] text-white font-mono font-bold flex items-center gap-1">
                              {formatFileSize(fileStats[i].compressed)}
                              {fileStats[i].compressed < fileStats[i].original && (
                                <span className="text-[8px] text-sage-300 font-normal opacity-80">
                                  (Hemat {Math.round((1 - fileStats[i].compressed / fileStats[i].original) * 100)}%)
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        <button onClick={(e) => {
                          e.stopPropagation();
                          // Revoke URL saat foto dihapus
                          URL.revokeObjectURL(previews[i]);
                          previewUrlsRef.current = previewUrlsRef.current.filter(u => u !== previews[i]);
                          setOriginalFiles(f => f.filter((_, idx) => idx !== i));
                          setFiles(f => f.filter((_, idx) => idx !== i));
                          setPreviews(p => p.filter((_, idx) => idx !== i));
                          setFileStats(p => p.filter((_, idx) => idx !== i));
                        }}
                          className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => inputRef.current?.click()} disabled={isCompressing}
                      className="aspect-[4/3] rounded-2xl border-2 border-dashed border-sage-200 flex flex-col items-center justify-center gap-2 text-sage-400 hover:bg-sage-50 transition-all">
                      {isCompressing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">Tambah Foto</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold leading-relaxed ${error.startsWith('Catatan') ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
              </motion.div>
            )}

            {step === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Image Column - Sticky on Desktop */}
                <div className="lg:sticky lg:top-0 space-y-4">
                  <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest px-1 block">Foto Dokumen</label>
                  <div className="relative group aspect-[3/4] rounded-3xl overflow-hidden border border-sage-100 bg-sage-50 shadow-inner">
                    <img src={previews[0]} className="w-full h-full object-contain" />
                    {previews.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full text-[10px] text-white font-bold backdrop-blur-md border border-white/10">
                        + {previews.length - 1} Foto Lainnya
                      </div>
                    )}
                  </div>
                </div>

                {/* Data Entry Column */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest">Verifikasi Data</label>
                      <span className="text-[8px] font-black text-rose-400 uppercase tracking-tighter bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Manual Entry</span>
                    </div>
                    <div className="space-y-4">
                      {fields.map((f, i) => (
                        <div key={i} className="space-y-1.5 group">
                          <label className="text-[9px] font-bold text-sage-400 uppercase tracking-wider px-1 ml-1 transition-colors group-focus-within:text-sage-900">{f.label}</label>
                          <input
                            type="text"
                            value={f.value}
                            placeholder={`Masukkan ${f.label}...`}
                            onChange={e => {
                              const n = [...fields]; n[i].value = e.target.value; setFields(n);
                            }}
                            className="w-full px-5 py-4 bg-sage-50 border border-sage-100 rounded-2xl text-sage-900 font-bold text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-sage-900/5 focus:bg-white focus:border-sage-300 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-3 h-3 text-blue-600" />
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold leading-relaxed uppercase tracking-wide">Pastikan data yang diinput sudah sesuai dengan foto dokumen.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer (Sticky) */}
        <div className="flex-shrink-0 p-6 pb-12 sm:pb-6 border-t border-sage-50 bg-white">
          {step === 'select' ? (
            <button disabled={files.length === 0 || isCompressing || isInvalid} onClick={handleContinue}
              className="w-full py-4 bg-sage-900 text-white rounded-2xl font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
            >
              <ImageIcon className="w-4 h-4" />
              {isInvalid ? 'Foto Tidak Layak' : 'Lanjut Isi Data'}
            </button>
          ) : step === 'review' ? (
            <button disabled={saving} onClick={handleSave}
              className="w-full py-4 bg-sage-900 text-white rounded-2xl font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {saving ? 'Menyimpan...' : 'Simpan Sekarang'}
            </button>
          ) : null}
        </div>

        <input type="file" ref={inputRef} hidden accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </motion.div>

      {/* Full Screen Preview Overlay */}
      <AnimatePresence>
        {fullScreenUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col p-4 sm:p-8"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <div className="text-white text-xs font-bold uppercase tracking-[0.2em]">Pratinjau Hasil Kompresi</div>
                <div className="text-white/40 text-[9px] uppercase tracking-widest mt-1">Pastikan teks pada dokumen tetap terbaca dengan jelas</div>
              </div>
              <button onClick={() => setFullScreenUrl(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-sage-900/50">
              <img src={fullScreenUrl} className="max-w-full max-h-full object-contain" alt="Preview" />
            </div>
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => setFullScreenUrl(null)}
                className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-sage-100 transition-all"
              >
                Kembali
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
