 import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Pin, Archive, Edit3, Trash2, MessageCircle, 
  Inbox, Globe, ExternalLink, Check, Download,
  ScanLine, Calendar, User, Loader2, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FamilyNote } from '../types/note';

interface NoteDetailModalProps {
  note: FamilyNote | null;
  onClose: () => void;
  onEdit: (n: FamilyNote) => void;
  onDelete: (n: FamilyNote) => void;
  onPin: () => void;
  onArchive: () => void;
  onWhatsApp: (n: FamilyNote) => void;
  onUpdate: (id: string, updates: Partial<FamilyNote>) => Promise<void>;
}

export default function NoteDetailModal({
  note,
  onClose,
  onEdit,
  onDelete,
  onPin,
  onArchive,
  onWhatsApp,
  onUpdate
}: NoteDetailModalProps) {
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedValueIdx, setCopiedValueIdx] = useState<number | null>(null);

  const handleCopy = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin catatan:", err);
    }
  };

  const handleCopyValue = async (val: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedValueIdx(idx);
      setTimeout(() => setCopiedValueIdx(null), 2000);
    } catch (err) {
      console.error("Gagal menyalin nilai:", err);
    }
  };

  const toggleCheckbox = async (idx: number) => {
    if (!note) return;
    const lines = note.content.split('\n');
    const line = lines[idx];

    let newLine = line;
    const trimmed = line.trim();
    if (trimmed.startsWith('>x')) {
      newLine = line.replace(/>x\s?/, '> ');
    } else if (trimmed.startsWith('>')) {
      newLine = line.replace(/>\s?/, '>x ');
    }

    if (newLine !== line) {
      lines[idx] = newLine;
      await onUpdate(note.id, { content: lines.join('\n') });
    }
  };
  const uncheckAll = async () => {
    if (!note) return;
    const newContent = note.content
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('>x')) {
          return line.replace(/>x\s?/, '> ');
        }
        return line;
      })
      .join('\n');

    if (newContent !== note.content) {
      await onUpdate(note.id, { content: newContent });
    }
  };

  const renderContent = () => {
    if (!note) return null;
    const lines = note.content.split('\n');
    
    const checklistLines = lines.filter(line => line.trim().startsWith('>'));
    const totalChecklists = checklistLines.length;
    const checkedCount = checklistLines.filter(line => line.trim().startsWith('>x')).length;
    const hasChecklists = totalChecklists > 0;
    const hasCheckedItems = checkedCount > 0;

    interface ContentBlock {
      type: 'header' | 'group' | 'empty';
      headerText?: string;
      lines?: { text: string; originalIndex: number }[];
    }

    const blocks: ContentBlock[] = [];
    let currentGroup: { text: string; originalIndex: number }[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Improved header detection
      const isMarkdownHeader = trimmed.startsWith('#');
      const isAllCapsHeader = trimmed.length >= 3 && trimmed === trimmed.toUpperCase() && !trimmed.includes(':') && !trimmed.startsWith('>') && !trimmed.startsWith('-') && !trimmed.startsWith('*') && trimmed !== '';
      const isColonHeader = trimmed.endsWith(':') && !trimmed.includes(' ') && trimmed.length > 2; // e.g. "Header:"
      
      const isHeader = isMarkdownHeader || isAllCapsHeader || isColonHeader;

      if (isHeader) {
        if (currentGroup.length > 0) {
          blocks.push({ type: 'group', lines: currentGroup });
          currentGroup = [];
        }
        const headerText = trimmed.replace(/^#+\s*/, '').replace(/:$/, '');
        blocks.push({ type: 'header', headerText });
      } else if (trimmed === '') {
        if (currentGroup.length > 0) {
          blocks.push({ type: 'group', lines: currentGroup });
          currentGroup = [];
        }
        blocks.push({ type: 'empty' });
      } else {
        currentGroup.push({ text: line, originalIndex: idx });
      }
    });

    if (currentGroup.length > 0) {
      blocks.push({ type: 'group', lines: currentGroup });
    }

    return (
      <div className="space-y-4">
        {hasChecklists && (
          <div className="flex items-center justify-between mb-4 bg-sage-50 p-3 rounded-[1.2rem] border border-sage-100">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-[0.8rem] bg-white flex items-center justify-center text-sage-600 shadow-sm">
                <Check className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-sage-400">Progres</span>
                <span className="text-sm font-black text-sage-900 leading-none mt-0.5 font-mono">{checkedCount} <span className="text-sage-400 font-medium">/ {totalChecklists}</span></span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={uncheckAll}
              disabled={!hasCheckedItems}
              className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-[0.8rem] transition-all flex items-center gap-2 ${
                hasCheckedItems 
                  ? 'bg-white text-sage-700 hover:text-rose-500 hover:bg-rose-50 border border-sage-200 shadow-sm active:scale-95' 
                  : 'bg-transparent text-sage-300 opacity-50 cursor-not-allowed'
              }`}
            >
              Reset
            </button>
          </div>
        )}

        {blocks.map((block, blockIdx) => {
          if (block.type === 'empty') {
            return <div key={`empty-${blockIdx}`} className="h-4" />;
          }

          if (block.type === 'header') {
            return (
              <div key={`header-${blockIdx}`} className="pt-6 pb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1.5 h-6 rounded-full bg-sage-900" />
                  <h4 className="text-lg font-display font-bold text-sage-900 tracking-tight">
                    {block.headerText}
                  </h4>
                </div>
                <div className="h-px bg-sage-100 w-full" />
              </div>
            );
          }

          if (block.type === 'group' && block.lines) {
            return (
              <div 
                key={`group-${blockIdx}`} 
                className="bg-white rounded-[2rem] p-5 md:p-6 border border-sage-100 shadow-sm space-y-4"
              >
                {block.lines.map(({ text, originalIndex }) => {
                  const trimmed = text.trim();

                  const isCheckbox = trimmed.startsWith('>') && !trimmed.startsWith('>>');
                  if (isCheckbox) {
                    const isChecked = trimmed.startsWith('>x');
                    const labelText = trimmed.replace(/^>x?\s?/, '').trim();
                    return (
                      <button
                        key={originalIndex}
                        type="button"
                        onClick={() => toggleCheckbox(originalIndex)}
                        className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sage-400 ${
                          isChecked 
                            ? 'bg-sage-50/40 opacity-60' 
                            : 'bg-sage-50/50 hover:bg-sage-50 hover:border-sage-200 border border-sage-100/50 active:scale-[0.99]'
                        }`}
                      >
                        <div className={`mt-0.5 w-6 h-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isChecked ? 'bg-sage-900 border-sage-900 text-white' : 'bg-white border-sage-200'
                        }`}>
                          {isChecked && <Check className="w-4 h-4" strokeWidth={3} />}
                        </div>
                        <span className={`text-base leading-tight transition-all ${isChecked ? 'text-sage-400 line-through' : 'text-sage-800 font-medium'}`}>
                          {labelText}
                        </span>
                      </button>
                    );
                  }

                  const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
                  if (isBullet) {
                    const bulletText = trimmed.substring(2).trim();
                    return (
                      <div key={originalIndex} className="flex items-start gap-4 px-2">
                        <div className="mt-2.5 w-2 h-2 rounded-full bg-sage-300 shrink-0" />
                        <span className="text-base text-sage-700 font-medium leading-relaxed">{bulletText}</span>
                      </div>
                    );
                  }

                  const isUrl = /^(https?:\/\/[^\s]+)$/.test(trimmed);
                  if (isUrl) {
                    return (
                      <a
                        key={originalIndex}
                        href={trimmed}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-sage-50 border border-sage-100 hover:border-sage-200 hover:bg-sage-100/30 transition-all group/link"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-sage-600 group-hover/link:text-sage-900 transition-all duration-300 shrink-0">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-sage-900 truncate">
                            {trimmed.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          </span>
                          <span className="text-[10px] text-sage-400 truncate">
                            {trimmed}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-sage-300 shrink-0" />
                      </a>
                    );
                  }

                  const colonIndex = text.indexOf(':');
                  if (colonIndex !== -1) {
                    const label = text.substring(0, colonIndex).trim();
                    const value = text.substring(colonIndex + 1).trim();
                    const isPassword = /pass|pwd|sandi|pin/i.test(label);
                    const isVisible = showPasswords[originalIndex];

                    return (
                      <div key={originalIndex} className="flex flex-col gap-1 bg-sage-50/30 p-4 rounded-[1.2rem] border border-sage-100/70 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black text-sage-400 uppercase tracking-widest">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyValue(value, originalIndex)}
                              className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
                                copiedValueIdx === originalIndex 
                                  ? 'bg-emerald-50 text-emerald-600' 
                                  : 'bg-white text-sage-600 border border-sage-100 hover:bg-sage-50'
                              }`}
                            >
                              {copiedValueIdx === originalIndex ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {copiedValueIdx === originalIndex ? 'Tersalin' : 'Salin'}
                            </button>
                            {isPassword && (
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, [originalIndex]: !prev[originalIndex] }))}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-sage-100 text-[9px] font-bold text-sage-600 uppercase hover:bg-sage-50 transition-colors"
                              >
                                {isVisible ? 'Sembunyi' : 'Lihat'}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-base font-bold text-sage-900 break-words pr-2">
                          {isPassword && !isVisible ? (
                            <span className="tracking-[0.4em] font-black text-sage-300">••••••••</span>
                          ) : (
                            value
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <p key={originalIndex} className="text-sage-600 text-base leading-relaxed break-words font-medium px-2">
                      {text}
                    </p>
                  );
                })}
              </div>
            );
          }

          return null;
        })}
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {note && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-sage-950/80"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ willChange: 'transform, opacity' }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 sm:p-8 border-b border-sage-50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-display text-sage-900 leading-tight">
                    {note.title}
                  </h2>
                  <div className="flex items-center gap-3 text-sage-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {format(note.createdAt as Date, 'd MMMM yyyy', { locale: id })}
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-sage-200" />
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        Oleh {note.authorName}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center text-sage-400 hover:text-rose-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 scrollbar-hide">
              <div className="space-y-8">
                {/* Images */}
                {(note.imageUrls || [note.imageUrl]).filter(Boolean).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(note.imageUrls || [note.imageUrl!]).map((url, i) => (
                      <div 
                        key={i} 
                        className="group relative rounded-[2rem] overflow-hidden border border-sage-100 shadow-sm aspect-[4/3] cursor-zoom-in"
                        onClick={() => setFullscreenImg(url!)}
                      >
                        <img src={url!} alt={`Lampiran ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ScanLine className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Content */}
                <div className="relative">
                  {renderContent()}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex-shrink-0 p-6 sm:p-8 bg-sage-50/50 border-t border-sage-100">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      copied ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white text-sage-400 border border-sage-100'
                    }`}
                    title={copied ? "Tersalin!" : "Salin Catatan"}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => { onPin(); onClose(); }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      note.isPinned ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-white text-sage-400 border border-sage-100'
                    }`}
                  >
                    <Pin className={`w-5 h-5 ${note.isPinned ? 'fill-current' : 'rotate-45'}`} />
                  </button>
                  <button
                    onClick={() => { onArchive(); onClose(); }}
                    className="w-12 h-12 rounded-2xl bg-white text-sage-400 border border-sage-100 flex items-center justify-center"
                  >
                    {note.isArchived ? <Inbox className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onWhatsApp(note)}
                    className="w-12 h-12 rounded-2xl bg-white text-green-600 border border-sage-100 flex items-center justify-center"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { onEdit(note); onClose(); }}
                    className="flex-1 sm:flex-none px-6 py-3 bg-sage-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => { onDelete(note); onClose(); }}
                    className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Preview */}
      <AnimatePresence>
        {fullscreenImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/95 flex flex-col p-4 sm:p-8"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <div className="text-white text-xs font-bold uppercase tracking-[0.2em]">Pratinjau Foto Catatan</div>
              </div>
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
                      link.download = `note_preview.jpg`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (e) {
                      window.open(fullscreenImg!, '_blank');
                    } finally {
                      setIsDownloading(false);
                    }
                  }} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                </button>
                <button onClick={() => setFullscreenImg(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-sage-900/50">
              <img src={fullscreenImg} className="max-w-full max-h-full object-contain" alt="Preview" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
