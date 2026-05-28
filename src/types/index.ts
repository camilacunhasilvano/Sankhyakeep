/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Note {
  id: string;
  title: string;
  contentMarkdown: string;
  checklist: ChecklistItem[];
  attachments: Attachment[];
  tags: string[];
  color: string;
  pinned: boolean;
  archived: boolean;
  trashed: boolean;
  topicId: string | null;
  isPublic: boolean;
  createdBy: string;
  createdByEmail: string;
  forkedFromId?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  title: string;
  parentId: string | null;
  createdBy: string;
  isFavorite: boolean;
  visibility: 'public' | 'internal';
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface NoteVersion {
  noteId: string;
  version: number;
  contentMarkdown: string;
  checklist: ChecklistItem[];
  changedBy: string;
  changedAt: string;
}
