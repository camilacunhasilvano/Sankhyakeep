/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Lightbulb, 
  Archive, 
  Trash2, 
  Folder, 
  Folders, 
  Plus, 
  Star, 
  Settings, 
  ChevronRight, 
  MoreVertical, 
  Edit2, 
  Trash, 
  Check, 
  X,
  PlusSquare,
  Shield,
  User as UserIcon,
  HelpCircle,
  Database
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { Topic } from '../types';
import { useTheme } from '../lib/ThemeContext';

interface SidebarProps {
  topics: Topic[];
  selectedFilter: string; // 'all' | 'archived' | 'trashed' | 'topic-<id>'
  onSelectFilter: (filter: string) => void;
  onCreateTopic: (title: string, parentId: string | null) => void;
  onUpdateTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  topics,
  selectedFilter,
  onSelectFilter,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic
}) => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  
  // Topic creation state
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [topicParentId, setTopicParentId] = useState<string | null>(null);

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Settings Cog Modal/Overlay state
  const [showSettings, setShowSettings] = useState(false);

  // Subtopic adding state
  const [addingSubtopicToId, setAddingSubtopicToId] = useState<string | null>(null);
  const [subtopicName, setSubtopicName] = useState('');

  const handleCreateTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicName.trim()) {
      onCreateTopic(newTopicName.trim(), topicParentId);
      setNewTopicName('');
      setIsCreatingTopic(false);
      setTopicParentId(null);
    }
  };

  const handleCreateSubtopicSubmit = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (subtopicName.trim()) {
      onCreateTopic(subtopicName.trim(), parentId);
      setSubtopicName('');
      setAddingSubtopicToId(null);
    }
  };

  const startEditingTopic = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTopicId(topic.id);
    setEditingName(topic.title);
  };

  const saveTopicRename = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onUpdateTopic({
        ...topic,
        title: editingName.trim()
      });
      setEditingTopicId(null);
    }
  };

  const toggleFavoriteTopic = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateTopic({
      ...topic,
      isFavorite: !topic.isFavorite
    });
  };

  // Group topics into Main topics (no parent) and subtopics
  const mainTopics = topics.filter(t => !t.parentId);
  const subTopics = (parentId: string) => topics.filter(t => t.parentId === parentId);

  return (
    <aside className="w-64 bg-slate-50 dark:bg-[#0B0C10] border-r border-slate-200 dark:border-[#1F2833] flex flex-col h-[calc(100vh-64px)] overflow-y-auto select-none shrink-0 transition-colors duration-200">
      
      {/* Primary Navigation Filters */}
      <div className="p-3 space-y-1">
        <button 
          onClick={() => onSelectFilter('all')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            selectedFilter === 'all' 
              ? 'bg-amber-100 dark:bg-[#1F2833] text-amber-900 dark:text-elegant-cyan border-l-4 border-amber-500 dark:border-elegant-cyan font-bold' 
              : 'text-slate-700 dark:text-[#C5C6C7] hover:bg-slate-100 dark:hover:bg-[#1F2833]/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <Lightbulb size={18} className={selectedFilter === 'all' ? 'text-amber-500 dark:text-elegant-cyan' : 'text-slate-500 dark:text-elegant-teal'} />
            <span>Notas</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectFilter('archived')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            selectedFilter === 'archived' 
              ? 'bg-amber-100 dark:bg-[#1F2833] text-amber-900 dark:text-elegant-cyan border-l-4 border-amber-500 dark:border-elegant-cyan font-bold' 
              : 'text-slate-700 dark:text-[#C5C6C7] hover:bg-slate-100 dark:hover:bg-[#1F2833]/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <Archive size={18} className={selectedFilter === 'archived' ? 'text-amber-500 dark:text-elegant-cyan' : 'text-slate-500 dark:text-elegant-teal'} />
            <span>Arquivo</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectFilter('trashed')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            selectedFilter === 'trashed' 
              ? 'bg-amber-100 dark:bg-[#1F2833] text-amber-900 dark:text-elegant-cyan border-l-4 border-amber-500 dark:border-elegant-cyan font-bold' 
              : 'text-slate-700 dark:text-[#C5C6C7] hover:bg-slate-100 dark:hover:bg-[#1F2833]/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <Trash2 size={18} className={selectedFilter === 'trashed' ? 'text-amber-500' : 'text-slate-500 dark:text-elegant-teal'} />
            <span>Lixeira</span>
          </div>
        </button>
      </div>

      <hr className="border-slate-200 dark:border-[#1F2833] mx-3 my-2" />

      {/* TOPICS SECTION */}
      <div className="flex-1 px-3">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 dark:text-elegant-teal uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Folders size={14} />
            Tópicos
          </span>
          <button 
            onClick={() => {
              setIsCreatingTopic(!isCreatingTopic);
              setTopicParentId(null);
            }}
            className="hover:bg-slate-200 dark:hover:bg-[#1F2833] p-1 rounded transition-colors text-slate-600 dark:text-[#C5C6C7]"
            title="Criar novo tópico principal"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Inline Creation Field */}
        {isCreatingTopic && (
          <form onSubmit={handleCreateTopicSubmit} className="px-2 py-1.5 bg-white dark:bg-[#1F2833] border border-amber-200 dark:border-elegant-teal/30 rounded-lg mb-2 shadow-sm">
            <input 
              type="text"
              placeholder="Nome do Tópico..."
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              className="w-full text-sm bg-transparent outline-none border-none p-1 text-slate-800 dark:text-white font-medium placeholder-slate-400 dark:placeholder-elegant-teal/50"
              autoFocus
            />
            <div className="flex justify-end gap-1 mt-1.5">
              <button 
                type="button" 
                onClick={() => setIsCreatingTopic(false)}
                className="p-1 text-xs text-slate-500 dark:text-elegant-grey hover:bg-slate-100 dark:hover:bg-[#0B0C10] rounded"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={!newTopicName.trim()}
                className="bg-amber-500 hover:bg-amber-600 dark:bg-elegant-cyan dark:text-elegant-bg dark:shadow-[0_0_8px_rgba(102,252,241,0.25)] disabled:opacity-50 text-white rounded px-2.5 py-0.5 text-xs font-medium cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </form>
        )}

        {/* Topics List */}
        <div className="space-y-1 mt-1 max-h-[350px] overflow-y-auto pr-1">
          {mainTopics.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-slate-500 italic p-3 text-center">
              Nenhum tópico criado.
            </div>
          ) : (
            mainTopics.map(topic => {
              const isSelected = selectedFilter === `topic-${topic.id}`;
              const children = subTopics(topic.id);
              
              return (
                <div key={topic.id} className="space-y-1">
                  
                  {/* Parent Topic Row */}
                  <div 
                    onClick={() => onSelectFilter(`topic-${topic.id}`)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-100 dark:bg-[#1F2833] text-amber-900 dark:text-elegant-cyan font-semibold border-l-4 border-amber-500 dark:border-elegant-cyan' 
                        : 'text-slate-700 dark:text-[#C5C6C7] hover:bg-slate-100 dark:hover:bg-[#1F2833]/40 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-6">
                      <Folder size={16} className={topic.isFavorite ? 'text-amber-500 fill-amber-500 dark:text-elegant-cyan dark:fill-elegant-cyan' : 'text-slate-500 dark:text-elegant-teal'} />
                      
                      {editingTopicId === topic.id ? (
                        <input 
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white dark:bg-[#0B0C10] border border-slate-300 dark:border-elegant-teal/25 text-xs px-1 py-0.5 rounded outline-none w-full text-slate-800 dark:text-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTopicRename(topic, e as any);
                            if (e.key === 'Escape') setEditingTopicId(null);
                          }}
                        />
                      ) : (
                        <span className="truncate text-xs">{topic.title}</span>
                      )}
                    </div>

                    {/* Actions panel (visible on hover) */}
                    <div className="absolute right-1 top-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 dark:bg-[#0B0C10]/95 px-1 rounded shadow-sm">
                      
                      {/* Rename and Toggle Inline Buttons */}
                      {editingTopicId === topic.id ? (
                        <button 
                          onClick={(e) => saveTopicRename(topic, e)}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-green-600 dark:text-emerald-400"
                        >
                          <Check size={12} />
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddingSubtopicToId(topic.id);
                            }}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-slate-500 dark:text-[#C5C6C7]"
                            title="Adicionar Subcategoria"
                          >
                            <PlusSquare size={13} />
                          </button>
                          
                          <button 
                            onClick={(e) => toggleFavoriteTopic(topic, e)}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-slate-500 dark:text-[#C5C6C7]"
                            title="Favoritar"
                          >
                            <Star size={13} className={topic.isFavorite ? 'fill-amber-400 text-amber-500 dark:fill-elegant-cyan dark:text-elegant-cyan' : ''} />
                          </button>

                          <button 
                            onClick={(e) => startEditingTopic(topic, e)}
                            className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-slate-500 dark:text-[#C5C6C7]"
                            title="Renomear"
                          >
                            <Edit2 size={12} />
                          </button>

                          {user?.role !== 'viewer' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteTopic(topic.id);
                              }}
                              className="p-0.5 hover:bg-red-100 dark:hover:bg-red-950/50 rounded text-red-500"
                              title="Excluir"
                            >
                              <Trash size={12} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                                   {/* Subtopic Inline Form */}
                  {addingSubtopicToId === topic.id && (
                    <form 
                      onSubmit={(e) => handleCreateSubtopicSubmit(e, topic.id)}
                      className="ml-6 mr-2 p-1 bg-white dark:bg-[#1F2833] border border-slate-200 dark:border-elegant-teal/30 rounded"
                    >
                      <input 
                        type="text"
                        placeholder="Subcategoria..."
                        value={subtopicName}
                        onChange={(e) => setSubtopicName(e.target.value)}
                        className="w-full text-xs bg-transparent outline-none border-none p-0.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-elegant-teal/50"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1 mt-1 text-[10px]">
                        <button 
                          type="button" 
                          onClick={() => setAddingSubtopicToId(null)}
                          className="px-1 hover:bg-slate-100 dark:hover:bg-[#0B0C10] rounded text-slate-505 dark:text-elegant-grey"
                        >
                          X
                        </button>
                        <button 
                          type="submit" 
                          disabled={!subtopicName.trim()}
                          className="px-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-elegant-cyan dark:text-elegant-bg dark:shadow-[0_0_8px_rgba(102,252,241,0.25)] rounded font-semibold disabled:opacity-50 cursor-pointer"
                        >
                          Criar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Children / Subcategories */}
                  {children.map(subtopic => {
                    const isSubSelected = selectedFilter === `topic-${subtopic.id}`;
                    return (
                      <div 
                        key={subtopic.id}
                        onClick={() => onSelectFilter(`topic-${subtopic.id}`)}
                        className={`group relative flex items-center justify-between ml-6 mr-1 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
                          isSubSelected 
                            ? 'bg-amber-100/70 dark:bg-[#1F2833] text-amber-900 dark:text-elegant-cyan border-l-2 border-amber-400 dark:border-elegant-cyan font-semibold' 
                            : 'text-slate-600 dark:text-[#C5C6C7] hover:bg-slate-100 dark:hover:bg-[#1F2833]/45'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-6">
                          <ChevronRight size={12} className="text-slate-400 dark:text-[#45A29E]" />
                          {editingTopicId === subtopic.id ? (
                            <input 
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white dark:bg-[#0B0C10] border border-slate-300 dark:border-elegant-teal/25 text-[11px] p-0.5 rounded outline-none w-full text-slate-800 dark:text-white"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTopicRename(subtopic, e as any);
                                if (e.key === 'Escape') setEditingTopicId(null);
                              }}
                            />
                          ) : (
                            <span className="truncate">{subtopic.title}</span>
                          )}
                        </div>

                        {/* Subtopic actions */}
                        <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 bg-slate-50 dark:bg-[#0B0C10]/95 px-1 rounded">
                          {editingTopicId === subtopic.id ? (
                            <button 
                              onClick={(e) => saveTopicRename(subtopic, e)}
                              className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-green-600 dark:text-emerald-400"
                            >
                              <Check size={10} />
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => toggleFavoriteTopic(subtopic, e)}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-slate-500 dark:text-[#C5C6C7]"
                              >
                                <Star size={10} className={subtopic.isFavorite ? 'fill-amber-400 text-amber-500 dark:fill-elegant-cyan dark:text-elegant-cyan' : ''} />
                              </button>
                              
                              <button 
                                onClick={(e) => startEditingTopic(subtopic, e)}
                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded text-slate-500 dark:text-[#C5C6C7]"
                              >
                                <Edit2 size={10} />
                              </button>

                              {user?.role !== 'viewer' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTopic(subtopic.id);
                                  }}
                                  className="p-0.5 hover:bg-red-100 dark:hover:bg-red-950/40 rounded text-red-500"
                                >
                                  <Trash size={10} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FOOTER SECTION: USER INFO, CONNECTION & SETTINGS DECORATION */}
      <div className="mt-auto p-3 border-t border-slate-250 dark:border-[#1F2833] bg-slate-100/50 dark:bg-[#0B0C10]/35">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-500 dark:bg-gradient-to-br dark:from-elegant-teal dark:to-elegant-cyan flex items-center justify-center text-white dark:text-[#0B0C10] font-bold select-none text-sm shrink-0 border border-slate-300 dark:border-transparent shadow-sm uppercase">
              {user ? user.name.slice(0, 2) : 'SK'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate capitalize">
                {user ? user.name : 'Sankhya Colaborador'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-[#C5C6C7] truncate flex items-center gap-1">
                <Shield size={10} className="text-amber-500 dark:text-elegant-cyan shrink-0" />
                <span className="uppercase font-semibold tracking-wider text-[9px] text-amber-600 dark:text-elegant-cyan">
                  {user ? user.role : 'Leitor'}
                </span>
              </p>
            </div>
          </div>

          {/* Settings cog which is functional */}
          <button 
            onClick={() => setShowSettings(true)}
            id="sidebar-settings-cog"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-elegant-teal dark:hover:text-elegant-cyan hover:bg-slate-200 dark:hover:bg-[#1F2833] rounded-lg transition-colors cursor-pointer"
            title="Configurações e Sobre"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Database indicator */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-[#45A29E] px-1 pt-2 border-t border-slate-200 dark:border-[#1F2833]">
          <span className="flex items-center gap-1 font-medium">
            <Database size={10} className="text-slate-400 dark:text-elegant-teal" />
            Sankhya Local Storage
          </span>
          <span className="bg-emerald-150 text-emerald-700 dark:bg-elegant-bg dark:text-elegant-cyan font-bold px-1.5 py-0.5 rounded uppercase tracking-wide text-[9px] border border-transparent dark:border-elegant-cyan/20">
            Stateless Sync Ready
          </span>
        </div>
      </div>

      {/* Cog Dialog overlay */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-elegant-card rounded-xl shadow-2xl border border-slate-200 dark:border-elegant-teal/30 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#0B0C10] flex items-center justify-between bg-slate-55 dark:bg-[#0B0C10]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings size={16} className="text-amber-500 dark:text-elegant-cyan" />
                Painel de Controle Sankhya Keep
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2 bg-slate-50 dark:bg-elegant-bg p-3.5 rounded-lg border border-slate-200 dark:border-elegant-teal/20">
                <h4 className="text-xs font-bold text-amber-600 dark:text-elegant-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <UserIcon size={12} />
                  Informações de Login
                </h4>
                <div className="text-xs space-y-1 text-slate-650 dark:text-[#C5C6C7]">
                  <p><strong className="dark:text-white">Nome:</strong> {user?.name}</p>
                  <p><strong className="dark:text-white">E-mail:</strong> {user?.email}</p>
                  <p><strong className="dark:text-white">Nível / Role:</strong> {user?.role.toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-elegant-teal uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={12} />
                  Sobre a plataforma
                </h4>
                <p className="text-xs text-slate-600 dark:text-[#C5C6C7] leading-relaxed">
                  <strong>Sankhya Keep v2.4.0</strong> é uma central corporativa interna de notas de alto desempenho.
                  Sua arquitetura é stateless e possui persistência em LocalStorage integrado para resiliência local e offline-first instantâneo.
                </p>
                <p className="text-xs text-slate-500 dark:text-elegant-grey leading-relaxed">
                  Desenvolvido com <strong>React 19 + Tailwind v4</strong> para as equipes internas da Sankhya de engenharia, negócios e processos.
                </p>
              </div>

              <div className="bg-amber-100/30 dark:bg-[#0B0C10]/60 rounded p-2.5 text-[11px] text-amber-800 dark:text-elegant-grey leading-relaxed border border-amber-200/50 dark:border-elegant-teal/20">
                ⚠️ <strong>Regra de Segurança Ativa:</strong> Usuários com o email de criadora do site (<em>camila.silvano@sankhya.com[.br]</em>) criam notas públicas visíveis a todos. Edições externas de notas públicas geram forks automáticos.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 dark:border-[#0B0C10] bg-slate-55 dark:bg-[#0B0C10] flex justify-between items-center">
              <button 
                onClick={() => {
                  logout();
                  setShowSettings(false);
                }}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg transition-colors border border-red-200 dark:border-red-900/55 cursor-pointer"
              >
                Desconectar Conta
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 dark:bg-elegant-cyan dark:text-elegant-bg dark:shadow-[0_0_10px_rgba(102,252,241,0.2)] font-bold text-xs rounded-lg shadow transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
};
