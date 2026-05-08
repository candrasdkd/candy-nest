import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useNotes } from './useNotes';
import { useConfirmStore } from '../store/useConfirmStore';
import { FamilyNote } from '../types/note';

export const useNotesLogic = () => {
  const { notes, loading, addNote, updateNote, archiveNote, uploadNoteImage, handleDelete, compressImage: compress } = useNotes();
  const { confirm, close } = useConfirmStore();

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

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    color: '#ffffff',
    existingImages: [] as { url: string, path: string }[]
  });
  const [tempFiles, setTempFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);

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
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'active' ? !note.isArchived : note.isArchived;
      return matchesSearch && matchesTab;
    });
  }, [notes, searchQuery, activeTab]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.isPinned), [filteredNotes]);
  const otherNotes = useMemo(() => filteredNotes.filter(n => !n.isPinned), [filteredNotes]);

  const closeForm = () => {
    setIsAdding(false);
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      color: '#ffffff',
      existingImages: []
    });
    setTempFiles([]);
    setPreviewUrls([]);
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
          try {
            setIsUploading(true);
            const uploadedImages = [];
            for (const file of tempFiles) {
              const res = await uploadNoteImage(file, compressionTarget);
              uploadedImages.push(res);
            }
            const finalImages = [...formData.existingImages, ...uploadedImages];
            await updateNote(editingNote.id, {
              title: formData.title,
              content: formData.content,
              color: formData.color,
              imageUrl: finalImages.length > 0 ? finalImages[0].url : null,
              imagePath: finalImages.length > 0 ? finalImages[0].path : null,
              imageUrls: finalImages.map(i => i.url),
              imagePaths: finalImages.map(i => i.path)
            });
            closeForm();
          } catch (err) {
            console.error(err);
          } finally {
            setIsUploading(false);
            close();
          }
        }
      });
    } else {
      try {
        setIsUploading(true);
        const uploadedImages = [];
        for (const file of tempFiles) {
          const res = await uploadNoteImage(file, compressionTarget);
          uploadedImages.push(res);
        }
        await addNote(formData.title, formData.content, formData.color, uploadedImages);
        closeForm();
      } catch (err) {
        console.error(err);
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
    setIsAdding(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setIsCompressing(true);
      try {
        const newTempFiles = [...tempFiles];
        const newPreviewUrls = [...previewUrls];
        for (const file of files) {
          const processed = await compress(file, compressionTarget);
          newTempFiles.push(processed);
          newPreviewUrls.push(URL.createObjectURL(processed));
        }
        setTempFiles(newTempFiles);
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
    if (tempFiles.length > 0) {
      setIsCompressing(true);
      try {
        const newTempFiles = [];
        const newPreviewUrls = [];
        for (const file of tempFiles) {
          const processed = await compress(file, newTarget);
          newTempFiles.push(processed);
          newPreviewUrls.push(URL.createObjectURL(processed));
        }
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setTempFiles(newTempFiles);
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
