import Dexie, { type Table } from 'dexie';
import type { JSONContent } from '@tiptap/react';

export interface Document {
  id: string;
  title: string;
  content: JSONContent;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchItem {
  id: string;
  documentId: string;
  type: 'link' | 'text' | 'excerpt' | 'file' | 'search-result';
  title: string;
  content: string;
  sourceUrl?: string;
  tags: string[];
  createdAt: Date;
  notes?: string;
  sortOrder: number;
}

export interface OutlineItem {
  id: string;
  documentId: string;
  text: string;
  level: 1 | 2 | 3;
  sortOrder: number;
}

export interface ScaffoldEntry {
  id: string;
  documentId: string;
  paragraphId: string;
  summary: string;
  paragraphHash: string;
  status: 'current' | 'loading' | 'error';
  updatedAt: Date;
}

export interface ResearchSuggestion {
  id: string;
  documentId: string;
  paragraphId: string;
  researchItemId: string;
  reasoning: string;
  updatedAt: Date;
}

export interface PdfAnnotation {
  id: string;
  researchItemId: string;
  pageNumber: number;
  type: 'highlight' | 'note';
  rects?: { x: number; y: number; width: number; height: number }[];
  selectedText?: string;
  noteContent?: string;
  color?: string;
  createdAt: Date;
}

export interface Settings {
  key: string;
  value: string;
}

class WritersConsoleDB extends Dexie {
  documents!: Table<Document>;
  researchItems!: Table<ResearchItem>;
  outlineItems!: Table<OutlineItem>;
  scaffoldEntries!: Table<ScaffoldEntry>;
  researchSuggestions!: Table<ResearchSuggestion>;
  settings!: Table<Settings>;

  constructor() {
    super('WritersConsole');
    this.version(1).stores({
      documents: 'id, title, updatedAt',
      researchItems: 'id, documentId, type, createdAt',
      outlineItems: 'id, documentId, sortOrder',
      scaffoldEntries: 'id, documentId, paragraphId',
      researchSuggestions: 'id, documentId, paragraphId, researchItemId',
      settings: 'key',
    });
  }
}

export const db = new WritersConsoleDB();
