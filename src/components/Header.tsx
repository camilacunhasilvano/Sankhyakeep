/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  X, 
  Grid, 
  List, 
  Sun, 
  Moon, 
  Upload, 
  LogOut, 
  FileText, 
  User as UserIcon,
  ChevronsUpDown,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: 'grid' | 'list';
  onToggleViewMode: () => void;
  onOpenImporter: () => void;
  totalNotesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  onOpenImporter,
  totalNotesCount
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Quick profile menu toggle
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-16 border-b border-slate-250 dark:border-[#1F2833] px-4 flex items-center justify-between bg-white dark:bg-[#0B0C10]/85 dark:backdrop-blur-md select-none transition-colors duration-200 shrink-0 sticky top-0 z-40">
      
      {/* BRANDING LOGO */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 dark:bg-gradient-to-br dark:from-elegant-teal dark:to-elegant-cyan flex items-center justify-center shadow-md shadow-amber-500/20 transform hover:scale-105 transition-transform shrink-0">
          <BookOpen className="text-white dark:text-[#0B0C10] fill-amber-100 dark:fill-transparent" size={18} />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base font-sans">
              Sankhya
            </span>
            <span className="bg-amber-100 dark:bg-[#1F2833]/80 text-amber-900 dark:text-elegant-cyan text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-transparent dark:border-elegant-cyan/25">
              Keep
            </span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-elegant-teal font-semibold uppercase tracking-wider block">
            Central de Conhecimento
          </p>
        </div>
      </div>

      {/* SEARCH BAR (KEEP STYLE) */}
      <div className="flex-1 max-w-2xl mx-4 sm:mx-8">
        <div className="relative flex items-center bg-slate-100 dark:bg-[#1F2833] border border-transparent hover:bg-slate-150/70 dark:hover:bg-[#1F2833]/80 focus-within:bg-white dark:focus-within:bg-[#1F2833] focus-within:border-amber-300 dark:focus-within:border-elegant-cyan focus-within:shadow-md dark:focus-within:shadow-[0_0_15px_rgba(102,252,241,0.1)] rounded-xl py-1.5 px-3 transition-all duration-200">
          <Search size={18} className="text-slate-500 dark:text-[#45A29E] mr-2 shrink-0" />
          <input 
            type="text"
            placeholder="Pesquisar por notas, tópicos, tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm border-none outline-none text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-elegant-teal/60 font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => onSearchChange('')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-[#1F2833]/40 rounded-full transition-colors leading-none"
              title="Limpar pesquisa"
            >
              <X size={14} className="text-slate-500 dark:text-elegant-teal" />
            </button>
          )}
        </div>
      </div>

      {/* ACTION CONTROLS */}
      <div className="flex items-center gap-2">
        
        {/* Sync / Total notes mini counter badge */}
        <span className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-[#1F2833] hover:bg-slate-150 dark:hover:bg-[#1F2833]/80 rounded-lg text-xs font-semibold text-slate-655 dark:text-elegant-grey select-none border border-slate-200 dark:border-elegant-teal/20">
          <FileText size={12} className="text-amber-500 dark:text-elegant-cyan" />
          <span>{totalNotesCount} {totalNotesCount === 1 ? 'nota' : 'notas'}</span>
        </span>

        {/* Upload Keep HTML takeout */}
        <button 
          onClick={onOpenImporter}
          className="p-2 text-slate-500 dark:text-[#45A29E] hover:text-amber-500 dark:hover:text-elegant-cyan hover:bg-slate-100 dark:hover:bg-[#1F2833] rounded-xl transition-colors cursor-pointer"
          title="Importar do Google Keep HTML (Takeout)"
        >
          <Upload size={18} />
        </button>

        {/* View mode block or grid */}
        <button 
          onClick={onToggleViewMode}
          className="p-2 text-slate-500 dark:text-[#45A29E] hover:text-amber-500 dark:hover:text-elegant-cyan hover:bg-slate-100 dark:hover:bg-[#1F2833] rounded-xl transition-colors cursor-pointer"
          title={viewMode === 'grid' ? 'Exibir em Lista' : 'Exibir em Grade'}
        >
          {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
        </button>

        {/* Light Dark Moon */}
        <button 
          onClick={toggleTheme}
          className="p-2 text-slate-500 dark:text-[#45A29E] hover:text-amber-500 dark:hover:text-elegant-cyan hover:bg-slate-100 dark:hover:bg-[#1F2833] rounded-xl transition-colors cursor-pointer"
          title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Quick User Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-[#1F2833]/55 p-1.5 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-elegant-teal/25 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 dark:bg-gradient-to-br dark:from-elegant-teal dark:to-elegant-cyan flex items-center justify-center text-white dark:text-[#0B0C10] font-bold select-none text-xs shrink-0 uppercase">
              {user ? user.name.slice(0, 2) : 'SK'}
            </div>
            <ChevronsUpDown size={14} className="text-slate-400 dark:text-elegant-teal" />
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#1F2833] border border-slate-200 dark:border-elegant-teal/30 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-[#0B0C10]">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white capitalize">{user?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-elegant-grey truncate">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-[9px] bg-amber-100 text-amber-800 dark:bg-elegant-bg dark:text-elegant-cyan font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-transparent dark:border-elegant-teal/20">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="p-1">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenImporter();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-elegant-grey hover:bg-amber-50 dark:hover:bg-elegant-bg/50 rounded-lg flex items-center gap-2 transition-colors font-medium cursor-pointer"
                  >
                    <Upload size={14} className="text-amber-500 dark:text-elegant-cyan" />
                    Importar Google Keep
                  </button>

                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-955/20 rounded-lg flex items-center gap-2 transition-colors font-semibold cursor-pointer"
                  >
                    <LogOut size={14} />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

    </header>
  );
};
