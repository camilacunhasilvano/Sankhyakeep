/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NoteColor {
  id: string;
  name: string;
  lightBg: string;
  darkBg: string;
  lightBorder: string;
  darkBorder: string;
  previewClass: string;
}

export const NOTE_COLORS: NoteColor[] = [
  {
    id: 'default',
    name: 'Padrão',
    lightBg: 'bg-white',
    darkBg: 'dark:bg-elegant-card',
    lightBorder: 'border-slate-200',
    darkBorder: 'dark:border-[#1F2833]/80 dark:hover:border-elegant-cyan/50',
    previewClass: 'bg-slate-100 border border-slate-300 dark:bg-elegant-card dark:border-elegant-teal/30'
  },
  {
    id: 'coral',
    name: 'Coral',
    lightBg: 'bg-rose-50',
    darkBg: 'dark:bg-rose-950/20',
    lightBorder: 'border-rose-250',
    darkBorder: 'dark:border-rose-900/30 dark:hover:border-rose-500/50',
    previewClass: 'bg-rose-200 dark:bg-rose-950/60'
  },
  {
    id: 'orange',
    name: 'Pêssego',
    lightBg: 'bg-orange-50',
    darkBg: 'dark:bg-orange-950/20',
    lightBorder: 'border-orange-250',
    darkBorder: 'dark:border-orange-900/30 dark:hover:border-orange-500/50',
    previewClass: 'bg-orange-200 dark:bg-orange-950/60'
  },
  {
    id: 'yellow',
    name: 'Amarelo',
    lightBg: 'bg-yellow-50',
    darkBg: 'dark:bg-yellow-950/20',
    lightBorder: 'border-yellow-250',
    darkBorder: 'dark:border-yellow-900/30 dark:hover:border-yellow-500/50',
    previewClass: 'bg-yellow-200 dark:bg-yellow-950/60'
  },
  {
    id: 'green',
    name: 'Menta',
    lightBg: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-950/20',
    lightBorder: 'border-emerald-250',
    darkBorder: 'dark:border-emerald-900/30 dark:hover:border-emerald-500/50',
    previewClass: 'bg-emerald-200 dark:bg-emerald-950/60'
  },
  {
    id: 'teal',
    name: 'Teal',
    lightBg: 'bg-teal-50',
    darkBg: 'dark:bg-teal-950/20',
    lightBorder: 'border-teal-250',
    darkBorder: 'dark:border-[#45A29E]/30 dark:hover:border-elegant-cyan/50',
    previewClass: 'bg-teal-200 dark:bg-teal-950/60'
  },
  {
    id: 'blue',
    name: 'Azul',
    lightBg: 'bg-sky-50',
    darkBg: 'dark:bg-sky-950/20',
    lightBorder: 'border-sky-250',
    darkBorder: 'dark:border-sky-900/30 dark:hover:border-sky-500/50',
    previewClass: 'bg-sky-200 dark:bg-sky-900/60'
  },
  {
    id: 'purple',
    name: 'Roxo',
    lightBg: 'bg-purple-50',
    darkBg: 'dark:bg-purple-950/20',
    lightBorder: 'border-purple-250',
    darkBorder: 'dark:border-purple-900/30 dark:hover:border-purple-500/50',
    previewClass: 'bg-purple-200 dark:bg-purple-950/60'
  },
  {
    id: 'pink',
    name: 'Rosa',
    lightBg: 'bg-pink-50',
    darkBg: 'dark:bg-pink-950/20',
    lightBorder: 'border-pink-250',
    darkBorder: 'dark:border-pink-900/30 dark:hover:border-pink-500/50',
    previewClass: 'bg-pink-200 dark:bg-pink-950/60'
  }
];

export const getBgClass = (colorId: string | null | undefined): string => {
  const found = NOTE_COLORS.find(c => c.id === colorId);
  if (found) {
    return `${found.lightBg} ${found.darkBg}`;
  }
  return 'bg-white dark:bg-slate-900';
};

export const getBorderClass = (colorId: string | null | undefined): string => {
  const found = NOTE_COLORS.find(c => c.id === colorId);
  if (found) {
    return `${found.lightBorder} ${found.darkBorder}`;
  }
  return 'border-slate-200 dark:border-slate-800';
};
