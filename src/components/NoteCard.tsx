/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Pin, 
  Archive, 
  Trash2, 
  Share2, 
  Tag, 
  Folder, 
  FileCheck, 
  GitFork, 
  CheckSquare, 
  Square,
  Globe,
  Lock,
  CornerDownRight,
  RefreshCw,
  User
} from 'lucide-react';
import { Note, Topic } from '../types';
import { getBgClass, getBorderClass, NOTE_COLORS } from '../lib/colors';
import { useAuth } from '../lib/AuthContext';

interface NoteCardProps {
  note: Note;
  topics: Topic[];
  onEditClick: (note: Note) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onToggleArchive: (id: string, e: React.MouseEvent) => void;
  onToggleTrash: (id: string, e: React.MouseEvent) => void;
  onFork: (note: Note, e: React.MouseEvent) => void;
  onColorChange: (id: string, color: string, e: React.MouseEvent) => void;
  onTopicChange?: (id: string, topicId: string | null, e: React.MouseEvent) => void;
}

// Compact helper to render limited Markdown snippets in the preview cards safely
export const renderPreviewMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Take first 3-4 lines or 150 characters
  const lines = text.split('\n').slice(0, 4);
  const snippet = lines.join('\n');
  const isTruncated = text.split('\n').length > 4 || text.length > 200;

  return (
    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words font-sans">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={`empty-${idx}`} className="h-1" />;

        // Header Check
        if (trimmed.startsWith('#')) {
          const headerText = trimmed.replace(/^#+\s*/, '');
          return <h4 key={`h-${idx}`} className="font-bold text-slate-800 dark:text-slate-100 text-xs mt-1">{headerText}</h4>;
        }

        // Checklist/Bullet Check
        if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const itemText = trimmed.replace(/^(- \[[ xX]\]|- |\* )\s*/, '');
          const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
          return (
            <div key={`li-${idx}`} className="flex items-center gap-1.5 pl-1">
              <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
              <span className={`truncate text-[11px] ${isChecked ? 'line-through text-slate-400 dark:text-slate-600' : ''}`}>
                {itemText}
              </span>
            </div>
          );
        }

        // Bold formatting
        const parts = trimmed.split(/(\*\*.*?\*\*)/);
        return (
          <p key={`p-${idx}`} className="truncate max-w-full">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} className="font-semibold text-slate-800 dark:text-slate-100">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
      {isTruncated && <span className="text-[10px] text-slate-450 dark:text-slate-500 italic block mt-0.5">...mais conteúdo</span>}
    </div>
  );
};

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  topics,
  onEditClick,
  onTogglePin,
  onToggleArchive,
  onToggleTrash,
  onFork,
  onColorChange,
  onTopicChange
}) => {
  const { user } = useAuth();
  
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  
  const bgClass = getBgClass(note.color);
  const borderClass = getBorderClass(note.color);

  // Find linked topic
  const linkedTopic = topics.find(t => t.id === note.topicId);

  // Check if current user is owner
  const isOwner = user?.id === note.createdBy;
  const isCamila = note.createdByEmail === 'camila.silvano@sankhya.com' || note.createdByEmail === 'camila.silvano@sankhya.com.br';

  return (
    <div 
      onClick={() => onEditClick(note)}
      className={`group relative rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${bgClass} ${borderClass} h-full`}
    >
      
      {/* HEADER ROW */}
      <div className="mb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm tracking-tight text-slate-850 dark:text-slate-100 font-sans line-clamp-2 leading-snug break-words pr-4">
            {note.title || <span className="text-slate-400 dark:text-slate-500 italic font-medium">Nota Sem Título</span>}
          </h3>

          {/* Quick toggle pinning */}
          <button 
            onClick={(e) => onTogglePin(note.id, e)}
            className={`p-1 rounded-md transition-colors ${
              note.pinned 
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' 
                : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-600 dark:hover:text-slate-250 hover:bg-slate-100/50 dark:hover:bg-slate-800'
            }`}
            title={note.pinned ? "Desfixar Nota" : "Fixar Nota importante"}
          >
            <Pin size={15} className={note.pinned ? "fill-amber-500" : ""} />
          </button>
        </div>

        {/* Note Creator & Visibility info */}
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 dark:text-slate-550 select-none">
          <div className="w-3.5 h-3.5 bg-slate-200 dark:bg-slate-850 rounded-full flex items-center justify-center font-bold text-[8px] uppercase shrink-0 text-slate-600 dark:text-slate-300">
            {note.createdByEmail?.[0] || 'U'}
          </div>
          <span className="truncate max-w-[120px]" title={note.createdByEmail}>
            {isOwner ? 'Você' : note.createdByEmail.split('@')[0]}
          </span>
          <span className="shrink-0">•</span>
          {note.isPublic ? (
            <span className="flex items-center gap-0.5 text-blue-500" title="Visível para todos da Sankhya">
              <Globe size={9} />
              visto por todos
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-slate-500" title="Privado - Somente você">
              <Lock size={9} />
              privado
            </span>
          )}
        </div>
      </div>

      {/* BODY CONTENT OR CHECKLISTS */}
      <div className="flex-1 min-h-[50px] mb-4">
        {note.contentMarkdown && renderPreviewMarkdown(note.contentMarkdown)}

        {/* Render first few checklist items */}
        {note.checklist && note.checklist.length > 0 && (
          <div className="space-y-1 text-xs mt-1.5 pr-2">
            {note.checklist.slice(0, 4).map((item, idx) => (
              <div key={item.id || `chk-${idx}`} className="flex items-center gap-2 select-none">
                {item.checked ? (
                  <CheckSquare size={13} className="text-emerald-500 shrink-0" />
                ) : (
                  <Square size={13} className="text-slate-400 shrink-0" />
                )}
                <span className={`truncate text-[11px] ${item.checked ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-650 dark:text-slate-300'}`}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.checklist.length > 4 && (
              <p className="text-[10px] text-slate-450 dark:text-slate-500 italic pl-5">
                + {note.checklist.length - 4} itens pendentes
              </p>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ROW */}
      <div className="pt-2 border-t border-slate-100 dark:border-[#1F2833]/65 mt-auto">
        <div className="flex flex-wrap gap-1 mb-2 select-none">
          {/* Topic indicator */}
          {linkedTopic && (
            <span className="text-[9px] font-bold bg-amber-100 dark:bg-[#1F2833] text-amber-900 dark:text-elegant-cyan px-2 py-0.5 rounded-md flex items-center gap-1.5 shrink-0 border border-amber-250/30 dark:border-elegant-cyan/20">
              <Folder size={8} />
              {linkedTopic.title.split(' ')[0]}
            </span>
          )}

          {/* Tags */}
          {note.tags && note.tags.slice(0, 2).map((tag, tIdx) => (
            <span 
              key={`tag-${note.id}-${tag}-${tIdx}`} 
              className="text-[9px] font-mono bg-slate-100 dark:bg-elegant-bg/80 text-slate-600 dark:text-elegant-grey px-1.5 py-0.5 rounded border border-slate-200/50 dark:border-[#1F2833]"
            >
              #{tag}
            </span>
          ))}

          {/* Fork indicator */}
          {note.forkedFromId && (
            <span 
              className="text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-1 border border-indigo-150/40 dark:border-indigo-900/30"
              title="Esta nota é uma edição sua de uma nota pública"
            >
              <GitFork size={8} />
              Fork
            </span>
          )}
        </div>

        {/* BOTTOM HOVER ACTIONS PANEL */}
        <div className="flex items-center justify-between mt-1 h-6">
          <span className="text-[9px] font-mono text-slate-400 select-none">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>

          {/* Action trigger deck (visible on card hover on desktop) */}
          <div className="opacity-80 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1.5 bg-white dark:bg-elegant-card rounded px-1.5 py-0.5 transition-opacity z-10 border border-slate-100 dark:border-[#1F2833] shadow-sm">
            
            {/* Quick Topic Link Picker */}
            <div className="relative flex items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTopicMenu(!showTopicMenu);
                  setShowColorMenu(false);
                }}
                className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500 hover:text-amber-500 dark:hover:text-elegant-cyan transition-colors ${showTopicMenu ? 'text-amber-500 bg-slate-100 dark:text-elegant-cyan dark:bg-slate-850' : ''}`}
                title="Mover para outro Tópico"
              >
                <Folder size={12} />
              </button>
              
              {/* Expand topics list on folder hover or state click */}
              {showTopicMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowTopicMenu(false); }} />
                  <div className="flex flex-col absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-white dark:bg-[#1f2833] border border-slate-200 dark:border-elegant-teal/30 p-1.5 rounded-lg shadow-xl z-25 min-w-[140px] max-h-[160px] overflow-y-auto gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-100">
                    <span className="text-[8px] font-bold text-slate-400 dark:text-[#45A29E] px-1.5 py-0.5 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800">Mover para:</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onTopicChange?.(note.id, null, e);
                        setShowTopicMenu(false);
                      }}
                      className={`w-full text-left px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
                        note.topicId === null 
                          ? 'bg-amber-100 dark:bg-[#0B0C10] text-amber-950 dark:text-elegant-cyan font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-[#0B0C10]/60 text-slate-600 dark:text-[#C5C6C7]'
                      }`}
                    >
                      Sem Tópico
                    </button>
                    {topics.map(t => (
                      <button 
                        key={`q-top-${t.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTopicChange?.(note.id, t.id, e);
                          setShowTopicMenu(false);
                        }}
                        className={`w-full text-left px-1.5 py-1 rounded text-[10px] truncate font-medium transition-colors ${
                          note.topicId === t.id 
                            ? 'bg-amber-100 dark:bg-[#0B0C10] text-amber-950 dark:text-elegant-cyan font-bold' 
                            : 'hover:bg-slate-50 dark:hover:bg-[#0B0C10]/60 text-slate-655 dark:text-[#C5C6C7]'
                        }`}
                        title={t.title}
                      >
                        {t.parentId ? `↳ ${t.title}` : t.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
 
            {/* Color palette widget dots */}
            <div className="relative flex gap-1 items-center">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorMenu(!showColorMenu);
                  setShowTopicMenu(false);
                }}
                className="h-3 w-3 rounded-full border border-slate-300 dark:border-elegant-teal/30 bg-slate-100 dark:bg-[#0B0C10] cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                title="Alterar Cor"
              />
              
              {/* Expand colors on color dot click */}
              {showColorMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowColorMenu(false); }} />
                  <div className="flex absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-white dark:bg-[#1F2833] border border-slate-200 dark:border-elegant-teal/30 p-1 rounded-lg gap-1 shadow-xl z-25 animate-in fade-in slide-in-from-bottom-2 duration-100">
                    {NOTE_COLORS.slice(0, 5).map(col => (
                      <button 
                        key={`col-${col.id}`}
                        onClick={(e) => {
                          onColorChange(note.id, col.id, e);
                          setShowColorMenu(false);
                        }}
                        className={`h-3.5 w-3.5 rounded-full ${col.previewClass} block hover:scale-110 active:scale-95 transition-transform`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
 
            {/* Fork Button */}
            {!isOwner && isCamila && (
              <button 
                onClick={(e) => onFork(note, e)}
                className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded text-indigo-500"
                title="Fazer Fork (Criar cópia editável)"
              >
                <GitFork size={12} />
              </button>
            )}
 
            {/* Archive button */}
            <button 
              onClick={(e) => onToggleArchive(note.id, e)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-550 hover:text-slate-800 dark:hover:text-slate-100"
              title={note.archived ? "Desarquivar" : "Arquivar Nota"}
            >
              <Archive size={12} />
            </button>
 
            {/* Trash button */}
            <button 
              onClick={(e) => onToggleTrash(note.id, e)}
              className="p-1 hover:bg-red-50 dark:hover:bg-red-955 rounded text-red-500"
              title="Enviar para Lixeira"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
};
