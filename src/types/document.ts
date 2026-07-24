export type DocCategory = 'ktp' | 'sim' | 'npwp' | 'nikah' | 'ijazah' | 'transkrip' | 'akta' | 'paspor' | 'kk' | 'sertifikat' | 'bpjs_kes' | 'bpjs_ket' | 'asuransi' | 'sip' | 'struk' | 'lainnya';

export type FileType = 'image' | 'pdf' | 'word' | 'excel' | 'json' | 'env';

export interface OcrField {
  label: string;
  value: string;
}

export interface FamilyDocument {
  id: string;
  name: string;
  category: DocCategory;
  fileType: FileType;       // Tipe file: image / pdf / word / excel / json / env
  mimeType?: string;        // MIME type asli file
  imageUrls: string[];      // URL file (gambar maupun non-gambar)
  storagePaths: string[];
  imageUrl?: string;        // Legacy
  storagePath?: string;     // Legacy
  extractedText: string;
  fields: OcrField[];
  uploadedBy: string;
  uploadedById?: string;
  createdAt: Date;
  coupleId: string;
}
