import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Globe, ExternalLink, Pin, MessageCircle, Inbox, Archive, Edit3, Trash2, ChevronDown, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FamilyNote } from '../types/note';

interface NoteCardProps {
  note: FamilyNote;
  onEdit: (n: FamilyNote) => void;
  onDelete: (n: FamilyNote) => void;
  onPin: () => void;
  onArchive: () => void;
  onWhatsApp: (n: FamilyNote) => void;
  onUpdate: (id: string, updates: Partial<FamilyNote>) => Promise<void>;
  onClick: (n: FamilyNote) => void;
}

export function NoteCard({ note, onEdit, onDelete, onPin, onArchive, onWhatsApp, onUpdate, onClick }: NoteCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Gagal menyalin catatan:", err);
    }
  };

  return (
    <motion.div
      layout
      style={{ backgroundColor: note.color || '#ffffff' }}
      onClick={() => onClick(note)}
      className={`group rounded-[2rem] p-5 md:p-6 border transition-all duration-300 relative flex flex-col gap-4 cursor-pointer ${note.color && note.color !== '#ffffff'
          ? 'border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
          : 'border-sage-100 shadow-sm'
        } hover:shadow-xl hover:shadow-sage-900/5 hover:-translate-y-1 overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="space-y-4 flex-1">
          <h3 className="font-display font-bold text-sage-900 text-base md:text-xl leading-tight line-clamp-2 pr-6">
            {note.title}
          </h3>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-sage-400 uppercase tracking-widest">
            <span>{note.content.substring(0, 40)}{note.content.length > 40 ? '...' : ''}</span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          className={`absolute top-0 right-0 p-2.5 rounded-xl transition-all ${note.isPinned
              ? 'text-rose-500 bg-rose-50 shadow-sm'
              : 'text-sage-300 hover:bg-black/5 opacity-0 group-hover:opacity-100'
            }`}
        >
          <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current' : 'rotate-45'}`} />
        </button>
      </div>

      <div className="flex flex-col gap-4 pt-4 mt-auto border-t border-black/5 relative z-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sage-900 flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
              {note.authorName?.substring(0, 1).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-sage-900 uppercase tracking-tighter">
                {note.authorName}
              </span>
              <span className="text-[8px] font-bold text-sage-400 uppercase tracking-[0.1em]">
                {format(note.createdAt as Date, 'd MMM yyyy', { locale: id })}
              </span>
            </div>
          </div>

          <div className="flex items-center bg-white/40 p-1 rounded-xl border border-black/5 shadow-sm">
            <button
              onClick={handleCopy}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${copied ? 'text-emerald-600 bg-emerald-50' : 'text-sage-400 hover:bg-sage-50'}`}
              title={copied ? "Tersalin!" : "Salin Catatan"}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onWhatsApp(note)}
              className="w-8 h-8 flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Kirim ke WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onArchive}
              className="w-8 h-8 flex items-center justify-center text-sage-400 hover:bg-sage-50 rounded-lg transition-colors"
            >
              {note.isArchived ? <Inbox className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
            <button
              onClick={() => onEdit(note)}
              className="w-8 h-8 flex items-center justify-center text-sage-400 hover:bg-sage-50 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(note)}
              className="w-8 h-8 flex items-center justify-center text-sage-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
