import { useState, useEffect, useCallback, useMemo } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useDocumentsStore } from '../store/useDocumentsStore';
import { FamilyDocument, DocCategory, OcrField } from '../types/document';
import { compressImage, getFileType, validateDocFile, ALLOWED_IMAGE_MIME_TYPES, MAX_DOC_SIZE } from '../utils/document';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { CATEGORY_INFO } from '../constants/document';
import { useConfirmStore } from '../store/useConfirmStore';
import { FirebaseError } from 'firebase/app';

const MIN_FILE_SIZE = 100 * 1024; // 100KB untuk gambar
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export * from '../types/document';
export * from '../constants/document';

export function useDocuments() {
  const { userProfile } = useAuthStore();
  const cachedDocuments = useDocumentsStore(state => state.documents);
  const cachedCoupleId = useDocumentsStore(state => state.coupleId);
  const storeLoading = useDocumentsStore(state => state.loading);
  const refreshing = useDocumentsStore(state => state.refreshing);
  const syncError = useDocumentsStore(state => state.error);
  const lastSyncedAt = useDocumentsStore(state => state.lastSyncedAt);
  const refreshDocumentsFromStore = useDocumentsStore(state => state.refreshDocuments);
  const addCachedDocument = useDocumentsStore(state => state.addCachedDocument);
  const updateCachedDocument = useDocumentsStore(state => state.updateCachedDocument);
  const removeCachedDocument = useDocumentsStore(state => state.removeCachedDocument);
  const documents = cachedCoupleId === userProfile?.coupleId ? cachedDocuments : [];
  const loading = storeLoading || Boolean(userProfile?.coupleId && cachedCoupleId !== userProfile.coupleId);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [operationError, setOperationError] = useState<string | null>(null);

  // UI States
  const [showUpload, setShowUpload] = useState(false);
  const [selected, setSelected] = useState<FamilyDocument | null>(null);
  const [activeCat, setActiveCat] = useState<DocCategory | 'all'>('all');
  const [activePartnerId, setActivePartnerId] = useState<string | 'all'>('all');
  const [showCatDropdown, setShowCatDropdown] = useState(false);

  // Selection States
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { confirm } = useConfirmStore();

  useEffect(() => {
    if (!userProfile?.coupleId) return;
    void refreshDocumentsFromStore(userProfile.coupleId);
  }, [userProfile?.coupleId, refreshDocumentsFromStore]);

  const refreshDocuments = useCallback(async () => {
    if (!userProfile?.coupleId) return false;
    setOperationError(null);
    await refreshDocumentsFromStore(userProfile.coupleId, true);
    return useDocumentsStore.getState().error === null;
  }, [userProfile?.coupleId, refreshDocumentsFromStore]);

  /** Step 2: Upload & Simpan Firestore */
  const uploadAndSave = useCallback(async (params: {
    files: File[];
    name: string;
    category: DocCategory;
    fields: OcrField[];
    rawText: string;
  }) => {
    if (!userProfile?.coupleId || !userProfile?.displayName) throw new Error('Akun belum terhubung.');
    setOperationError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Validasi semua file sebelum mulai upload
      for (const file of params.files) {
        const isImage = ALLOWED_IMAGE_MIME_TYPES.includes(file.type);
        if (!isImage) {
          const validationError = validateDocFile(file);
          if (validationError) throw new Error(validationError);
        }
        const limit = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
        const limitLabel = isImage ? '5MB' : '10MB';
        if (file.size > limit) throw new Error(`File "${file.name}" terlalu besar (Max ${limitLabel}).`);
      }

      const imageUrls: string[] = [];
      const storagePaths: string[] = [];

      // Tentukan fileType dari file pertama (semua file dalam satu dokumen harusnya tipe yang sama)
      const firstFile = params.files[0];
      const detectedFileType = getFileType(firstFile?.type ?? 'image/jpeg', firstFile?.name);
      const detectedMimeType = firstFile?.type || (detectedFileType === 'env' ? 'text/plain' : '');
      
      let totalBytes = 0;
      params.files.forEach(f => totalBytes += f.size);
      let uploadedBytes = 0;

      for (const file of params.files) {
        const fileType = getFileType(file.type, file.name);
        const ext = fileType === 'env' ? 'env' : file.name.split('.').pop();
        const storagePath = `family_documents/${userProfile.coupleId}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
        const storageRef = ref(storage, storagePath);
        const contentType = file.type || (fileType === 'env' ? 'text/plain' : 'application/octet-stream');

        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file, { contentType });
          task.on('state_changed',
            snap => {
              const currentProgress = ((uploadedBytes + snap.bytesTransferred) / totalBytes) * 100;
              setUploadProgress(Math.round(currentProgress));
            },
            reject,
            () => {
              uploadedBytes += file.size;
              resolve();
            }
          );
        });

        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
        storagePaths.push(storagePath);
      }

      const createdAt = new Date();
      const documentData = {
        name: params.name,
        category: params.category,
        fileType: detectedFileType,
        mimeType: detectedMimeType,
        imageUrls,
        storagePaths,
        fields: params.fields,
        extractedText: params.rawText,
        uploadedBy: userProfile.displayName, // Tetap simpan buat fallback data lama
        uploadedById: userProfile.uid,       // ID buat sinkronisasi real-time
        coupleId: userProfile.coupleId,
        createdAt: serverTimestamp(),
      };
      const createdDocument = await addDoc(collection(db, 'family_documents'), documentData);
      addCachedDocument({
        id: createdDocument.id,
        name: params.name,
        category: params.category,
        fileType: detectedFileType,
        mimeType: detectedMimeType,
        imageUrls,
        storagePaths,
        fields: params.fields,
        extractedText: params.rawText,
        uploadedBy: userProfile.displayName,
        uploadedById: userProfile.uid,
        coupleId: userProfile.coupleId,
        createdAt,
      });
      setUploading(false);
    } catch (err: any) {
      setUploading(false);
      let msg = 'Gagal menyimpan dokumen.';
      if (err instanceof FirebaseError) {
        if (err.code === 'storage/unauthorized') msg = 'Anda tidak memiliki izin untuk mengunggah file.';
        else if (err.code === 'storage/quota-exceeded') msg = 'Kapasitas penyimpanan penuh.';
      } else {
        msg = err.message || msg;
      }
      setOperationError(msg);
      throw err;
    }
  }, [addCachedDocument, userProfile]);

  const deleteDocument = useCallback(async (document: FamilyDocument) => {
    setOperationError(null);
    try {
      const paths = document.storagePaths || (document.storagePath ? [document.storagePath] : []);
      const deletePromises = paths.map(path => deleteObject(ref(storage, path)));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'family_documents', document.id));
      removeCachedDocument(document.id);
    } catch (err: any) {
      setOperationError(err.message ?? 'Gagal menghapus dokumen.');
      throw err;
    }
  }, [removeCachedDocument]);

  const updateDocument = useCallback(async (id: string, updates: Partial<FamilyDocument>) => {
    setOperationError(null);
    try {
      const docRef = doc(db, 'family_documents', id);
      
      // Auto-migrate: Jika dokumen lama belum punya ID dan nama pengupload cocok dengan user sekarang
      const original = documents.find(d => d.id === id);
      const finalUpdates: Partial<FamilyDocument> = { ...updates };
      
      const currentName = userProfile?.displayName?.toLowerCase().trim();
      const uploaderName = original?.uploadedBy?.toLowerCase().trim();
      
      if (original && !original.uploadedById && uploaderName === currentName) {
        finalUpdates.uploadedById = userProfile?.uid;
      }

      await updateDoc(docRef, finalUpdates);
      updateCachedDocument(id, finalUpdates);
    } catch (err: any) {
      setOperationError(err.message ?? 'Gagal memperbarui dokumen.');
      throw err;
    }
  }, [documents, updateCachedDocument, userProfile]);

  const error = operationError || syncError;

  // Derived States
  const partners = useMemo(() => {
    return [
      { id: 'me', name: 'Saya' },
      { id: 'partner', name: 'Pasangan' }
    ];
  }, []);

  const filtered = useMemo(() => documents.filter(d => {
    const catOk = activeCat === 'all' || d.category === activeCat;
    
    let partnerOk = activePartnerId === 'all';
    if (!partnerOk) {
      const isMine = d.uploadedById === userProfile?.uid || d.uploadedBy === userProfile?.displayName;
      if (activePartnerId === 'me') partnerOk = isMine;
      if (activePartnerId === 'partner') partnerOk = !isMine;
    }
    
    return catOk && partnerOk;
  }), [documents, activeCat, activePartnerId, userProfile?.uid, userProfile?.displayName]);
  const activeLabel = activeCat === 'all' ? 'Semua Dokumen' : CATEGORY_INFO[activeCat].label;

  // Actions
  const toggleDocSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getBase64Image = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleExportPDF = async () => {
    if (selectedIds.length === 0) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const docsToExport = documents.filter(d => selectedIds.includes(d.id));
      let pageAdded = false;

      for (const item of docsToExport) {
        const urls = item.imageUrls || [item.imageUrl!];
        for (const imgUrl of urls) {
          if (!imgUrl) continue;
          try {
            const dataUrl = await getBase64Image(imgUrl);
            const imgProps = doc.getImageProperties(dataUrl);
            const imgOrientation = imgProps.width > imgProps.height ? 'l' : 'p';
            
            if (!pageAdded) {
              doc.deletePage(1);
              doc.addPage(undefined, imgOrientation);
            } else {
              doc.addPage(undefined, imgOrientation);
            }

            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const imgAspect = imgProps.width / imgProps.height;
            const pdfAspect = pdfWidth / pdfHeight;

            let finalWidth, finalHeight;
            if (imgAspect > pdfAspect) {
              finalWidth = pdfWidth - 20;
              finalHeight = finalWidth / imgAspect;
            } else {
              finalHeight = pdfHeight - 20;
              finalWidth = finalHeight * imgAspect;
            }

            doc.addImage(dataUrl, 'JPEG', (pdfWidth - finalWidth) / 2, (pdfHeight - finalHeight) / 2, finalWidth, finalHeight);
            pageAdded = true;
          } catch (e) {
            console.error('Gagal memuat gambar:', imgUrl, e);
          }
        }
      }

      if (!pageAdded) throw new Error('Tidak ada gambar yang berhasil dimuat.');

      doc.save(`CandyNest_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
      setSelectedIds([]);
      setIsSelectMode(false);
    } catch (err: any) {
      console.error('Export Error:', err);
      alert('Gagal export PDF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = (docItem: FamilyDocument) => {
    confirm({
      title: 'Hapus Dokumen?',
      message: `Apakah kamu yakin ingin menghapus "${docItem.name}"? File di cloud akan dihapus permanen.`,
      confirmText: 'Ya, Hapus',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDocument(docItem);
          setSelected(null);
        } catch (err: any) {
          alert('Gagal menghapus: ' + err.message);
        }
      }
    });
  };

  const getUploaderName = (docItem: FamilyDocument) => {
    const isMine = (docItem.uploadedById && docItem.uploadedById === userProfile?.uid) || 
                   (!docItem.uploadedById && docItem.uploadedBy && docItem.uploadedBy === userProfile?.displayName);
    return isMine ? 'Saya' : 'Pasangan';
  };

  const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return {
    documents,
    loading,
    refreshing,
    lastSyncedAt,
    uploading,
    uploadProgress,
    error,
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
    refreshDocuments,
    uploadAndSave,
    deleteDocument,
    updateDocument,
    toggleDocSelection,
    handleExportPDF,
    handleDelete,
    getInitials,
    getUploaderName,
    compress: compressImage
  };
}
