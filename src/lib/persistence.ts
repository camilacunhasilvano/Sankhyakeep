/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Note, Topic, NoteVersion } from '../types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// Initial topics preloaded for Sankhya employees
const DEFAULT_TOPICS: Topic[] = [
  {
    id: 'topic-geral',
    title: 'Geral',
    parentId: null,
    createdBy: 'camila-admin',
    isFavorite: true,
    visibility: 'public'
  },
  {
    id: 'topic-onboarding',
    title: 'Onboarding 🚀',
    parentId: null,
    createdBy: 'camila-admin',
    isFavorite: false,
    visibility: 'public'
  },
  {
    id: 'topic-processos',
    title: 'Processos Internos',
    parentId: null,
    createdBy: 'camila-admin',
    isFavorite: false,
    visibility: 'public'
  },
  {
    id: 'topic-ti',
    title: 'Suporte TI',
    parentId: null,
    createdBy: 'camila-admin',
    isFavorite: false,
    visibility: 'public'
  },
  {
    id: 'topic-infra',
    title: 'Deploy e Infraestrutura',
    parentId: 'topic-ti',
    createdBy: 'camila-admin',
    isFavorite: false,
    visibility: 'public'
  }
];

// Initial notes preloaded for Sankhya employees
const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-welcome',
    title: '💡 Bem-vindo ao Sankhya Keep!',
    contentMarkdown: `## Central Privada de Conhecimento Sankhya

Este é o seu novo espaço de organização de ideias, documentações e anotações corporativas!

### Principais Diferenciais:
1. **Privacidade e Segurança**: Acesso exclusivo para e-mails \`@sankhya.com\` ou \`@sankhya.com.br\`.
2. **Organização por Tópicos**: Utilize a barra lateral inteligente para criar categorias e subcategorias (estilo Notion).
3. **Importador do Google Keep**: Importe suas anotações corporativas antigas diretamente da barra superior usando o arquivo HTML do Keep Takeout.
4. **Histórico de Edições**: Acompanhe o controle de versões de cada nota.
5. **Compartilhamento e Forks**: Notas criadas pela Camila Silvano são públicas por padrão para todos. Caso você edite uma nota pública de outro colaborador, o sistema cria automaticamente uma cópia privada (**fork**) para você editar sem alterar o original!

*Sinta-se à vontade para navegar e criar suas notas corporativas!*`,
    checklist: [],
    attachments: [],
    tags: ['Onboarding', 'Manual', 'Sankhya'],
    color: '#fee2e2', // Soft red/coral
    pinned: true,
    archived: false,
    trashed: false,
    topicId: 'topic-geral',
    isPublic: true,
    createdBy: 'camila-admin',
    createdByEmail: 'camila.silvano@sankhya.com.br',
    version: 1,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'note-shortcuts',
    title: '⚡ Atalhos e Funcionalidades Rápidas',
    contentMarkdown: `Gerencie as tarefas do seu dia a dia com checklists e acompanhamento em lote.`,
    checklist: [
      { id: 'chk-1', text: 'Experimentar o Modo Escuro no cabeçalho 🌓', checked: false },
      { id: 'chk-2', text: 'Criar um novo Tópico na lateral usando o botão "+"', checked: false },
      { id: 'chk-3', text: 'Importar um arquivo HTML do Keep no ícone de Upload 📥', checked: false },
      { id: 'chk-4', text: 'Fazer uma edição em uma nota pública e ver ela se transformar em um fork pessoal 🍴', checked: false }
    ],
    attachments: [],
    tags: ['Atalhos', 'Produtividade'],
    color: '#e0f2fe', // Soft blue
    pinned: true,
    archived: false,
    trashed: false,
    topicId: 'topic-geral',
    isPublic: true,
    createdBy: 'camila-admin',
    createdByEmail: 'camila.silvano@sankhya.com.br',
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'note-deploy',
    title: '🐳 Configuração de Docker e Kubernetes',
    contentMarkdown: `### Guia de Deploy de Projetos no Cloud Run

Abaixo está o arquivo \`Dockerfile\` modelo que utilizamos em nossos microsserviços stateless corporativos:

\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

#### Notas de Integração:
- Variáveis de ambiente configuradas no painel da GCP.
- Monitoramento de logs via Stackdriver ativado.
- CI/CD integrado via GitHub Actions.`,
    checklist: [],
    attachments: [],
    tags: ['TI', 'GCP', 'Deploy'],
    color: '#f0fdf4', // Soft green
    pinned: false,
    archived: false,
    trashed: false,
    topicId: 'topic-infra',
    isPublic: true,
    createdBy: 'camila-admin',
    createdByEmail: 'camila.silvano@sankhya.com.br',
    version: 1,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

// Key Names for localStorage
const STORE_NOTES = 'sankhya_keep_notes';
const STORE_TOPICS = 'sankhya_keep_topics';
const STORE_VERSIONS = 'sankhya_keep_versions';

export class PersistenceService {
  // Initialize localStorage if empty
  static init() {
    if (!localStorage.getItem(STORE_TOPICS)) {
      localStorage.setItem(STORE_TOPICS, JSON.stringify(DEFAULT_TOPICS));
    }
    if (!localStorage.getItem(STORE_NOTES)) {
      localStorage.setItem(STORE_NOTES, JSON.stringify(DEFAULT_NOTES));
    }
    if (!localStorage.getItem(STORE_VERSIONS)) {
      localStorage.setItem(STORE_VERSIONS, JSON.stringify([]));
    }
  }

  // TOPICS ACCESSORS
  static getTopics(): Topic[] {
    this.init();
    try {
      const stored = localStorage.getItem(STORE_TOPICS);
      return stored ? JSON.parse(stored) : DEFAULT_TOPICS;
    } catch {
      return DEFAULT_TOPICS;
    }
  }

  static saveTopic(topic: Topic): Topic[] {
    const list = this.getTopics();
    const index = list.findIndex(t => t.id === topic.id);
    if (index >= 0) {
      list[index] = topic;
    } else {
      list.push(topic);
    }
    localStorage.setItem(STORE_TOPICS, JSON.stringify(list));
    // Trigger custom storage event for sync
    window.dispatchEvent(new Event('storage'));

    // Sync to Firestore in background if signed in
    if (auth.currentUser) {
      setDoc(doc(db, 'topics', topic.id), topic).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `topics/${topic.id}`);
      });
    }

    return list;
  }

  static deleteTopic(id: string): Topic[] {
    let list = this.getTopics();
    const childTopicIds = list.filter(t => t.parentId === id).map(t => t.id);
    list = list.filter(t => t.id !== id && t.parentId !== id);
    localStorage.setItem(STORE_TOPICS, JSON.stringify(list));
    
    // Un-assign notes with this topic
    const notes = this.getNotes();
    const updatedNotes = notes.map(n => {
      if (n.topicId === id || (n.topicId && childTopicIds.includes(n.topicId))) {
        return { ...n, topicId: null };
      }
      return n;
    });
    localStorage.setItem(STORE_NOTES, JSON.stringify(updatedNotes));
    window.dispatchEvent(new Event('storage'));

    // Trigger async sync to Firestore if authenticated
    if (auth.currentUser) {
      // 1. Delete main topic
      deleteDoc(doc(db, 'topics', id)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `topics/${id}`);
      });
      // 2. Delete children topics
      childTopicIds.forEach(ctId => {
        deleteDoc(doc(db, 'topics', ctId)).catch(err => {
          handleFirestoreError(err, OperationType.DELETE, `topics/${ctId}`);
        });
      });
      // 3. Sync notes
      updatedNotes.forEach(n => {
        if (n.topicId === null) {
          setDoc(doc(db, 'notes', n.id), n).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `notes/${n.id}`);
          });
        }
      });
    }

    return list;
  }

  // NOTES ACCESSORS
  static getNoteSignature(note: Partial<Note>): string {
    const title = (note.title || '').trim().toLowerCase();
    const content = (note.contentMarkdown || '').trim().toLowerCase();
    const checklistText = (note.checklist || [])
      .map(item => item.text.trim().toLowerCase())
      .join('::');
    return `${title}|||${content}|||${checklistText}`;
  }

  static deduplicateNotes(): Note[] {
    this.init();
    try {
      const stored = localStorage.getItem(STORE_NOTES);
      if (!stored) return DEFAULT_NOTES;
      const list: Note[] = JSON.parse(stored);
      
      const seen = new Map<string, Note>();
      let changed = false;

      for (const note of list) {
        const signature = this.getNoteSignature(note);
        if (seen.has(signature)) {
          const existing = seen.get(signature)!;
          
          // Decide which one is better/newer
          const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const noteTime = new Date(note.updatedAt || note.createdAt || 0).getTime();
          
          let replace = false;
          if (existing.trashed && !note.trashed) {
            replace = true;
          } else if (!existing.trashed && note.trashed) {
            replace = false;
          } else if (!existing.pinned && note.pinned) {
            replace = true;
          } else if (existing.pinned && !note.pinned) {
            replace = false;
          } else if (noteTime > existingTime) {
            replace = true;
          }

          if (replace) {
            seen.set(signature, note);
          }
          changed = true;
        } else {
          seen.set(signature, note);
        }
      }

      const dedupedList = Array.from(seen.values());
      if (changed) {
        localStorage.setItem(STORE_NOTES, JSON.stringify(dedupedList));
        window.dispatchEvent(new Event('storage'));
      }
      return dedupedList;
    } catch {
      return DEFAULT_NOTES;
    }
  }

  static getNotes(): Note[] {
    return this.deduplicateNotes();
  }

  static saveNote(note: Note): Note[] {
    const list = this.getNotes();
    const index = list.findIndex(n => n.id === note.id);
    const now = new Date().toISOString();
    
    const updatedNote = {
      ...note,
      updatedAt: now
    };

    if (index >= 0) {
      // Create a historic copy if content changed for version control
      const prevNote = list[index];
      const isContentChanged = 
        prevNote.contentMarkdown !== note.contentMarkdown || 
        JSON.stringify(prevNote.checklist) !== JSON.stringify(note.checklist) ||
        prevNote.title !== note.title;

      if (isContentChanged) {
        updatedNote.version = (prevNote.version || 1) + 1;
        const newVersion: NoteVersion = {
          noteId: note.id,
          version: prevNote.version || 1,
          contentMarkdown: prevNote.contentMarkdown,
          checklist: prevNote.checklist,
          changedBy: updatedNote.createdByEmail,
          changedAt: prevNote.updatedAt || now
        };
        this.saveVersion(newVersion);

        // Upload revision block to Subcollection in Firestore if signed in
        if (auth.currentUser) {
          const versionId = `v-${newVersion.version}`;
          setDoc(doc(db, 'notes', note.id, 'versions', versionId), newVersion).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, `notes/${note.id}/versions/${versionId}`);
          });
        }
      }
      list[index] = updatedNote;
    } else {
      list.push(updatedNote);
    }
    
    localStorage.setItem(STORE_NOTES, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));

    // Upload note to Firestore in background
    if (auth.currentUser) {
      setDoc(doc(db, 'notes', note.id), updatedNote).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `notes/${note.id}`);
      });
    }

    return list;
  }

  static saveNotesBatch(newNotes: Note[]): Note[] {
    const list = this.getNotes();
    const existingSignatures = new Set(list.map(n => this.getNoteSignature(n)));
    const addedNotes: Note[] = [];
    
    newNotes.forEach(note => {
      const sig = this.getNoteSignature(note);
      if (!existingSignatures.has(sig)) {
        list.push(note);
        addedNotes.push(note);
        existingSignatures.add(sig);
      }
    });

    localStorage.setItem(STORE_NOTES, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));

    // Upload Keep Takeout batch to Firestore if active
    if (auth.currentUser && addedNotes.length > 0) {
      const batchLimit = 500;
      let batch = writeBatch(db);
      let count = 0;

      addedNotes.forEach(note => {
        batch.set(doc(db, 'notes', note.id), note);
        count++;
        if (count === batchLimit) {
          batch.commit().catch(err => {
            handleFirestoreError(err, OperationType.WRITE, 'notes-batch');
          });
          batch = writeBatch(db);
          count = 0;
        }
      });

      if (count > 0) {
        batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, 'notes-batch');
        });
      }
    }

    return list;
  }

  static deleteNote(id: string): Note[] {
    const list = this.getNotes();
    const updated = list.filter(n => n.id !== id);
    localStorage.setItem(STORE_NOTES, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    // Sync deletion to Firestore in background
    if (auth.currentUser) {
      deleteDoc(doc(db, 'notes', id)).catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `notes/${id}`);
      });
    }

    return updated;
  }

  // VERSIONS
  static getVersions(noteId: string): NoteVersion[] {
    try {
      const stored = localStorage.getItem(STORE_VERSIONS);
      const list: NoteVersion[] = stored ? JSON.parse(stored) : [];
      return list.filter(v => v.noteId === noteId).sort((a, b) => b.version - a.version);
    } catch {
      return [];
    }
  }

  private static saveVersion(version: NoteVersion) {
    try {
      const stored = localStorage.getItem(STORE_VERSIONS);
      const list: NoteVersion[] = stored ? JSON.parse(stored) : [];
      list.push(version);
      localStorage.setItem(STORE_VERSIONS, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save revision history version', e);
    }
  }
}
