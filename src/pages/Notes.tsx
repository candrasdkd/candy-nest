import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Plus, Search, Pin, X, Loader2, Archive, Inbox, Camera, ScanLine, HelpCircle, Info, Globe, Check, Download } from 'lucide-react';
import { useNotesLogic } from '../hooks/useNotesLogic';
import { NoteCard } from '../components/NoteCard';
import NoteDetailModal from '../components/NoteDetailModal';
import { FamilyNote } from '../types/note';

export default function Notes() {
  const {
    notes,
    loading,
    searchQuery,
    setSearchQuery,
    isAdding,
    setIsAdding,
    showHelp,
    setShowHelp,
    activeTab,
    setActiveTab,
    editingNote,
    isUploading,
    isCompressing,
    compressionTarget,
    formData,
    setFormData,
    tempFiles,
    setTempFiles,
    previewUrls,
    setPreviewUrls,
    fullScreenUrl,
    setFullScreenUrl,
    isDownloading,
    selectedNoteForDetail,
    setSelectedNoteForDetail,
    handleDownloadImage,
    NOTE_COLORS,
    pinnedNotes,
    otherNotes,
    filteredNotes,
    handleSubmit,
    handleWhatsAppExport,
    startEdit,
    closeForm,
    handleFileChange,
    handleTargetChange,
    updateNote,
    archiveNote,
    handleDelete
  } = useNotesLogic();

  const [searchParams, setSearchParams] = useSearchParams();
  const noteId = searchParams.get('id');
  const action = searchParams.get('action');

  useEffect(() => {
    if (noteId && notes.length > 0) {
      const foundNote = notes.find(n => n.id === noteId);
      if (foundNote) {
        setSelectedNoteForDetail(foundNote);
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [noteId, notes, setSelectedNoteForDetail, searchParams, setSearchParams]);

  useEffect(() => {
    if (action === 'add') {
      setIsAdding(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [action, setIsAdding, searchParams, setSearchParams]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-sage-300" />
        <p className="text-sm text-sage-400 font-medium">Membuka buku catatan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 pt-10 md:pt-16 pb-32">
      <section className="relative mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-display text-sage-900 tracking-tight leading-none">
              Catatan <span className="text-rose-400">Penting</span>
            </h1>
            <p className="text-sage-400 font-medium text-sm md:text-base">Tulis hal-hal penting agar tidak lupa.</p>
          </div>

          <div className="flex items-center justify-center md:justify-end gap-3">
            <button
              onClick={() => setShowHelp(true)}
              className="px-4 md:px-6 h-12 rounded-2xl bg-white border border-sage-100 shadow-sm flex items-center gap-2 text-sage-400 hover:text-sage-900 transition-all hover:shadow-md group shrink-0"
            >
              <HelpCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Panduan</span>
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="hidden md:flex items-center justify-center gap-3 px-8 py-4 bg-sage-900 text-white rounded-[1.5rem] font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-95 group"
            >
              <Plus className="w-5 h-5" />
              Catatan Baru
            </button>
          </div>
        </div>
      </section>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-24 right-6 z-[100] md:hidden">
        <button
          onClick={() => setIsAdding(true)}
          className="w-14 h-14 bg-sage-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Formatting Guide Modal */}
      <AnimatePresence>
        {showHelp && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-sage-950/80"
              onClick={() => setShowHelp(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ willChange: 'transform, opacity' }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 sm:p-10 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sage-900 flex items-center justify-center text-white shadow-lg shadow-sage-900/20">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display text-sage-900 leading-tight">Panduan Menulis</h2>
                    <p className="text-xs text-sage-400 font-bold uppercase tracking-widest">Cara buat catatan rapi & pintar</p>
                  </div>
                </div>

                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-sage-900">Ceklis Interaktif</h3>
                      <p className="text-xs text-sage-500 leading-relaxed">
                        Gunakan <code className="bg-sage-50 px-1.5 py-0.5 rounded font-mono text-rose-600 font-bold">&gt;</code> di awal baris. Klik teksnya di layar buat centang otomatis.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-sage-900">Tautan Pintar</h3>
                      <p className="text-xs text-sage-500 leading-relaxed">
                        Tempel <code className="bg-sage-50 px-1.5 py-0.5 rounded font-mono text-blue-600 font-bold">https://...</code> biar jadi link yang bisa diklik langsung.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-sage-900">Label & Password</h3>
                      <p className="text-xs text-sage-500 leading-relaxed">
                        Tulis <code className="bg-sage-50 px-1.5 py-0.5 rounded font-mono text-amber-600 font-bold">Label: Nilai</code>. Kata "Pass/PIN" bakal bikin nilainya otomatis disensor.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-sage-100 flex items-center justify-center text-sage-600 shrink-0 shadow-sm">
                      <StickyNote className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-sage-900">Header & Section</h3>
                      <p className="text-xs text-sage-500 leading-relaxed">
                        Pakai <code className="bg-sage-50 px-1.5 py-0.5 rounded font-mono text-sage-900 font-bold"># Judul</code> atau **HURUF KAPITAL** buat bikin pemisah section yang rapi.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelp(false)}
                  className="w-full py-4 bg-sage-900 text-white rounded-2xl font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-[0.98]"
                >
                  Siap, Saya Mengerti!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Tab Switcher & Search Bar */}
      <section className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white p-1 rounded-2xl border border-sage-100 shadow-sm flex items-center">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'active' ? 'bg-sage-900 text-white shadow-md' : 'text-sage-400'
                }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              Aktif
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all ${activeTab === 'archived' ? 'bg-sage-900 text-white shadow-md' : 'text-sage-400'
                }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Arsip
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-1 border border-sage-100 shadow-sm flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-300" />
            <input
              type="text"
              placeholder="Cari catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-sage-300"
            />
          </div>
        </div>
      </section>

      {/* Notes Content */}
      {notes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-dashed border-sage-100 rounded-[3rem] py-20 px-10 text-center space-y-6"
        >
          <div className="w-20 h-20 bg-sage-50 rounded-[2rem] flex items-center justify-center mx-auto border border-white">
            <StickyNote className="w-8 h-8 text-sage-200" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-display text-sage-900">
              {activeTab === 'active' ? 'Belum ada catatan' : 'Arsip kosong'}
            </h3>
            <p className="text-sage-400 max-w-xs mx-auto text-sm leading-relaxed">
              {activeTab === 'active'
                ? 'Gunakan fitur ini untuk menyimpan informasi penting keluarga.'
                : 'Catatan yang kamu arsipkan akan muncul di sini.'}
            </p>
          </div>
          {activeTab === 'active' && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-8 py-3 bg-sage-50 text-sage-600 rounded-2xl font-bold hover:bg-sage-100 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Catatan
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-12">
          {pinnedNotes.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                <Pin className="w-3 h-3 rotate-45" /> Disematkan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {pinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onPin={() => updateNote(note.id, { isPinned: !note.isPinned })}
                    onArchive={() => archiveNote(note.id, !note.isArchived)}
                    onWhatsApp={handleWhatsAppExport}
                    onUpdate={updateNote}
                    onClick={setSelectedNoteForDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {otherNotes.length > 0 && (
            <div className="space-y-6">
              {pinnedNotes.length > 0 && (
                <h2 className="text-[10px] font-bold text-sage-400 uppercase tracking-[0.2em] px-2">Lainnya</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {otherNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onPin={() => updateNote(note.id, { isPinned: !note.isPinned })}
                    onArchive={() => archiveNote(note.id, !note.isArchived)}
                    onWhatsApp={handleWhatsAppExport}
                    onUpdate={updateNote}
                    onClick={setSelectedNoteForDetail}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredNotes.length === 0 && searchQuery && (
            <div className="text-center py-20">
              <p className="text-sage-300 font-medium italic">Tidak ada catatan yang sesuai dengan pencarian.</p>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <NoteDetailModal
        note={notes.find(n => n.id === selectedNoteForDetail?.id) || selectedNoteForDetail}
        onClose={() => setSelectedNoteForDetail(null)}
        onEdit={startEdit}
        onDelete={handleDelete}
        onPin={() => {
          const currentNote = notes.find(n => n.id === selectedNoteForDetail?.id) || selectedNoteForDetail;
          if (currentNote) {
            updateNote(currentNote.id, { isPinned: !currentNote.isPinned });
          }
        }}
        onArchive={() => {
          const currentNote = notes.find(n => n.id === selectedNoteForDetail?.id) || selectedNoteForDetail;
          if (currentNote) {
            archiveNote(currentNote.id, !currentNote.isArchived);
          }
        }}
        onWhatsApp={handleWhatsAppExport}
        onUpdate={updateNote}
      />

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-sage-950/80"
              onClick={closeForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ willChange: 'transform, opacity' }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0 p-6 sm:p-8 pb-4 border-b border-sage-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-display text-sage-900">
                      {editingNote ? 'Edit Catatan' : 'Buat Catatan Baru'}
                    </h2>
                    <button
                      type="button"
                      onClick={closeForm}
                      className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center text-sage-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-hide">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest ml-1">Judul Catatan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Daftar Belanja"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl bg-sage-50 border-none focus:ring-2 focus:ring-sage-900/5 transition-all text-sage-900 font-bold placeholder:font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest ml-1">Isi Catatan</label>
                    <textarea
                      required
                      placeholder="Tuliskan hal penting di sini..."
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      rows={6}
                      className="w-full px-6 py-4 rounded-2xl bg-sage-50 border-none focus:ring-2 focus:ring-sage-900/5 transition-all text-sage-900 leading-relaxed resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest ml-1">Lampiran Foto (Opsional)</label>
                    <div className="flex flex-wrap gap-4">
                      {formData.existingImages.map((img, index) => (
                        <div key={`existing-${index}`} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-sage-100 shadow-sm group/prev">
                          <img src={img.url} alt={`Existing ${index}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setFullScreenUrl(img.url)}
                            className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center group/scan"
                          >
                            <ScanLine className="w-5 h-5 text-white opacity-0 group-hover/scan:opacity-100 transition-all scale-75 group-hover/scan:scale-100" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newExisting = [...formData.existingImages];
                              newExisting.splice(index, 1);
                              setFormData({ ...formData, existingImages: newExisting });
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {previewUrls.map((url, index) => (
                        <div key={`new-${index}`} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-sage-100 shadow-sm group/prev">
                          <img src={url} alt={`New ${index}`} className="w-full h-full object-cover" />
                          {isCompressing && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-sage-900" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setFullScreenUrl(url)}
                            className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center group/scan"
                          >
                            <ScanLine className="w-5 h-5 text-white opacity-0 group-hover/scan:opacity-100 transition-all scale-75 group-hover/scan:scale-100" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newTempFiles = [...tempFiles];
                              const newPreviewUrls = [...previewUrls];
                              newTempFiles.splice(index, 1);
                              newPreviewUrls.splice(index, 1);
                              setTempFiles(newTempFiles);
                              setPreviewUrls(newPreviewUrls);
                              URL.revokeObjectURL(url);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {(formData.existingImages.length + tempFiles.length) < 4 && (
                        <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-sage-100 bg-sage-50 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-sage-100 hover:border-sage-200 transition-all text-sage-400 hover:text-sage-600">
                          <Camera className="w-6 h-6" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Tambah</span>
                          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                        </label>
                      )}
                    </div>
                  </div>

                  {tempFiles.length > 0 && (
                    <div className="space-y-3 bg-sage-50 p-4 rounded-2xl border border-sage-100">
                      <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest block">Kualitas Foto</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Hemat', kb: 150, icon: '📉' },
                          { label: 'Standar', kb: 300, icon: '⚖️' },
                          { label: 'Tajam', kb: 500, icon: '✨' }
                        ].map((opt) => (
                          <button
                            key={opt.kb}
                            type="button"
                            disabled={isCompressing}
                            onClick={() => handleTargetChange(opt.kb)}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${compressionTarget === opt.kb
                              ? 'bg-sage-900 border-sage-900 text-white shadow-md'
                              : 'bg-white border-sage-100 text-sage-400 hover:bg-white hover:border-sage-200'
                              } ${isCompressing ? 'opacity-50 grayscale' : ''}`}
                          >
                            <span className="text-xs">{opt.icon}</span>
                            <span className="text-[8px] font-bold uppercase">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-sage-400 uppercase tracking-widest ml-1">Pilih Warna</label>
                    <div className="flex flex-wrap items-center gap-3">
                      {NOTE_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: c.value })}
                          className={`w-10 h-10 rounded-full border-2 transition-all ${formData.color === c.value ? 'border-sage-900 scale-110 shadow-lg' : 'border-sage-100 shadow-sm'
                            }`}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 p-6 sm:p-8 pt-4 border-t border-sage-50 bg-white">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={closeForm}
                      className="flex-1 py-4 rounded-2xl font-bold text-sage-500 hover:bg-sage-50 transition-colors"
                      disabled={isUploading}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="flex-[2] py-4 bg-sage-900 text-white rounded-2xl font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {editingNote ? 'Simpan Perubahan' : 'Simpan Catatan'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Preview Overlay */}
      <AnimatePresence>
        {fullScreenUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/95 flex flex-col p-4 sm:p-8"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <div className="text-white text-xs font-bold uppercase tracking-[0.2em]">Pratinjau Foto Catatan</div>
                <div className="text-white/40 text-[9px] uppercase tracking-widest mt-1">Pastikan foto lampiran tetap terlihat jelas</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={isDownloading}
                  onClick={() => handleDownloadImage(fullScreenUrl!)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                </button>
                <button onClick={() => setFullScreenUrl(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
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


