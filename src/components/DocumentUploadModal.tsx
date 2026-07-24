import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ImageIcon, Loader2, ScanLine, Check, AlertCircle, Sparkles, FileText, FilePieChart, FileSpreadsheet, Braces, Camera, KeyRound } from 'lucide-react';
import { useDocuments, CATEGORY_INFO, FIELD_TEMPLATES, OcrField, DocCategory } from '../hooks/useDocuments';
import { formatFileSize, validateDocFile, ALLOWED_DOC_MIME_TYPES, isEnvFile } from '../utils/document';

type UploadTab = 'photo' | 'file';
const CATS = Object.entries(CATEGORY_INFO) as [DocCategory, typeof CATEGORY_INFO[DocCategory]][];

const DOC_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
  'text/plain',
  '.env',
].join(',');

function FileTypeIcon({ mimeType, fileName, className = 'w-10 h-10' }: { mimeType: string; fileName: string; className?: string }) {
  if (isEnvFile({ name: fileName, type: mimeType }))
    return <KeyRound className={`${className} text-amber-500`} />;
  if (mimeType === 'application/pdf')
    return <FileText className={`${className} text-rose-500`} />;
  if (mimeType.includes('word'))
    return <FileText className={`${className} text-blue-500`} />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  if (mimeType === 'application/json')
    return <Braces className={`${className} text-violet-500`} />;
  return <FilePieChart className={`${className} text-sage-400`} />;
}

function fileTypeBadgeStyle(mimeType: string, fileName: string) {
  if (isEnvFile({ name: fileName, type: mimeType })) return 'bg-amber-50 border-amber-100 text-amber-600';
  if (mimeType === 'application/pdf') return 'bg-rose-50 border-rose-100 text-rose-600';
  if (mimeType.includes('word')) return 'bg-blue-50 border-blue-100 text-blue-600';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'bg-emerald-50 border-emerald-100 text-emerald-600';
  if (mimeType === 'application/json') return 'bg-violet-50 border-violet-100 text-violet-600';
  return 'bg-sage-50 border-sage-100 text-sage-600';
}

function fileTypeLabel(mimeType: string, fileName: string) {
  if (isEnvFile({ name: fileName, type: mimeType })) return 'ENV';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('word')) return 'Word';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel';
  if (mimeType === 'application/json') return 'JSON';
  return 'File';
}

export default function DocumentUploadModal({ onClose }: { onClose: () => void }) {
  const { compress, uploadAndSave, uploading, uploadProgress, error: hookError } = useDocuments();

  const [uploadTab, setUploadTab] = useState<UploadTab>('photo');

  // Photo tab state
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fileStats, setFileStats] = useState<{ original: number; compressed: number }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionTarget, setCompressionTarget] = useState(300);
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  const [isInvalid, setIsInvalid] = useState(false);

  // File tab state
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Common state
  const [category, setCategory] = useState<DocCategory>('ktp');
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // ─── Photo Tab Handlers ────────────────────────────────────────────────────

  const recompressFiles = async (targetKB: number, existingOriginals: File[]) => {
    setIsCompressing(true);
    try {
      const newFiles: File[] = [];
      const newPreviews: string[] = [];
      const newStats: { original: number; compressed: number }[] = [];
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
      setPhotoFiles(newFiles);
      setPreviews(newPreviews);
      setFileStats(newStats);
    } catch {
      setLocalError('Gagal mengompres ulang file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePhotoFile = async (f: File) => {
    setLocalError(null);
    setIsInvalid(false);
    if (f.size < 100 * 1024) {
      setLocalError('Ukuran foto terlalu kecil (di bawah 100KB). Harap ambil foto ulang yang lebih jelas.');
      setIsInvalid(true);
    }
    setOriginalFiles(prev => [...prev, f]);
    setIsCompressing(true);
    try {
      const processedFile = await compress(f, compressionTarget);
      const newUrl = URL.createObjectURL(processedFile);
      previewUrlsRef.current.push(newUrl);
      setPhotoFiles(prev => [...prev, processedFile]);
      setPreviews(prev => [...prev, newUrl]);
      setFileStats(prev => [...prev, { original: f.size, compressed: processedFile.size }]);
    } catch {
      setLocalError('Gagal mengompres file.');
    } finally {
      setIsCompressing(false);
    }
  };

  // ─── File Tab Handlers ────────────────────────────────────────────────────

  const handleDocFiles = useCallback((newFiles: File[]) => {
    setLocalError(null);
    const errors: string[] = [];
    const valid: File[] = [];
    for (const f of newFiles) {
      const err = validateDocFile(f);
      if (err) errors.push(err);
      else valid.push(f);
    }
    if (errors.length > 0) {
      setLocalError(errors.join('\n'));
    }
    if (valid.length > 0) {
      setDocFiles(prev => [...prev, ...valid]);
      const envFiles = valid.filter(isEnvFile);
      if (envFiles.length > 0) {
        setCategory('lainnya');
        if (envFiles.length === 1) {
          setCustomName(current => current || envFiles[0].name);
        }
      }
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleDocFiles(droppedFiles);
  }, [handleDocFiles]);

  // ─── Save Action ──────────────────────────────────────────────────────────

  const activeFiles = uploadTab === 'photo' ? photoFiles : docFiles;
  const hasFiles = activeFiles.length > 0;

  const handleSave = async () => {
    if (!hasFiles) return;
    setSaving(true);
    try {
      const isFile = uploadTab === 'file';
      const initialFields = isFile ? [] : FIELD_TEMPLATES[category].map(label => ({ label, value: '' }));
      await uploadAndSave({
        files: activeFiles,
        name: customName || `${CATEGORY_INFO[category].label} — ${new Date().toLocaleDateString('id-ID')}`,
        category,
        fields: initialFields,
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
        className="relative bg-white w-full sm:rounded-[2.5rem] rounded-t-[2.5rem] sm:shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden border border-white/20 mt-auto sm:my-auto transition-all duration-500 sm:max-w-lg"
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-sage-50 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-rose-400">
                <Sparkles className="w-3 h-3 fill-rose-400" />
                <span className="text-[9px] font-bold uppercase tracking-[0.3em]">
                  Unggah Berkas
                </span>
              </div>
              <h2 className="font-display text-2xl text-sage-900 tracking-tight leading-none">
                Tambah Dokumen
              </h2>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-sage-50 text-sage-400 hover:bg-sage-100 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div className="space-y-6">
            {/* Kategori */}
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

            {/* Custom Name */}
            <div>
              <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest mb-3 block px-1">Nama Dokumen (Opsional)</label>
              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder={`${CATEGORY_INFO[category].label} — ${new Date().toLocaleDateString('id-ID')}`}
                className="w-full px-5 py-4 bg-sage-50 border border-sage-100 rounded-2xl text-sage-900 focus:outline-none transition-all font-bold text-base md:text-sm" />
            </div>

            {/* Upload Type Tabs */}
            <div>
              <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest mb-3 block px-1">Jenis Unggahan</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-sage-50 rounded-2xl border border-sage-100">
                <button
                  onClick={() => { setUploadTab('photo'); setLocalError(null); }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 ${uploadTab === 'photo' ? 'bg-white shadow-sm text-sage-900 border border-sage-100' : 'text-sage-400 hover:text-sage-600'}`}
                >
                  <Camera className="w-4 h-4" />
                  Foto
                </button>
                <button
                  onClick={() => { setUploadTab('file'); setLocalError(null); }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 ${uploadTab === 'file' ? 'bg-white shadow-sm text-sage-900 border border-sage-100' : 'text-sage-400 hover:text-sage-600'}`}
                >
                  <FileText className="w-4 h-4" />
                  Dokumen
                </button>
              </div>
            </div>

            {/* ── FOTO TAB ── */}
            <AnimatePresence mode="wait">
              {uploadTab === 'photo' && (
                <motion.div key="photo-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  {/* Compression Picker */}
                  <div className="space-y-3">
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
                            if (originalFiles.length > 0) recompressFiles(opt.kb, originalFiles);
                          }}
                          className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${compressionTarget === opt.kb
                            ? 'bg-sage-900 border-sage-900 text-white shadow-lg scale-[1.02]'
                            : 'bg-white border-sage-100 text-sage-500 hover:bg-sage-50 hover:border-sage-200'}`}
                        >
                          <span className="text-sm">{opt.icon}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider">{opt.label}</span>
                          <span className="text-[8px] opacity-60">~{opt.kb}KB</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Photo Grid */}
                  <div>
                    <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest mb-3 block px-1">Foto Dokumen</label>
                    <div className="grid grid-cols-2 gap-3">
                      {previews.map((url, i) => (
                        <div key={i} className="relative group aspect-[4/3] rounded-2xl overflow-hidden border border-sage-100 bg-sage-50">
                          <img src={url} className="w-full h-full object-cover" alt="" />
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
                            URL.revokeObjectURL(previews[i]);
                            previewUrlsRef.current = previewUrlsRef.current.filter(u => u !== previews[i]);
                            setOriginalFiles(f => f.filter((_, idx) => idx !== i));
                            setPhotoFiles(f => f.filter((_, idx) => idx !== i));
                            setPreviews(p => p.filter((_, idx) => idx !== i));
                            setFileStats(p => p.filter((_, idx) => idx !== i));
                          }}
                            className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => imageInputRef.current?.click()} disabled={isCompressing}
                        className="aspect-[4/3] rounded-2xl border-2 border-dashed border-sage-200 flex flex-col items-center justify-center gap-2 text-sage-400 hover:bg-sage-50 transition-all">
                        {isCompressing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest">Tambah Foto</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── FILE TAB ── */}
              {uploadTab === 'file' && (
                <motion.div key="file-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-sage-400 uppercase tracking-widest mb-3 block px-1">Unggah File</label>

                    {/* Drop Zone */}
                    <div
                      ref={dropRef}
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => docInputRef.current?.click()}
                      className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${isDragging ? 'border-sage-400 bg-sage-50 scale-[1.01]' : 'border-sage-200 hover:border-sage-300 hover:bg-sage-50/50'}`}
                    >
                      <div className="flex items-center gap-2 text-3xl">
                        <span>📄</span><span>📝</span><span>📊</span><span>🗂️</span><span>🔐</span>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm text-sage-700">
                          {isDragging ? 'Lepaskan di sini!' : 'Klik atau seret file ke sini'}
                        </p>
                        <p className="text-[10px] text-sage-400 font-medium mt-1 uppercase tracking-widest">
                          PDF · Word · Excel · JSON · ENV · Maks. 10MB
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); docInputRef.current?.click(); }}
                        className="mt-1 px-5 py-2.5 bg-sage-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                      >
                        Pilih File
                      </button>
                    </div>

                    {/* File List */}
                    {docFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {docFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-sage-50 border border-sage-100 rounded-2xl group">
                            <FileTypeIcon mimeType={f.type} fileName={f.name} className="w-8 h-8 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-sage-900 truncate">{f.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${fileTypeBadgeStyle(f.type, f.name)}`}>
                                  {fileTypeLabel(f.type, f.name)}
                                </span>
                                <span className="text-[10px] text-sage-400 font-medium">{formatFileSize(f.size)}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setDocFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => docInputRef.current?.click()}
                          className="w-full py-3 rounded-2xl border-2 border-dashed border-sage-200 text-sage-400 text-xs font-bold uppercase tracking-widest hover:bg-sage-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Tambah File Lain
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-bold leading-relaxed whitespace-pre-wrap ${error.startsWith('Catatan') ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 pb-12 sm:pb-6 border-t border-sage-50 bg-white">
          <button
            disabled={!hasFiles || isCompressing || (uploadTab === 'photo' && isInvalid) || saving || done}
            onClick={handleSave}
            className="w-full py-4 bg-sage-900 text-white rounded-2xl font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
          >
            {done ? (
              <Check className="w-5 h-5 text-emerald-400" />
            ) : saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {done ? 'Tersimpan!' : saving ? `Mengunggah... ${uploadProgress}%` : (uploadTab === 'photo' && isInvalid) ? 'Foto Tidak Layak' : 'Simpan Sekarang'}
          </button>
        </div>

        {/* Hidden Inputs */}
        <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
        <input type="file" ref={docInputRef} hidden accept={DOC_ACCEPT} multiple onChange={e => e.target.files && handleDocFiles(Array.from(e.target.files))} />
      </motion.div>

      {/* Full Screen Image Preview */}
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
              <button onClick={() => setFullScreenUrl(null)} className="px-8 py-3 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:bg-sage-100 transition-all">
                Kembali
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
