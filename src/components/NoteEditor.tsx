/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Pin, 
  Archive, 
  Trash2, 
  Share2, 
  Tag as TagIcon, 
  Folder, 
  Check, 
  Plus, 
  X, 
  CheckSquare, 
  Square,
  Globe,
  Lock,
  History,
  GitFork,
  ArrowLeft,
  Settings,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { Note, ChecklistItem, Topic, NoteVersion } from '../types';
import { NOTE_COLORS, getBgClass, getBorderClass } from '../lib/colors';
import { useAuth } from '../lib/AuthContext';
import { PersistenceService } from '../lib/persistence';

interface NoteEditorProps {
  note: Note | null; // null represents "Creating a new note"
  topics: Topic[];
  activeTopicId: string | null; // Selected topic if any (to auto assign)
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  onDelete: (id: string) => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  topics,
  activeTopicId,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const { user } = themeAwareAuth();
  
  function themeAwareAuth() {
    return useAuth();
  }

  const modalRef = useRef<HTMLDivElement>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [contentMarkdown, setContentMarkdown] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [color, setColor] = useState('default');
  const [pinned, setPinned] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  // Checklist dynamic row input
  const [newCheckItemText, setNewCheckItemText] = useState('');

  // Tag dynamic input
  const [tagInput, setTagInput] = useState('');

  // Versioning state tab
  const [showHistory, setShowHistory] = useState(false);
  const [versionsList, setVersionsList] = useState<NoteVersion[]>([]);
  const [previewVersion, setPreviewVersion] = useState<NoteVersion | null>(null);

  // Check if we are editing an existing note vs composing
  const isEditing = note !== null;

  // AI Refactoring state
  const [isRefactoring, setIsRefactoring] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Row and Paragraph Split Refactor
  const handleAIRefactor = async () => {
    if (!contentMarkdown.trim()) return;
    
    setIsRefactoring(true);
    setAiError(null);
    try {
      const response = await fetch('/api/gemini/refactor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: contentMarkdown }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao chamar a refatoração com IA do Google.');
      }
      
      if (data.refactoredText) {
        setContentMarkdown(data.refactoredText);
      }
    } catch (err: any) {
      console.error('AI Refactor error:', err);
      setAiError(err.message || 'Houve um erro de comunicação ou processamento ao formatar o texto com Google IA.');
    } finally {
      setIsRefactoring(false);
    }
  };

  // Initialize form fields when note opens
  useEffect(() => {
    if (isOpen) {
      setShowHistory(false);
      setPreviewVersion(null);
      if (note) {
        setTitle(note.title);
        setContentMarkdown(note.contentMarkdown);
        setChecklist(note.checklist || []);
        setColor(note.color || 'default');
        setPinned(note.pinned || false);
        setTags(note.tags || []);
        setTopicId(note.topicId);
        setIsPublic(note.isPublic);
        
        // Load note versions history
        const history = PersistenceService.getVersions(note.id);
        setVersionsList(history);
      } else {
        // Composing a blank note
        setTitle('');
        setContentMarkdown('');
        setChecklist([]);
        setColor('default');
        setPinned(false);
        setTags([]);
        setTopicId(activeTopicId); // Inherit the current sidebar topic!
        
        // Default visibility rule:
        // Camila's notes are public, others default to private
        const isCamila = user?.email === 'camila.silvano@sankhya.com' || user?.email === 'camila.silvano@sankhya.com.br';
        setIsPublic(isCamila);
      }
    }
  }, [isOpen, note, activeTopicId, user]);

  if (!isOpen || !user) return null;

  // Save submit
  const handleSaveSubmit = () => {
    const isCamilaNote = note && (note.createdByEmail === 'camila.silvano@sankhya.com' || note.createdByEmail === 'camila.silvano@sankhya.com.br');
    const isEditingOthersPublic = isEditing && !isCamilaNote && note.createdBy !== user.id && note.isPublic;
    const isEditingCamilaPublic = isEditing && isCamilaNote && note.createdBy !== user.id;

    const savedNoteId = (isEditingOthersPublic || isEditingCamilaPublic) 
      ? `fork-note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` // Create a fork wrapper ID
      : note?.id || `new-note-${Date.now()}`;

    const now = new Date().toISOString();

    const finalNote: Note = {
      id: savedNoteId,
      title: title.trim(),
      contentMarkdown: contentMarkdown.trim(),
      checklist,
      attachments: note?.attachments || [],
      tags: tags.length > 0 ? tags : ['Geral'],
      color,
      pinned,
      archived: note?.archived || false,
      trashed: note?.trashed || false,
      topicId,
      isPublic: (isEditingOthersPublic || isEditingCamilaPublic) ? false : isPublic, // Forks are personal and private
      createdBy: (isEditingOthersPublic || isEditingCamilaPublic) ? user.id : note?.createdBy || user.id,
      createdByEmail: (isEditingOthersPublic || isEditingCamilaPublic) ? user.email : note?.createdByEmail || user.email,
      forkedFromId: (isEditingOthersPublic || isEditingCamilaPublic) ? note.id : note?.forkedFromId || null,
      version: (isEditingOthersPublic || isEditingCamilaPublic) ? 1 : note?.version || 1,
      createdAt: (isEditingOthersPublic || isEditingCamilaPublic) ? now : note?.createdAt || now,
      updatedAt: now
    };

    onSave(finalNote);
    onClose();
  };

  // Click outside to dismiss & save
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Check if the actual modal card contains the click, if not - perform dismiss (just like Cancel)
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleSaveSubmit(); // Auto save and close as requested by user
    }
  };

  // CHECKLIST WORKFLOW
  const handleAddCheckItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCheckItemText.trim()) {
      const newItem: ChecklistItem = {
        id: `chk-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        text: newCheckItemText.trim(),
        checked: false
      };
      setChecklist([...checklist, newItem]);
      setNewCheckItemText('');
    }
  };

  const toggleCheckItem = (id: string) => {
    setChecklist(checklist.map(item => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    }));
  };

  const removeCheckItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  // TAGS WORKFLOW
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanTag = tagInput.trim().replace(/^#/, '');
      if (cleanTag && !tags.includes(cleanTag)) {
        setTags([...tags, cleanTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Restore revision version
  const handleRestoreVersion = (v: NoteVersion) => {
    setContentMarkdown(v.contentMarkdown);
    setChecklist(v.checklist || []);
    setPreviewVersion(null);
    setShowHistory(false);
  };

  // Check fork styling
  const isForkingRequired = isEditing && note.createdBy !== user.id && (note.createdByEmail === 'camila.silvano@sankhya.com' || note.createdByEmail === 'camila.silvano@sankhya.com.br' || note.isPublic);

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div 
        ref={modalRef}
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200 transform animate-in zoom-in-95 duration-150 ${getBgClass(color)} ${getBorderClass(color)}`}
      >
        
        {/* EDIT TOP ALIGNMENT HEADER */}
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            
            {showHistory ? (
              <button 
                onClick={() => {
                  setShowHistory(false);
                  setPreviewVersion(null);
                }}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg flex items-center gap-1.5 text-xs text-slate-655 dark:text-slate-350 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Voltar ao editor
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                  {isEditing ? 'Editor de Note' : 'Criar Nova Anotação'}
                </span>
                
                {isForkingRequired && (
                  <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <GitFork size={10} />
                    Edição criará um Fork privado
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* PIN Action */}
            <button 
              type="button"
              onClick={() => setPinned(!pinned)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                pinned 
                  ? 'text-amber-500 bg-amber-100/50 dark:bg-amber-950/30' 
                  : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              title={pinned ? "Desfixar nota" : "Fixar nota importante"}
            >
              <Pin size={16} className={pinned ? "fill-amber-500" : ""} />
            </button>

            {/* REVISIONS HISTORY TAB */}
            {isEditing && (
              <button 
                type="button"
                onClick={() => {
                  setShowHistory(!showHistory);
                  setPreviewVersion(null);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showHistory 
                    ? 'text-indigo-650 bg-indigo-50 dark:bg-indigo-950/35' 
                    : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="Histórico de alterações (Controle de Versão)"
              >
                <History size={16} />
              </button>
            )}

            {/* Sharing toggle: public or private */}
            {!isForkingRequired && (
              <button 
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                  isPublic 
                    ? 'text-blue-600 bg-blue-105/10 dark:bg-blue-950/30' 
                    : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title={isPublic ? "Público para todos da Sankhya" : "Apenas você visualiza"}
              >
                {isPublic ? <Globe size={15} /> : <Lock size={15} />}
                <span>{isPublic ? 'Público' : 'Privado'}</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* VERSIONS / HISTORY PANEL TAB VIEW */}
        {showHistory ? (
          <div className="p-5 flex-1 overflow-y-auto flex gap-4 min-h-[300px]">
            {/* Version log list */}
            <div className="w-1/3 border-r border-black/5 dark:border-white/5 space-y-1.5 pr-3 select-none">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Versões antigas</h4>
              {versionsList.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Nenhum histórico de versão disponível ainda. O histórico é gravado ao modificar o texto.</p>
              ) : (
                versionsList.map(v => (
                  <button 
                    key={v.version}
                    onClick={() => setPreviewVersion(v)}
                    className={`w-full text-left p-2 rounded-lg border text-xs leading-relaxed transition-all ${
                      previewVersion?.version === v.version 
                        ? 'bg-amber-500 border-amber-600 text-white font-bold' 
                        : 'bg-white/40 border-black/5 hover:bg-black/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-bold flex items-center justify-between">
                      <span>Versão {v.version}</span>
                      <span className="text-[10px] font-mono opacity-80">{new Date(v.changedAt).toLocaleTimeString()}</span>
                    </p>
                    <p className="opacity-80 text-[10px] truncate">Por: {v.changedBy.split('@')[0]}</p>
                  </button>
                ))
              )}
            </div>

            {/* Version preview output */}
            <div className="flex-1 space-y-3 min-w-0">
              {previewVersion ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-2 rounded-lg pr-4">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Mostrando versão {previewVersion.version}</span>
                    <button 
                      onClick={() => handleRestoreVersion(previewVersion)}
                      className="px-2 py-1 bg-amber-500 text-white font-bold rounded text-xs hover:bg-amber-600"
                    >
                      Restaurar Versão
                    </button>
                  </div>

                  <div className="bg-white/30 dark:bg-slate-950 p-4 rounded-xl border border-black/5 max-h-[300px] overflow-y-auto text-xs font-mono leading-relaxed break-words whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {previewVersion.contentMarkdown}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 italic h-48 space-y-2">
                  <History size={32} />
                  <p className="text-xs">Selecione uma versão ao lado para pré-visualizar ou restaurar conteúdos arquivados.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CORE EDITOR INPUT FORM BODY */
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            
            {/* Title */}
            <div>
              <input 
                type="text"
                placeholder="Título da Nota..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-base sm:text-lg font-bold bg-transparent outline-none border-none placeholder-slate-400 dark:placeholder-slate-550 text-slate-850 dark:text-slate-50 font-sans"
              />
            </div>

            {/* Topic Link Picker */}
            <div className="flex flex-col gap-1.5 select-none">
              <span className="text-xs font-bold text-slate-500 dark:text-elegant-teal uppercase tracking-wider flex items-center gap-1.5">
                <Folder size={13} />
                Vincular esta Nota a um Tópico
              </span>
              <select
                value={topicId || ''}
                onChange={(e) => setTopicId(e.target.value || null)}
                className="w-full text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 dark:bg-[#1F2833] dark:hover:bg-[#1F2833]/80 border border-slate-200 dark:border-elegant-teal/20 text-slate-800 dark:text-white rounded-xl p-2.5 outline-none focus:border-amber-400 dark:focus:border-elegant-cyan transition-all cursor-pointer font-medium"
              >
                <option value="">Nenhum (Nota Geral)</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.parentId ? `↳ ${topic.title}` : topic.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Markdown Text Body */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Conteúdo (Markdown)</span>
                
                {/* AI Refactoring Action */}
                <button
                  type="button"
                  onClick={handleAIRefactor}
                  disabled={isRefactoring || !contentMarkdown.trim()}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm border ${
                    isRefactoring 
                      ? 'bg-amber-100 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-900/40 select-none animate-pulse' 
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border-amber-200 dark:from-slate-900 dark:to-[#1F2833] dark:hover:from-[#1F2833] dark:hover:to-elegant-bg dark:border-elegant-teal/20 text-amber-600 dark:text-elegant-cyan'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="Formatar texto em parágrafos e linhas limpas usando a Inteligência Artificial do Google"
                >
                  <Sparkles size={13} className={isRefactoring ? 'animate-spin text-amber-500' : 'text-amber-500 dark:text-elegant-cyan'} />
                  <span>{isRefactoring ? 'Formatando com Google IA...' : 'Formatar Linhas com IA'}</span>
                </button>
              </div>
              
              {aiError && (
                <p className="text-[10px] text-red-500 font-medium mb-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 px-2.5 py-1.5 rounded-lg">
                  {aiError}
                </p>
              )}

              <textarea 
                rows={10}
                placeholder="Escreva sua anotação em Markdown... Use # para títulos, ** para negrito, - para listas, etc."
                value={contentMarkdown}
                onChange={(e) => setContentMarkdown(e.target.value)}
                className="w-full text-xs sm:text-sm bg-transparent outline-none border-none resize-none placeholder-slate-400 dark:placeholder-slate-600 text-slate-750 dark:text-slate-200 leading-relaxed font-sans min-h-[140px]"
              />
            </div>

            {/* CHECKLIST COMPONENT (KEEP CARD CHIPS) */}
            <div className="border-t border-black/5 dark:border-white/5 pt-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 select-none">
                <CheckSquare size={13} />
                Lista de Tarefas ({checklist.length})
              </h4>

              {/* Checklist editor listing */}
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 group">
                    <div 
                      onClick={() => toggleCheckItem(item.id)}
                      className="flex items-center gap-2 flex-1 cursor-pointer select-none min-w-0"
                    >
                      {item.checked ? (
                        <CheckSquare size={15} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Square size={15} className="text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <span className={`text-xs truncate ${item.checked ? 'line-through text-slate-400 dark:text-slate-600 font-normal' : 'text-slate-750 dark:text-slate-200'}`}>
                        {item.text}
                      </span>
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeCheckItem(item.id)}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Checklist quick adding form */}
              <form onSubmit={handleAddCheckItem} className="flex gap-2.5 mt-2">
                <input 
                  type="text"
                  placeholder="Adicionar item à lista..."
                  value={newCheckItemText}
                  onChange={(e) => setNewCheckItemText(e.target.value)}
                  className="bg-black/5 dark:bg-white/5 rounded-lg text-xs px-3 py-1.5 outline-none border border-transparent focus:border-amber-300 w-full text-slate-750 dark:text-slate-200 font-sans"
                />
                <button 
                  type="submit"
                  disabled={!newCheckItemText.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus size={14} />
                  Item
                </button>
              </form>
            </div>

            {/* TAGS CONTROL PANEL */}
            <div className="border-t border-black/5 dark:border-white/5 pt-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 select-none">
                <TagIcon size={13} />
                Tags (#)
              </h4>

              <div className="flex flex-wrap gap-1 mb-2 select-none">
                {tags.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic">Nenhuma tag vinculada</span>
                ) : (
                  tags.map(tag => (
                    <span 
                      key={tag} 
                      className="text-[10px] font-semibold bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1 border border-black/10 dark:border-white/10"
                    >
                      #{tag}
                      <button 
                        onClick={() => removeTag(tag)}
                        className="text-slate-400 hover:text-red-500 rounded-full"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <input 
                type="text"
                placeholder="Digitar nova tag e apertar Enter..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="bg-black/5 dark:bg-white/5 rounded-lg text-xs px-3 py-1.5 outline-none border border-transparent focus:border-amber-300 w-full text-slate-750 dark:text-slate-200 font-sans"
              />
            </div>

          </div>
        )}

        {/* BOTTOM OPTION CONFIG BAR */}
        <div className="px-5 py-3 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-slate-950 flex flex-wrap gap-3 items-center justify-between shrink-0">
          
          {/* Colors quick map array */}
          <div className="flex items-center gap-1.5 select-none">
            {NOTE_COLORS.map(col => (
              <button 
                key={col.id}
                type="button"
                onClick={() => setColor(col.id)}
                className={`h-4.5 w-4.5 rounded-full border transform hover:scale-110 transition-transform cursor-pointer ${col.previewClass} ${
                  color === col.id ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 border-amber-600 scale-105' : 'border-slate-300 dark:border-slate-700'
                }`}
                title={col.name}
              />
            ))}
          </div>

          <div className="flex gap-2.5">
            {isEditing && (
              <button 
                type="button"
                onClick={() => {
                  onDelete(note.id);
                  onClose();
                }}
                className="px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 hover:border hover:border-red-200 dark:hover:border-red-900/50 cursor-pointer"
                title="Mover para a lixeira"
              >
                <Trash2 size={13} />
                Excluir
              </button>
            )}

            <button 
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 dark:border-elegant-teal/20 hover:bg-black/5 dark:hover:bg-[#1F2833]/40 text-slate-700 dark:text-[#C5C6C7] font-bold text-xs rounded-lg transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button 
              type="button"
              onClick={handleSaveSubmit}
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-elegant-cyan dark:text-elegant-bg dark:shadow-[0_0_10px_rgba(102,252,241,0.25)] font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isForkingRequired ? 'Criar Fork Pessoal' : (isEditing ? 'Salvar Alterações' : 'Criar Nota')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
