import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNotes } from './useNotes';
import { useConfirmStore } from '../store/useConfirmStore';
import { FamilyNote } from '../types/note';
import { useAuthStore } from '../store/useAuthStore';

export const useNotesLogic = () => {
  const { notes, loading, error, clearError, reportError, addNote, updateNote, archiveNote, uploadNoteImage, deleteNoteImages, handleDelete, compressImage: compress } = useNotes();
  const { confirm, close } = useConfirmStore();
  const userProfile = useAuthStore(state => state.userProfile);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [editingNote, setEditingNote] = useState<FamilyNote | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedNoteForDetail, setSelectedNoteForDetail] = useState<FamilyNote | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionTarget, setCompressionTarget] = useState(300);
  const [originalFiles, setOriginalFiles] = useState<File[]>([]);
  const [hydratedDraftKey, setHydratedDraftKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    color: '#ffffff',
    existingImages: [] as { url: string, path: string }[]
  });
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);

  const draftKey = userProfile?.uid && userProfile.coupleId
    ? `candynest:note-draft:${userProfile.coupleId}:${userProfile.uid}:${editingNote ? `edit:${editingNote.id}` : 'new'}`
    : null;

  useEffect(() => {
    setHydratedDraftKey(null);
    if (!isAdding || !draftKey) return;
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (rawDraft) {
        const draft = JSON.parse(rawDraft);
        setFormData(current => ({
          ...current,
          title: typeof draft.title === 'string' ? draft.title : current.title,
          content: typeof draft.content === 'string' ? draft.content : current.content,
          color: typeof draft.color === 'string' ? draft.color : current.color,
          existingImages: Array.isArray(draft.existingImages) ? draft.existingImages : current.existingImages
        }));
      }
    } catch (draftError) {
      console.warn('Draf catatan lokal tidak dapat dipulihkan:', draftError);
    }
    setHydratedDraftKey(draftKey);
  }, [isAdding, draftKey]);

  useEffect(() => {
    if (!isAdding || !draftKey || hydratedDraftKey !== draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        title: formData.title,
        content: formData.content,
        color: formData.color,
        existingImages: formData.existingImages
      }));
    } catch (draftError) {
      console.warn('Draf catatan lokal tidak dapat disimpan:', draftError);
    }
  }, [isAdding, draftKey, hydratedDraftKey, formData]);

  const NOTE_COLORS = [
    { name: 'Putih', value: '#ffffff' },
    { name: 'Mawar', value: '#fff1f2' },
    { name: 'Biru', value: '#eff6ff' },
    { name: 'Hijau', value: '#f0fdf4' },
    { name: 'Kuning', value: '#fffbeb' },
    { name: 'Ungu', value: '#faf5ff' },
    { name: 'Sage', value: '#f1f5f1' },
    { name: 'Langit', value: '#f0f9ff' },
    { name: 'Mint', value: '#f0fff4' },
    { name: 'Lavender', value: '#f5f3ff' },
    { name: 'Coklat', value: '#fafaf9' },
    { name: 'Susu', value: '#fefce8' },
    { name: 'Oranye', value: '#fff7ed' },
  ];

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch = note.title.toLowerCase().includes(normalizedSearch) ||
        note.content.toLowerCase().includes(normalizedSearch);
      const matchesTab = activeTab === 'active' ? !note.isArchived : note.isArchived;
      return matchesSearch && matchesTab;
    });
  }, [notes, searchQuery, activeTab]);

  const sortedNotes = useMemo(() => [...filteredNotes].sort((a, b) => {
    const dateValue = (value: FamilyNote['updatedAt'] | FamilyNote['createdAt']) => {
      if (!value) return 0;
      return value instanceof Date ? value.getTime() : value.toDate().getTime();
    };
    return dateValue(b.updatedAt || b.createdAt) - dateValue(a.updatedAt || a.createdAt);
  }), [filteredNotes]);

  const pinnedNotes = useMemo(() => sortedNotes.filter(n => n.isPinned), [sortedNotes]);
  const otherNotes = useMemo(() => sortedNotes.filter(n => !n.isPinned), [sortedNotes]);
  const closeForm = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setIsAdding(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      color: '#ffffff',
      existingImages: []
    });
    setTempFiles([]);
    setOriginalFiles([]);
    setPreviewUrls([]);
    clearError();
    if (draftKey) {
      try { localStorage.removeItem(draftKey); } catch (draftError) { console.warn('Draf catatan lokal tidak dapat dihapus:', draftError); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    if (editingNote) {
      confirm({
        title: 'Simpan Perubahan?',
        message: 'Apakah Anda yakin ingin menyimpan perubahan pada catatan ini?',
        confirmText: 'Simpan',
        onConfirm: async () => {
          const uploadedImages: { url: string; path: string }[] = [];
          try {
            setIsUploading(true);
            for (const file of tempFiles) {
              const res = await uploadNoteImage(file);
              uploadedImages.push(res);
            }
            const finalImages = [...formData.existingImages, ...uploadedImages];
            const noteUpdates: Partial<FamilyNote> = {
              title: formData.title,
              content: formData.content,
              color: formData.color,
              imageUrl: finalImages.length > 0 ? finalImages[0].url : null,
              imagePath: finalImages.length > 0 ? finalImages[0].path : null,
              imageUrls: finalImages.map(i => i.url),
              imagePaths: finalImages.map(i => i.path)
            };
            await updateNote(editingNote.id, noteUpdates);
            const retainedPaths = new Set(finalImages.map(image => image.path));
            const removedPaths = (editingNote.imagePaths || (editingNote.imagePath ? [editingNote.imagePath] : []))
              .filter(path => !retainedPaths.has(path));
            await deleteNoteImages(removedPaths);
            clearError();
            closeForm();
          } catch (err) {
            console.error(err);
            reportError('Gagal menyimpan perubahan. Periksa koneksi lalu coba lagi.');
            await deleteNoteImages(uploadedImages.map(image => image.path));
          } finally {
            setIsUploading(false);
            close();
          }
        }
      });
    } else {
      const uploadedImages: { url: string; path: string }[] = [];
      try {
        setIsUploading(true);
        for (const file of tempFiles) {
          const res = await uploadNoteImage(file);
          uploadedImages.push(res);
        }
        await addNote(formData.title, formData.content, formData.color, uploadedImages);
        clearError();
        closeForm();
      } catch (err) {
        console.error(err);
        reportError('Gagal menyimpan catatan. Periksa koneksi lalu coba lagi.');
        // Bersihkan upload yang belum terhubung ke dokumen agar tidak meninggalkan file yatim.
        await deleteNoteImages(uploadedImages.map(image => image.path));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleWhatsAppExport = (note: FamilyNote) => {
    let text = `*${note.title || 'Catatan Keluarga'}*\n`;
    text += `━━━━━━━━━━━━━━━\n\n`;

    const lines = note.content.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      const checkboxMatch = trimmed.match(/^>(x?)\s?(.*)$/);
      if (checkboxMatch) {
        const isChecked = checkboxMatch[1].toLowerCase() === 'x';
        const content = checkboxMatch[2].trim();
        text += isChecked ? `✅ ~${content}~\n` : `🔳 ${content}\n`;
      }
      else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        const bulletContent = trimmed.replace(/^[-*•]\s?/, '').trim();
        text += `• ${bulletContent}\n`;
      }
      else if (trimmed.includes(':') && !trimmed.startsWith('http')) {
        const [label, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        text += `*${label.trim()}:* ${value}\n`;
      }
      else if (trimmed !== '') {
        text += `${line}\n`;
      } else {
        text += `\n`;
      }
    });

    if (note.imageUrls && note.imageUrls.length > 0) {
      text += `\n🖼️ *Lampiran Foto:*\n`;
      note.imageUrls.forEach((url, i) => {
        text += `- Foto ${i + 1}: ${url}\n`;
      });
    }

    text += `\n━━━━━━━━━━━━━━━\n`;
    text += `👤 *Oleh:* ${note.authorName}\n`;
    text += `📅 *Tanggal:* ${format(note.createdAt as Date, 'd MMMM yyyy', { locale: id })}\n`;
    text += `\n_Dikirim via CandyNest_`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const startEdit = (note: FamilyNote) => {
    setEditingNote(note);
    let existing: { url: string, path: string }[] = [];
    if (note.imageUrls && note.imagePaths && note.imageUrls.length > 0) {
      existing = note.imageUrls.map((url, i) => ({ url, path: note.imagePaths![i] }));
    } else if (note.imageUrl && note.imagePath) {
      existing = [{ url: note.imageUrl, path: note.imagePath }];
    }

    setFormData({
      title: note.title,
      content: note.content,
      color: note.color || '#ffffff',
      existingImages: existing
    });
    setPreviewUrls([]);
    setTempFiles([]);
    setOriginalFiles([]);
    clearError();
    setIsAdding(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsCompressing(true);
      try {
        const newTempFiles = [...tempFiles];
        const newOriginalFiles = [...originalFiles];
        const newPreviewUrls = [...previewUrls];
        for (const file of files) {
          const processed = await compress(file, compressionTarget);
          newTempFiles.push(processed);
          newOriginalFiles.push(file);
          newPreviewUrls.push(URL.createObjectURL(processed));
        }
        setTempFiles(newTempFiles);
        setOriginalFiles(newOriginalFiles);
        setPreviewUrls(newPreviewUrls);
      } catch (err) {
        console.error("Compression failed", err);
      } finally {
        setIsCompressing(false);
      }
    }
    e.target.value = '';
  };

  const handleTargetChange = async (newTarget: number) => {
    setCompressionTarget(newTarget);
    if (originalFiles.length > 0) {
      setIsCompressing(true);
      try {
        const newTempFiles = [];
        const newPreviewUrls = [];
        for (const file of originalFiles) {
          const processed = await compress(file, newTarget);
          newTempFiles.push(processed);
          newPreviewUrls.push(URL.createObjectURL(processed));
        }
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setTempFiles(newTempFiles);
        setOriginalFiles([...originalFiles]);
        setPreviewUrls(newPreviewUrls);
      } catch (err) {
        console.error(err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleDownloadImage = async (url: string) => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `note_preview.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    notes,
    loading,
    error,
    clearError,
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
    originalFiles,
    setOriginalFiles,
    previewUrls,
    setPreviewUrls,
    fullScreenUrl,
    setFullScreenUrl,
    isDownloading,
    selectedNoteForDetail,
    setSelectedNoteForDetail,
    handleDownloadImage,
    NOTE_COLORS,
    filteredNotes,
    pinnedNotes,
    otherNotes,
    handleSubmit,
    handleWhatsAppExport,
    startEdit,
    closeForm,
    handleFileChange,
    handleTargetChange,
    updateNote,
    archiveNote,
    handleDelete
  };
};
