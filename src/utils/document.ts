import { DocCategory, OcrField, FileType } from '../types/document';
import { FIELD_TEMPLATES } from '../constants/document';

/** Format ukuran byte ke string yang mudah dibaca */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Deteksi file environment berdasarkan nama karena MIME-nya sering kosong */
export function isEnvFile(file: Pick<File, 'name' | 'type'>): boolean {
  const name = file.name.toLowerCase();
  return name === '.env' || name.startsWith('.env.') || name.endsWith('.env');
}

/** Deteksi FileType dari MIME type dan nama file */
export function getFileType(mimeType: string, fileName: string = ''): FileType {
  if (isEnvFile({ name: fileName, type: mimeType })) return 'env';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) return 'word';
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) return 'excel';
  if (mimeType === 'application/json') return 'json';
  return 'image'; // fallback
}

/** Info visual per tipe file */
export function getFileTypeInfo(fileType: FileType) {
  const map: Record<FileType, { label: string; emoji: string; color: string; bg: string; ext: string }> = {
    image: { label: 'Gambar',  emoji: '🖼️',  color: 'text-sage-600',   bg: 'bg-sage-50',    ext: '.jpg' },
    pdf:   { label: 'PDF',     emoji: '📄',  color: 'text-rose-600',   bg: 'bg-rose-50',    ext: '.pdf' },
    word:  { label: 'Word',    emoji: '📝',  color: 'text-blue-600',   bg: 'bg-blue-50',    ext: '.docx' },
    excel: { label: 'Excel',   emoji: '📊',  color: 'text-emerald-600',bg: 'bg-emerald-50', ext: '.xlsx' },
    json:  { label: 'JSON',    emoji: '🗂️',  color: 'text-violet-600', bg: 'bg-violet-50',  ext: '.json' },
    env:   { label: 'ENV',     emoji: '🔐',  color: 'text-amber-600',  bg: 'bg-amber-50',   ext: '.env' },
  };
  return map[fileType] ?? map.image;
}

/** MIME types yang diizinkan untuk file non-gambar */
export const ALLOWED_DOC_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/json',
];

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_DOC_SIZE = 10 * 1024 * 1024;  // 10MB untuk non-gambar

/** Validasi file non-gambar: return pesan error atau null jika valid */
export function validateDocFile(file: File): string | null {
  if (!isEnvFile(file) && !ALLOWED_DOC_MIME_TYPES.includes(file.type)) {
    return `Format "${file.name}" tidak didukung. Gunakan PDF, Word, Excel, JSON, atau ENV.`;
  }
  if (file.size > MAX_DOC_SIZE) {
    return `File "${file.name}" melebihi batas 10MB.`;
  }
  return null;
}

/** Kompresi gambar menggunakan Canvas */
export async function compressImage(file: File, maxSizeKB: number = 300): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Format file tidak didukung. Harap unggah gambar.'));
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Tentukan resolusi maksimal berdasarkan target ukuran
        // Hemat (<=200KB) -> 1024px
        // Standar (<=400KB) -> 1600px
        // Tajam (>400KB) -> 2000px
        let maxSide = 1600;
        if (maxSizeKB <= 200) maxSide = 1024;
        else if (maxSizeKB > 400) maxSide = 2000;

        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = (height / width) * maxSide;
            width = maxSide;
          } else {
            width = (width / height) * maxSide;
            height = maxSide;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Mulai dari kualitas lebih tinggi agar "Tajam" benar-benar tajam
        let quality = maxSizeKB > 400 ? 0.95 : 0.85;
        
        const attemptCompress = (q: number) => {
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Gagal memproses gambar'));
            
            // Jika masih kegedean, turunkan kualitas (sampai batas minimal 0.1)
            if (blob.size / 1024 > maxSizeKB && q > 0.1) {
              attemptCompress(q - 0.05); // Turun perlahan biar akurat
            } else {
              // Jika ukuran gambar di bawah 100KB, kita perlu menambahkannya (padding)
              // agar Firebase Storage rule (min 100KB) tidak menolak upload ini.
              if (blob.size < 100 * 1024) {
                const paddingSize = (102 * 1024) - blob.size; // Pad to 102KB
                const padding = new Uint8Array(paddingSize);
                const paddedBlob = new Blob([blob, padding], { type: 'image/jpeg' });
                resolve(new File([paddedBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
              } else {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
              }
            }
          }, 'image/jpeg', q);
        };
        attemptCompress(quality);
      };

    };
    reader.onerror = reject;
  });
}
