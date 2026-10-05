import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, updateDoc, doc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { FamilyNote } from '../types/note';
import { useConfirmStore } from '../store/useConfirmStore';
import { compressImage } from '../utils/document';

export function useNotes() {
  const { userProfile } = useAuthStore();
  const [notes, setNotes] = useState<FamilyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmStore();

  useEffect(() => {
    setLoading(true);
    setNotes([]);
    setError(null);
    if (!userProfile?.coupleId) {
      setLoading(false);
      return;
    }
    
    const q = query(
      collection(db, 'family_notes'),
      where('coupleId', '==', userProfile.coupleId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const notesData = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date(),
        } as FamilyNote;
      });
      setNotes(notesData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching notes:', err);
      setError('Gagal memuat catatan.');
      setLoading(false);
    });
  }, [userProfile?.coupleId]);

  const uploadNoteImage = async (file: File): Promise<{ url: string, path: string }> => {
    if (!userProfile?.coupleId) throw new Error('Couple ID not found');

    const path = `notes/${userProfile.coupleId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    try {
      const url = await getDownloadURL(storageRef);
      return { url, path };
    } catch (error) {
      await deleteObject(storageRef).catch(cleanupError => console.error('Gagal membersihkan unggahan catatan:', cleanupError));
      throw error;
    }
  };

  const deleteNoteImages = useCallback(async (paths: string[]) => {
    const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
    const results = await Promise.allSettled(uniquePaths.map(path => deleteObject(ref(storage, path))));
    results.filter(result => result.status === 'rejected').forEach(result => {
      console.error('Gagal menghapus lampiran catatan:', result.reason);
    });
  }, []);

  const addNote = useCallback(async (title: string, content: string, color?: string, images?: { url: string, path: string }[]) => {
    if (!userProfile?.coupleId || !userProfile?.uid) return;
    
    try {
      await addDoc(collection(db, 'family_notes'), {
        title,
        content,
        color: color || '#ffffff',
        imageUrl: images && images.length > 0 ? images[0].url : null,
        imagePath: images && images.length > 0 ? images[0].path : null,
        imageUrls: images ? images.map(img => img.url) : [],
        imagePaths: images ? images.map(img => img.path) : [],
        userId: userProfile.uid,
        coupleId: userProfile.coupleId,
        authorName: userProfile.displayName || 'User',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPinned: false
      });
    } catch (err: any) {
      console.error('Error adding note:', err);
      setError('Gagal menambah catatan.');
      throw err;
    }
  }, [userProfile]);

  const updateNote = useCallback(async (id: string, updates: Partial<FamilyNote>) => {
    try {
      const noteRef = doc(db, 'family_notes', id);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error('Error updating note:', err);
      setError('Gagal memperbarui catatan.');
      throw err;
    }
  }, []);

  const deleteNote = useCallback(async (note: FamilyNote) => {
    try {
      const pathsToDelete = new Set(note.imagePaths || []);
      if (note.imagePath) pathsToDelete.add(note.imagePath);
      await deleteDoc(doc(db, 'family_notes', note.id));
      await deleteNoteImages(Array.from(pathsToDelete));
    } catch (err: any) {
      console.error('Error deleting note:', err);
      setError('Gagal menghapus catatan.');
      throw err;
    }
  }, [deleteNoteImages]);

  const clearError = useCallback(() => setError(null), []);
  const reportError = useCallback((message: string) => setError(message), []);

  const archiveNote = useCallback(async (id: string, isArchived: boolean) => {
    try {
      await updateNote(id, { isArchived });
    } catch (err) {
      // Error handled in updateNote
    }
  }, [updateNote]);

  const handleDelete = (note: FamilyNote) => {
    confirm({
      title: 'Hapus Catatan?',
      message: `Apakah Anda yakin ingin menghapus catatan "${note.title || 'Tanpa Judul'}"?`,
      confirmText: 'Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteNote(note);
        } catch (err) {
          // Error handled in hook
        }
      }
    });
  };

  return {
    notes,
    loading,
    error,
    clearError,
    reportError,
    addNote,
    updateNote,
    deleteNote,
    archiveNote,
    uploadNoteImage,
    deleteNoteImages,
    handleDelete,
    compressImage
  };
}
