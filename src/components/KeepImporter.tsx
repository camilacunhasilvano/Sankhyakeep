/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  File, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  Loader2, 
  FolderPlus, 
  CheckSquare, 
  FileText,
  Tag
} from 'lucide-react';
import { Note, Topic, ChecklistItem } from '../types';
import { useAuth } from '../lib/AuthContext';

interface KeepImporterProps {
  topics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedNotes: Note[], newTopics?: Topic[]) => void;
}

interface ParsedNote {
  fileName: string;
  title: string;
  contentMarkdown: string;
  checklist: ChecklistItem[];
  tags: string[];
  createdAt: string;
}

export const KeepImporter: React.FC<KeepImporterProps> = ({
  topics,
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedNotes, setParsedNotes] = useState<ParsedNote[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen) return null;

  // Robust HTML Parser specifically engineered for Google Keep HTML format
  const parseKeepHTML = (htmlContent: string, fileName: string): ParsedNote => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 1. Title Extraction
    let title = '';
    const titleEl = doc.querySelector('.title') || doc.querySelector('h1') || doc.querySelector('.note-title');
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    } else {
      // Use filename without extension as fallback title
      title = fileName.replace(/\.html$/i, '').replace(/_/g, ' ');
    }

    // 2. Date Extraction
    let createdAt = new Date().toISOString();
    const headingEl = doc.querySelector('.heading') || doc.querySelector('.heading-date');
    if (headingEl && headingEl.textContent) {
      const dateText = headingEl.textContent.trim();
      // Keep lists the date in diverse formats. Let's make a safe extraction
      const parsedDate = Date.parse(dateText);
      if (!isNaN(parsedDate)) {
        createdAt = new Date(parsedDate).toISOString();
      }
    }

    // 3. Checklist Items Extraction
    const checklist: ChecklistItem[] = [];
    const listItems = doc.querySelectorAll('.listitem') || doc.querySelectorAll('ul li');
    
    if (listItems.length > 0) {
      listItems.forEach((item, idx) => {
        const textEl = item.querySelector('.text') || item;
        const text = textEl.textContent ? textEl.textContent.trim() : '';
        if (text) {
          // Detect check status
          // Keep uses classes like 'checked' or standard checkbox inputs, or span bullets
          const isChecked = 
            item.classList.contains('checked') || 
            item.querySelector('input[type="checkbox"]:checked') !== null ||
            item.innerHTML.includes('☑') || 
            item.innerHTML.includes('strike');

          checklist.push({
            id: `imported-item-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            text,
            checked: isChecked
          });
        }
      });
    }

    // Helper to walk DOM subtree recursively and extract text preserving paragraph linebreaks and br tags
    const extractTextPreservingStructure = (el: Element): string => {
      let text = '';
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName;
          if (tag === 'BR') {
            text += '\n';
          } else if (['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE'].includes(tag)) {
            // Append starting break if we are in a block element and text doesn't already end with a break
            if (text && !text.endsWith('\n')) {
              text += '\n';
            }
            for (let i = 0; i < node.childNodes.length; i++) {
              walk(node.childNodes[i]);
            }
            if (!text.endsWith('\n')) {
              text += '\n';
            }
          } else {
            // Inline tags (span, strong, am, a, etc.)
            for (let i = 0; i < node.childNodes.length; i++) {
              walk(node.childNodes[i]);
            }
          }
        }
      };

      for (let i = 0; i < el.childNodes.length; i++) {
        walk(el.childNodes[i]);
      }

      return text;
    };

    // 4. Content / Body Markdown Extraction
    let contentMarkdown = '';
    const contentEl = doc.querySelector('.content') || doc.querySelector('.note-content') || doc.querySelector('.body');
    
    if (contentEl) {
      if (checklist.length > 0) {
        contentMarkdown = ''; // Checklists are saved in the checklist array
      } else {
        const rawText = extractTextPreservingStructure(contentEl);
        contentMarkdown = rawText
          .split('\n')
          .map(line => line.trim())
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }
    } else if (checklist.length === 0) {
      // Last-resort fallback: grab entire body text if nothing specific found
      const bodyClone = doc.body.cloneNode(true) as Element;
      // Remove elements we already processed or won't need in markdown text body
      bodyClone.querySelectorAll('.title, .note-title, .heading, h1, .chip, .tag, ul, ol, li').forEach(el => el.remove());
      
      const rawText = extractTextPreservingStructure(bodyClone);
      contentMarkdown = rawText
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // 5. Tags / Chips Extraction
    const tags: string[] = [];
    const chipEls = doc.querySelectorAll('.chip') || doc.querySelectorAll('.tag');
    chipEls.forEach(chip => {
      if (chip.textContent) {
        const trimmed = chip.textContent.trim().replace(/^#/, '');
        if (trimmed && !tags.includes(trimmed)) {
          tags.push(trimmed);
        }
      }
    });

    return {
      fileName,
      title,
      contentMarkdown,
      checklist,
      tags,
      createdAt
    };
  };

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    setErrorText(null);
    const htmlFiles = Array.from(files).filter(f => f.name.endsWith('.html'));

    if (htmlFiles.length === 0) {
      setErrorText('Por favor, selecione arquivos .html válidos exportados do Google Keep.');
      setIsProcessing(false);
      return;
    }

    const tempParsed: ParsedNote[] = [];

    for (const file of htmlFiles) {
      try {
        const text = await file.text();
        const parsed = parseKeepHTML(text, file.name);
        tempParsed.push(parsed);
      } catch (err) {
        console.error('Failed to parse file: ', file.name, err);
      }
    }

    setParsedNotes(prev => [...prev, ...tempParsed]);
    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  const handleSaveImport = () => {
    if (parsedNotes.length === 0 || !user) return;

    const existingTopicNamesMap = new Map<string, string>(); // lowercase name -> topicId
    topics.forEach(t => {
      existingTopicNamesMap.set(t.title.trim().toLowerCase(), t.id);
    });

    const newlyCreatedTopics: Topic[] = [];
    const localCreatedTopicNamesMap = new Map<string, string>(); // lowercase name -> topicId

    const notesToSave: Note[] = parsedNotes.map((pn, index) => {
      const now = new Date().toISOString();
      let noteTopicId: string | null = selectedTopicId;

      if (pn.tags && pn.tags.length > 0) {
        pn.tags.forEach((tag, tagIndex) => {
          const cleanTag = tag.trim();
          if (!cleanTag) return;
          const tagLower = cleanTag.toLowerCase();

          let matchedTopicId = existingTopicNamesMap.get(tagLower) || localCreatedTopicNamesMap.get(tagLower);

          if (!matchedTopicId) {
            const newTopicId = `topic-imported-${Date.now()}-${index}-${tagIndex}-${Math.random().toString(36).substr(2, 5)}`;
            const newTopic: Topic = {
              id: newTopicId,
              title: cleanTag,
              parentId: null,
              createdBy: user.id,
              isFavorite: false,
              visibility: 'public'
            };
            newlyCreatedTopics.push(newTopic);
            localCreatedTopicNamesMap.set(tagLower, newTopicId);
            matchedTopicId = newTopicId;
          }

          if (tagIndex === 0) {
            noteTopicId = matchedTopicId;
          }
        });
      }

      return {
        id: `imported-note-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        title: pn.title,
        contentMarkdown: pn.contentMarkdown,
        checklist: pn.checklist,
        attachments: [],
        tags: pn.tags.length > 0 ? pn.tags : ['Importado'],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        topicId: noteTopicId,
        isPublic: user.email === 'camila.silvano@sankhya.com' || user.email === 'camila.silvano@sankhya.com.br' || user.email === 'camilahcunha2013@gmail.com',
        createdBy: user.id,
        createdByEmail: user.email,
        version: 1,
        createdAt: pn.createdAt,
        updatedAt: now
      };
    });

    onImportComplete(notesToSave, newlyCreatedTopics);
    setParsedNotes([]);
    setSelectedTopicId(null);
    onClose();
  };

  const handleRemoveParsed = (index: number) => {
    setParsedNotes(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-elegant-card rounded-2xl border border-slate-200 dark:border-elegant-teal/30 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#0B0C10] flex items-center justify-between bg-slate-50 dark:bg-[#0B0C10]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Upload size={16} className="text-amber-500 dark:text-elegant-cyan animate-bounce" />
              Importador Google Keep Takeout
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-[#45A29E]">
              Converta seus arquivos HTML do Google Keep em notas Sankhya organizadas
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTAINER SCROLLER */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* DRAG & DROP ZONE */}
          {parsedNotes.length === 0 && (
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleTriggerFileInput}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/10' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-900/60'
              }`}
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept=".html"
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="animate-spin text-amber-500" size={36} />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Processando e interpretando documentos HTML...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350 shadow-sm">
                    <Upload size={22} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Arraste arquivos HTML do Keep ou clique aqui
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Suporta múltiplos arquivos .html extraídos do Google Takeout
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorText && (
            <div className="bg-red-50 dark:bg-red-955/30 border border-red-200 dark:border-red-900/50 rounded-lg p-3 flex items-start gap-2 text-xs text-red-650 dark:text-red-400">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {/* LISTING PARSED PREVIEWS */}
          {parsedNotes.length > 0 && (
            <div className="space-y-4">
              
              {/* TOPIC SELECTION TO CLASSIFY IMPORT */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2.5">
                <label className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderPlus size={14} />
                  Vincular Tópico Corporativo
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Defina um tópico padrão para colocar todas estas {parsedNotes.length} novas notas:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button 
                    onClick={() => setSelectedTopicId(null)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      selectedTopicId === null 
                        ? 'bg-amber-500 border-amber-600 text-white shadow-sm font-bold' 
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-655 dark:text-slate-350 hover:bg-slate-50'
                    }`}
                  >
                    Sem Tópico
                  </button>
                  {topics.map(topic => (
                    <button 
                      key={topic.id}
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        selectedTopicId === topic.id 
                          ? 'bg-amber-500 border-amber-600 text-white shadow-sm font-bold' 
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-655 dark:text-slate-350 hover:bg-slate-50'
                      }`}
                    >
                      {topic.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTES PREVIEW SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wide px-1">
                  <span>Pre-visualização das Notas ({parsedNotes.length})</span>
                  <button 
                    onClick={() => setParsedNotes([])}
                    className="text-red-500 hover:underline hover:text-red-650"
                  >
                    Limpar tudo
                  </button>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {parsedNotes.map((pn, idx) => (
                    <div 
                      key={idx}
                      className="border border-slate-200 dark:border-slate-850 bg-slate-52/60 dark:bg-slate-950 p-3 rounded-xl flex items-start justify-between gap-3 shadow-inner"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate block">
                            {pn.title || 'Nota Sem Título'}
                          </span>
                          {pn.checklist.length > 0 && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0 uppercase tracking-wide">
                              <CheckSquare size={9} />
                              {pn.checklist.length} itens
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-450 dark:text-slate-400 truncate leading-relaxed">
                          {pn.contentMarkdown || (pn.checklist.length > 0 ? 'Contém itens de checklist' : 'Sem conteúdo de texto')}
                        </p>

                        {/* Optional chips */}
                        {pn.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {pn.tags.map(tag => (
                              <span key={tag} className="text-[8px] font-mono bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded text-slate-500 border border-slate-200/40">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleRemoveParsed(idx)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 p-1 rounded-md transition-colors shrink-0"
                        title="Remover da fila"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* HELP TO RETRIEVE HTML */}
          <div className="border border-slate-200 dark:border-elegant-teal/20 bg-slate-50 dark:bg-[#0B0C10]/80 rounded-xl p-3.5 flex gap-2.5 text-xs text-slate-550 leading-relaxed max-w-full font-sans shadow-sm">
            <HelpCircle size={16} className="text-amber-500 dark:text-elegant-cyan shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800 dark:text-[#C5C6C7]">Como obter o backup do seu Google Keep original?</p>
              <ol className="list-decimal pl-4 space-y-0.5 dark:text-[#C5C6C7]">
                <li>Acesse o site <a href="https://takeout.google.com" target="_blank" rel="noreferrer" className="text-amber-600 dark:text-elegant-cyan font-bold hover:underline">Google Takeout</a></li>
                <li>Desmarque tudo e marque apenas a opção "Google Keep"</li>
                <li>Clique em "Próxima etapa" e exporte</li>
                <li>Baixe o arquivo ZIP, extraia a pasta e envie os arquivos HTML para cá!</li>
              </ol>
            </div>
          </div>

        </div>

        {/* BOTTOM OPTION BAR */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#0B0C10] bg-slate-50 dark:bg-[#0B0C10] flex justify-between gap-2.5 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-250 dark:border-elegant-teal/20 text-slate-700 dark:text-[#C5C6C7] hover:bg-slate-100 dark:hover:bg-[#1F2833]/40 font-semibold text-xs rounded-lg transition-all cursor-pointer"
          >
            Cancelar
          </button>
          
          <button 
            type="button"
            disabled={parsedNotes.length === 0}
            onClick={handleSaveImport}
            className="px-5 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-elegant-cyan dark:text-elegant-bg dark:shadow-[0_0_10px_rgba(102,252,241,0.25)] dark:hover:bg-[#66FCF1]/90 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check size={14} />
            Salvar {parsedNotes.length} Notas Importadas
          </button>
        </div>

      </div>
    </div>
  );
};
