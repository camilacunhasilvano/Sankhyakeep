/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  Folder, 
  Loader2, 
  Trash2, 
  Info, 
  Globe, 
  AlertTriangle, 
  User as UserIcon,
  PlusCircle,
  FileSpreadsheet,
  HelpCircle,
  Check,
  Lock,
  Archive,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { NoteCard } from './components/NoteCard';
import { NoteEditor } from './components/NoteEditor';
import { KeepImporter } from './components/KeepImporter';
import { PersistenceService } from './lib/persistence';
import { Note, Topic, User } from './types';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, onSnapshot, query, or, where } from 'firebase/firestore';

// Root application wrapping contexts
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceContainer />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Inner workspace component that consumes auth and theme contexts
function WorkspaceContainer() {
  const { user, login, loginWithGoogle, clearError, error, isLoading, isCloudSyncActive } = useAuth();
  const { theme } = useTheme();

  // Simulated login input helpers
  const [typedEmail, setTypedEmail] = useState('');
  const [typedName, setTypedName] = useState('');

  // Sinks for data
  const [notes, setNotes] = useState<Note[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  // Filter and display state
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'archived', 'trashed', 'topic-<id>'
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);

  // Custom Toast notification states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  // Custom Confirmation Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  // Load from local stateless database on startup
  const reloadData = () => {
    try {
      setNotes(PersistenceService.getNotes());
      setTopics(PersistenceService.getTopics());
    } catch (e) {
      console.error('Failed to reload data', e);
    }
  };

  useEffect(() => {
    if (user) {
      if (isCloudSyncActive) {
        // Real-time Firestore subscription
        const unsubTopics = onSnapshot(collection(db, 'topics'), (snapshot) => {
          const list: Topic[] = [];
          snapshot.forEach(doc => {
            list.push(doc.data() as Topic);
          });
          setTopics(list);
          localStorage.setItem('sankhya_keep_topics', JSON.stringify(list));
        }, (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'topics');
          } catch (e) {
            triggerToast('Erro de sincronização de tópicos do Firebase.', 'error');
          }
        });

        const q = query(
          collection(db, 'notes'),
          or(
            where('isPublic', '==', true),
            where('createdBy', '==', user.id)
          )
        );

        const unsubNotes = onSnapshot(q, (snapshot) => {
          const list: Note[] = [];
          snapshot.forEach(doc => {
            list.push(doc.data() as Note);
          });
          setNotes(list);
          localStorage.setItem('sankhya_keep_notes', JSON.stringify(list));
        }, (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'notes');
          } catch (e) {
            triggerToast('Erro de sincronização de notas do Firebase.', 'error');
          }
        });

        return () => {
          unsubTopics();
          unsubNotes();
        };
      } else {
        reloadData();
        
        // Listen to storages updates in different tabs or components
        const handleStorageUpdate = () => {
          reloadData();
        };
        window.addEventListener('storage', handleStorageUpdate);
        return () => window.removeEventListener('storage', handleStorageUpdate);
      }
    }
  }, [user, isCloudSyncActive]);

  // Toast helper
  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedEmail.trim()) {
      triggerToast('Por favor, informe seu e-mail corporativo.', 'error');
      return;
    }
    const success = await login(typedEmail, typedName);
    if (success) {
      triggerToast(`Bem-vindo, ${typedName || typedEmail.split('@')[0]}!`, 'success');
    }
  };

  const handleQuickLogin = async (email: string, name: string) => {
    setTypedEmail(email);
    setTypedName(name);
    const success = await login(email, name);
    if (success) {
      triggerToast(`Conectado como ${name} (${email.split('@')[0]})`, 'success');
    }
  };

  // TOPIC MANIPULATION ACTION DISPATCHERS
  const handleCreateTopic = (title: string, parentId: string | null) => {
    if (!user) return;
    const newTopic: Topic = {
      id: `topic-${Date.now()}`,
      title,
      parentId,
      createdBy: user.id,
      isFavorite: false,
      visibility: 'public'
    };
    const updated = PersistenceService.saveTopic(newTopic);
    setTopics(updated);
    triggerToast(`Tópico "${title}" criado com sucesso!`, 'success');
    
    // Automatically filter by the newly created topic to let the user add notes to it immediately
    setSelectedFilter(`topic-${newTopic.id}`);
  };

  const handleUpdateTopic = (topic: Topic) => {
    const updated = PersistenceService.saveTopic(topic);
    setTopics(updated);
  };

  const handleDeleteTopic = (id: string) => {
    const topic = topics.find(t => t.id === id);
    const title = topic ? topic.title : 'tópico';
    showConfirm(
      'Excluir Tópico',
      `Deseja realmente excluir o tópico "${title}"? Suas notas não serão apagadas, apenas deixarão de estar associadas a este tópico.`,
      () => {
        const updated = PersistenceService.deleteTopic(id);
        setTopics(updated);
        triggerToast('Tópico removido', 'info');
        if (selectedFilter === `topic-${id}`) {
          setSelectedFilter('all');
        }
      }
    );
  };

  // NOTES MANIPULATION DISPATCHERS
  const handleSaveNote = (savedNote: Note) => {
    // Audit check: Fork detection toast alert
    if (editingNote && editingNote.id !== savedNote.id) {
      triggerToast('Nota pública de terceiro editada! Um Fork privado foi criado na sua conta.', 'info');
    } else if (!editingNote) {
      triggerToast('Nota adicionada ao painel.', 'success');
    } else {
      triggerToast('Alterações salvas com sucesso.', 'success');
    }

    const updated = PersistenceService.saveNote(savedNote);
    setNotes(updated);
  };

  const handleImportNotesCompleted = (importedNotes: Note[], newTopics?: Topic[]) => {
    if (newTopics && newTopics.length > 0) {
      newTopics.forEach(topic => {
        PersistenceService.saveTopic(topic);
      });
      if (!isCloudSyncActive) {
        setTopics(PersistenceService.getTopics());
      }
    }
    const updated = PersistenceService.saveNotesBatch(importedNotes);
    setNotes(updated);
    triggerToast(`${importedNotes.length} notas importadas com sucesso!`, 'success');
  };

  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = notes.find(n => n.id === id);
    if (found) {
      const updatedNote = { ...found, pinned: !found.pinned };
      const updated = PersistenceService.saveNote(updatedNote);
      setNotes(updated);
      triggerToast(updatedNote.pinned ? 'Nota fixada no topo 📌' : 'Nota desfixada', 'success');
    }
  };

  const handleToggleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = notes.find(n => n.id === id);
    if (found) {
      const updatedNote = { ...found, archived: !found.archived, pinned: false };
      const updated = PersistenceService.saveNote(updatedNote);
      setNotes(updated);
      triggerToast(updatedNote.archived ? 'Nota arquivada com sucesso' : 'Nota trazida de volta ao painel', 'success');
    }
  };

  const handleToggleTrash = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = notes.find(n => n.id === id);
    if (found) {
      const updatedNote = { ...found, trashed: !found.trashed, pinned: false };
      const updated = PersistenceService.saveNote(updatedNote);
      setNotes(updated);
      triggerToast(updatedNote.trashed ? 'Nota enviada para a Lixeira' : 'Nota restaurada da lixeira', 'success');
    }
  };

  const handleForkNote = (noteToFork: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const now = new Date().toISOString();
    const forked: Note = {
      ...noteToFork,
      id: `fork-note-${Date.now()}`,
      title: `${noteToFork.title} (Fork)`,
      isPublic: false,
      createdBy: user.id,
      createdByEmail: user.email,
      forkedFromId: noteToFork.id,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    const updated = PersistenceService.saveNote(forked);
    setNotes(updated);
    triggerToast('Fork criado! Esta cópia editável é exclusiva sua.', 'success');
  };

  const handleNoteColorChange = (noteId: string, colorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = notes.find(n => n.id === noteId);
    if (found) {
      const updatedNote = { ...found, color: colorId };
      const updated = PersistenceService.saveNote(updatedNote);
      setNotes(updated);
    }
  };

  const handleNoteTopicChange = (noteId: string, topicId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    const found = notes.find(n => n.id === noteId);
    if (found) {
      const updatedNote = { ...found, topicId };
      const updated = PersistenceService.saveNote(updatedNote);
      setNotes(updated);
      const topicTitle = topics.find(t => t.id === topicId)?.title || 'Geral/Nenhum';
      triggerToast(`Nota associada ao tópico: ${topicTitle}`, 'success');
    }
  };

  const handleDeletePermanently = (id: string) => {
    showConfirm(
      'Excluir Nota Permanentemente',
      'Deseja excluir esta nota permanentemente? Esta ação é irreversível.',
      () => {
        const updated = PersistenceService.deleteNote(id);
        setNotes(updated);
        triggerToast('Nota excluída permanentemente.', 'error');
      }
    );
  };

  const handleEmptyTrash = () => {
    showConfirm(
      'Esvaziar Lixeira',
      'Deseja realmente esvaziar a lixeira e excluir todas as notas de lá permanentemente?',
      () => {
        const trashedNotes = notes.filter(n => n.trashed);
        let list = notes;
        trashedNotes.forEach(tn => {
          list = list.filter(n => n.id !== tn.id);
        });
        localStorage.setItem('sankhya_keep_notes', JSON.stringify(list));
        setNotes(list);
        triggerToast('Lixeira esvaziada.', 'info');
      }
    );
  };

  // FILTER LOGIC DISPATCHER
  const getFilteredNotes = (): Note[] => {
    // Filter out notes based on active sidebar selection
    let list = notes;

    // Filter trashed
    if (selectedFilter === 'trashed') {
      list = list.filter(n => n.trashed);
    } else {
      list = list.filter(n => !n.trashed);

      if (selectedFilter === 'archived') {
        list = list.filter(n => n.archived);
      } else {
        // 'all' or 'topic-<id>' are non-archived by default
        list = list.filter(n => !n.archived);

        if (selectedFilter.startsWith('topic-')) {
          const tId = selectedFilter.replace('topic-', '');
          list = list.filter(n => n.topicId === tId);
        }
      }
    }

    // Hide original public note if user already has a private edit (fork) of it to prevent visual clutter
    const userForks = list.filter(n => n.createdBy === user?.id && n.forkedFromId);
    const forkedIds = new Set(userForks.map(f => f.forkedFromId));
    list = list.filter(n => !forkedIds.has(n.id));

    // Instant search keyword filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.contentMarkdown.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q)) ||
        n.createdByEmail.toLowerCase().includes(q)
      );
    }

    return list;
  };

  const filteredNotes = getFilteredNotes();
  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const otherNotes = filteredNotes.filter(n => !n.pinned);

  // VIEW RENDERS FOR AUTHENTICATED VS ANONYMOUS SESSIONS
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-amber-500" size={42} />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verificando sessão corporativa...</p>
      </div>
    );
  }

  // LOGIN PAGE VIEW
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-elegant-bg dark:radial-dots flex flex-col justify-between p-6 select-none transition-colors duration-200 font-sans">
        
        {/* TOP COGNITIVE HEADER FOR SIGNIN */}
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <BookOpen className="text-amber-500 dark:text-elegant-cyan" size={20} />
            <span className="font-extrabold text-sm text-slate-900 dark:text-[#C5C6C7] uppercase tracking-wider">Sankhya Keep</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 dark:bg-elegant-card border border-slate-200 dark:border-elegant-teal/30 px-2.5 py-1 rounded-md">
            Ambiente Interno
          </span>
        </div>

        {/* CORE SIGNIN CARD */}
        <div className="w-full max-w-lg mx-auto bg-white dark:bg-elegant-card border border-slate-200 dark:border-[#1F2833]/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-200 self-center">
          
          <div className="space-y-3 text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 dark:bg-gradient-to-br dark:from-elegant-teal dark:to-elegant-cyan mx-auto flex items-center justify-center transform scale-105 shadow-lg shadow-amber-500/20">
              <BookOpen className="text-white dark:text-[#0B0C10] fill-amber-100 dark:fill-transparent" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white tracking-tight">Sankhya Keep</h2>
              <p className="text-xs text-slate-500 mt-1 dark:text-elegant-teal">
                Plataforma Privada de Gestão de Conhecimento e Anotações
              </p>
            </div>
          </div>

          {/* Warning banner of restritive email domain validation */}
          <div className="bg-amber-100/40 dark:bg-[#0B0C10]/55 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-900 dark:text-elegant-grey border border-amber-250/30 dark:border-[#45A29E]/20 mb-6">
            <Info size={18} className="text-amber-500 dark:text-elegant-cyan shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <p className="font-bold">Validação de E-mail Obrigatória</p>
              <p className="opacity-90">O acesso a este sistema é restrito. Somente são aceitos logins que terminem com os domínios corporativos das subsidiária: <strong>@sankhya.com</strong> ou <strong>@sankhya.com.br</strong>.</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-elegant-teal uppercase tracking-wider">Nome Completo</label>
              <input 
                type="text"
                placeholder="Seu nome (Ex: Camila Silvano)"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                className="w-full rounded-xl border border-slate-350 dark:border-elegant-teal/30 text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-transparent text-sm p-3 focus:border-amber-400 dark:focus:border-elegant-cyan focus:ring-1 focus:ring-amber-400 dark:focus:ring-elegant-cyan outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-elegant-teal uppercase tracking-wider">E-mail Sankhya</label>
              <div className="relative">
                <input 
                  type="email"
                  placeholder="usuario@sankhya.com.br"
                  value={typedEmail}
                  onChange={(e) => setTypedEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-350 dark:border-elegant-teal/30 text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-transparent text-sm p-3 focus:border-amber-400 dark:focus:border-elegant-cyan focus:ring-1 focus:ring-amber-400 dark:focus:ring-elegant-cyan outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-955/35 border border-red-200 dark:border-red-900/55 rounded-xl p-3 flex gap-2 text-xs text-red-650 dark:text-red-400">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Native Firebase Google Authentication Tool */}
              <button 
                type="button"
                onClick={async () => {
                  const success = await loginWithGoogle();
                  if (success) {
                    triggerToast(`Autenticado com sucesso via Google Central!`, 'success');
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 font-extrabold text-sm text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <Globe size={16} className="text-white" />
                Entrar com Google Auth (Real-time Cloud Sync)
              </button>

              <button 
                type="submit"
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 border border-slate-700 font-bold text-sm text-white rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Entrar com Google Auth (Simulado)
                <ArrowRight size={16} />
              </button>
            </div>
          </form>

          {/* Divider and quick demo logins for reviewers (to prevent being locked out or stuck) */}
          <div className="relative my-6 select-none">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200 dark:border-elegant-teal/10" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-elegant-card px-2.5 text-[9px] font-bold text-slate-400 tracking-wider">Acesso Rápido para Reviewers</span></div>
          </div>

          <div className="space-y-2 select-none">
            <button 
              onClick={() => handleQuickLogin('camila.silvano@sankhya.com.br', 'Camila Silvano')}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">CS</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Camila Silvano (Criadora do Site)</p>
                  <p className="text-[10px] text-slate-400">camila.silvano@sankhya.com.br</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-0.5">
                Admin
                <ArrowRight size={10} className="transform group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <button 
              onClick={() => handleQuickLogin('colaborador@sankhya.com', 'Lucas Developer')}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-slate-200 dark:border-slate-850 rounded-xl text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 text-[10px] font-bold">LD</div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Lucas Developer</p>
                  <p className="text-[10px] text-slate-450">colaborador@sankhya.com</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-0.5">
                Editor
                <ArrowRight size={10} className="transform group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>

        </div>

        {/* BOTTOM DECORATIVE FOOTER */}
        <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 select-none">
          Sankhya Keep • Desenvolvido para colaboração e centralização de base de conhecimentos interna.
        </div>

      </div>
    );
  }

  // CORE APPMANAGER AUTHENTICATED VIEW
  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-elegant-bg text-slate-850 dark:text-elegant-grey transition-colors duration-200 font-sans overflow-hidden">
      
      {/* HEADER TOPBAR */}
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        onOpenImporter={() => setIsImporterOpen(true)}
        totalNotesCount={notes.length}
      />

      {/* INNER AREA CONTAINER (SIDEBAR & NOTES WRAPPER) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR NAVIGATION */}
        <Sidebar 
          topics={topics}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          onCreateTopic={handleCreateTopic}
          onUpdateTopic={handleUpdateTopic}
          onDeleteTopic={handleDeleteTopic}
        />

        {/* RIGHT SIDE SECTION: MAIN EXPLORER + STATUS BAR */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* CORE NOTES EXPLORE SCRAPE BODY */}
          <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-64px-32px)] relative bg-slate-50 dark:radial-dots dark:bg-elegant-bg">
            
            {/* TOAST SYSTEM INDICATOR */}
            {toastMessage && (
              <div className="fixed bottom-14 right-6 z-50 animate-in slide-in-from-bottom-5 duration-150">
                <div className={`rounded-xl px-4 py-3 shadow-xl border flex items-center gap-2 text-xs font-semibold select-none ${
                  toastType === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-350 dark:border-emerald-900/50' 
                    : (toastType === 'error' 
                        ? 'bg-red-50 text-red-800 border-red-250 dark:bg-red-955/30 dark:text-red-400 dark:border-red-900/50' 
                        : 'bg-indigo-50 text-indigo-805 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50')
                }`}>
                  <Check size={14} className={toastType === 'error' ? 'text-red-500' : 'text-emerald-500'} />
                  <span>{toastMessage}</span>
                </div>
              </div>
            )}

            {/* QUICK INITIAL ACTION BLOCK (KEEP TEXT INPUT BOX) */}
            {selectedFilter !== 'trashed' && user.role !== 'viewer' && (
              <div className="max-w-xl mx-auto w-full mb-8">
                <div 
                  onClick={() => {
                    setEditingNote(null);
                    setIsEditorOpen(true);
                  }}
                  className="bg-white hover:bg-slate-52 dark:bg-elegant-card dark:hover:bg-elegant-card/85 border border-slate-200 dark:border-elegant-teal/20 dark:hover:border-elegant-cyan/40 rounded-xl p-3.5 flex items-center justify-between cursor-text shadow-sm hover:shadow-md transition-all select-none"
                >
                  <span className="text-xs sm:text-sm text-slate-400 dark:text-[#45A29E] font-medium">
                    Criar anotação rápida, checklist ou link e salvar...
                  </span>
                  <div className="flex gap-2 text-slate-400">
                    <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Criar lista">
                      <Plus size={16} className="text-amber-500 dark:text-elegant-cyan" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SELECTED FILTER OVERALL STATS HEADER */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-[#1F2833]/80 select-none shrink-0 pr-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base tracking-tight text-slate-850 dark:text-white capitalize">
                  {selectedFilter === 'all' 
                    ? 'Todas as Notas' 
                    : (selectedFilter === 'archived' 
                        ? 'Arquivo de Notas' 
                        : (selectedFilter === 'trashed' 
                            ? 'Lixeira (Histórico pendente)' 
                            : (topics.find(t => `topic-${t.id}` === selectedFilter)?.title || 'Tópico de Notas')))}
                </h2>
                
                {selectedFilter.startsWith('topic-') && (
                  <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/55 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-full select-none uppercase tracking-wider">
                    Filtro Ativo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} no index local
              </p>
            </div>

            {selectedFilter === 'trashed' && filteredNotes.length > 0 && (
              <button 
                onClick={handleEmptyTrash}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/40 dark:text-red-350 text-xs font-bold rounded-lg border border-red-200 dark:border-red-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                Esvaziar Lixeira
              </button>
            )}
          </div>

          {/* NOTES DECORATED GRID OR LIST CONTAINER */}
          {filteredNotes.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 select-none space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-350 dark:text-slate-700 shadow-inner">
                <Search size={32} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Não encontramos notas para esta visualização</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  {searchQuery ? 'Tente ajustar os termos pesquisados na barra de topo ou limpe o filtro.' : 'Crie uma nova nota ou alterne o filtro lateral para começar seu repositório de conhecimento.'}
                </p>
                {isCloudSyncActive && notes.length === 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const originalNotes = PersistenceService.getNotes();
                        const originalTopics = PersistenceService.getTopics();
                        PersistenceService.saveNotesBatch(originalNotes);
                        originalTopics.forEach(t => PersistenceService.saveTopic(t));
                        triggerToast('Banco de dados em nuvem populado com as notas padrão!', 'success');
                      } catch (e) {
                        triggerToast('Erro ao carregar dados iniciais para a nuvem.', 'error');
                      }
                    }}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Carregar Notas Iniciais de Onboarding na Nuvem 🚀
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* SECTION 1: PINNED NOTES GRID */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 select-none">
                    Fixadas ({pinnedNotes.length})
                  </h3>
                  
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5' 
                    : 'flex flex-col gap-3 max-w-2xl mx-auto'
                  }>
                    {pinnedNotes.map(note => (
                      <NoteCard 
                        key={note.id}
                        note={note}
                        topics={topics}
                        onEditClick={(n) => {
                          setEditingNote(n);
                          setIsEditorOpen(true);
                        }}
                        onTogglePin={handleTogglePin}
                        onToggleArchive={handleToggleArchive}
                        onToggleTrash={handleToggleTrash}
                        onFork={handleForkNote}
                        onColorChange={handleNoteColorChange}
                        onTopicChange={handleNoteTopicChange}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: OTHER NOTES GRID */}
              {otherNotes.length > 0 && (
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && (
                    <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 pt-2 select-none border-t border-slate-200 dark:border-slate-800/40">
                      Outras ({otherNotes.length})
                    </h3>
                  )}
                  
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5' 
                    : 'flex flex-col gap-3 max-w-2xl mx-auto'
                  }>
                    {otherNotes.map(note => (
                      <NoteCard 
                        key={note.id}
                        note={note}
                        topics={topics}
                        onEditClick={(n) => {
                          if (selectedFilter === 'trashed') {
                            showConfirm(
                              'Restaurar Nota',
                              'Esta nota está na lixeira. Deseja restaurá-la para editá-la?',
                              () => {
                                handleToggleTrash(n.id, { stopPropagation: () => {} } as any);
                              }
                            );
                            return;
                          }
                          setEditingNote(n);
                          setIsEditorOpen(true);
                        }}
                        onTogglePin={handleTogglePin}
                        onToggleArchive={handleToggleArchive}
                        onToggleTrash={handleToggleTrash}
                        onFork={handleForkNote}
                        onColorChange={handleNoteColorChange}
                        onTopicChange={handleNoteTopicChange}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* FULL DIALOG NOTE COMPOSER/EDITOR MODAL */}
          <NoteEditor 
            note={editingNote}
            topics={topics}
            activeTopicId={selectedFilter.startsWith('topic-') ? selectedFilter.replace('topic-', '') : null}
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            onSave={handleSaveNote}
            onDelete={handleToggleTrash}
          />

          {/* GOOGLE KEEP BULK HTML PARSABLE IMPORT MODAL */}
          <KeepImporter 
            topics={topics}
            isOpen={isImporterOpen}
            onClose={() => setIsImporterOpen(false)}
            onImportComplete={handleImportNotesCompleted}
          />

          {/* CUSTOM CONFIRMATION DIALOG MODAL */}
          {confirmDialog && confirmDialog.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#151D2A] rounded-xl shadow-2xl border border-slate-200 dark:border-elegant-teal/30 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="px-5 py-4 border-b border-slate-150 dark:border-[#1F2833]/50 flex items-center bg-slate-50 dark:bg-[#0B0C10]">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 dark:bg-elegant-cyan block shrink-0" />
                    {confirmDialog.title}
                  </h3>
                </div>
                <div className="p-5 text-xs sm:text-sm text-slate-600 dark:text-[#C5C6C7] leading-relaxed">
                  {confirmDialog.message}
                </div>
                <div className="px-5 py-3.5 border-t border-slate-150 dark:border-[#1F2833]/50 bg-slate-50 dark:bg-[#0B0C10] flex justify-end gap-2.5">
                  <button 
                    onClick={() => setConfirmDialog(null)}
                    className="px-4 py-1.5 border border-slate-300 dark:border-[#1F2833]/30 hover:bg-black/5 dark:hover:bg-[#1F2833]/40 text-slate-700 dark:text-[#C5C6C7] font-semibold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      confirmDialog.onConfirm();
                      setConfirmDialog(null);
                    }}
                    className="px-4.5 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-[#66FCF1] dark:hover:bg-[#66FCF1]/90 text-white dark:text-[#1F2833] font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          {selectedFilter !== 'trashed' && user.role !== 'viewer' && (
            <button 
              onClick={() => {
                setEditingNote(null);
                setIsEditorOpen(true);
              }}
              className="fixed bottom-12 right-8 w-14 h-14 bg-amber-500 hover:bg-amber-600 dark:bg-elegant-cyan dark:hover:bg-[#66FCF1]/90 text-white dark:text-elegant-bg rounded-full flex items-center justify-center shadow-lg dark:shadow-[0_0_15px_rgba(102,252,241,0.3)] hover:scale-110 active:scale-95 transition-all cursor-pointer z-30"
              title="Criar Nova Nota"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          )}

        </main>

        {/* Status Bar */}
        <footer className="h-8 border-t border-slate-200 dark:border-[#1F2833] bg-slate-100/50 dark:bg-[#1F2833]/30 px-6 flex items-center justify-between text-[10px] text-slate-500 dark:text-elegant-teal tracking-tight shrink-0 select-none">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isCloudSyncActive ? 'bg-indigo-500 shadow-md shadow-indigo-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span> 
              {isCloudSyncActive ? 'Sincronização Cloud: Ativada (Firebase)' : 'Sincronizado Local'}
            </span>
            <span>Modo Central: {isCloudSyncActive ? 'Remoto' : 'Local'}</span>
          </div>
          <div className="flex gap-4 font-bold uppercase">
            <span>{notes.length} Notas</span>
            <span className="text-slate-800 dark:text-white">v3.0.0-firebase</span>
          </div>
        </footer>
      </div>
      </div>

    </div>
  );
}
