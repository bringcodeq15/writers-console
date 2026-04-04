import type { JSONContent } from '@tiptap/react';
import type { ResearchItem, OutlineItem, ScaffoldEntry, ResearchSuggestion, PdfAnnotation } from '../db';

// Full document state saved to .wc.json
export interface WCDocument {
  id: string;
  title: string;
  content: JSONContent;
  research: ResearchItem[];
  outline: OutlineItem[];
  scaffold: ScaffoldEntry[];
  suggestions: ResearchSuggestion[];
  pdfAnnotations?: PdfAnnotation[];
  wordCountTarget?: number;    // per-document target (default 3000)
  createdAt: string; // ISO
  updatedAt: string; // ISO
  version: number;   // schema version for future migrations
}

// File listing entry
export interface FileEntry {
  name: string;
  path: string;
  modified: number;
}

// Type for the Electron API exposed via preload
interface ElectronFS {
  getDocumentsDir: () => Promise<string>;
  getAppDir: () => Promise<string>;
  listFiles: (dir?: string) => Promise<FileEntry[]>;
  readFile: (path: string) => Promise<{ ok: boolean; content?: string; error?: string }>;
  writeFile: (path: string, content: string) => Promise<{ ok: boolean; error?: string }>;
  deleteFile: (path: string) => Promise<{ ok: boolean; error?: string }>;
  fileExists: (path: string) => Promise<boolean>;
  readFileBinary: (path: string) => Promise<{ ok: boolean; data?: string; error?: string }>;
  writeFileBinary: (path: string, base64: string) => Promise<{ ok: boolean; error?: string }>;
  mkdir: (path: string) => Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: {
      fs: ElectronFS;
      isElectron: boolean;
      platform: string;
      onMenuAction: (cb: (action: string) => void) => void;
      onUpdaterStatus: (cb: (status: string, detail?: string) => void) => void;
    };
  }
}

export const isElectron = !!window.electronAPI?.isElectron;

const SCHEMA_VERSION = 1;

function slugify(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'untitled';
}

function createEmptyDoc(id: string, title = 'Untitled'): WCDocument {
  return {
    id,
    title,
    content: { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
    research: [],
    outline: [],
    scaffold: [],
    suggestions: [],
    pdfAnnotations: [],
    wordCountTarget: 3000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: SCHEMA_VERSION,
  };
}

// --- Electron disk-first storage ---

export async function getDocumentsDir(): Promise<string> {
  if (!isElectron) throw new Error('Not in Electron');
  return window.electronAPI!.fs.getDocumentsDir();
}

export async function getAppDir(): Promise<string> {
  if (!isElectron) throw new Error('Not in Electron');
  return window.electronAPI!.fs.getAppDir();
}

export async function listDocuments(): Promise<FileEntry[]> {
  if (!isElectron) return [];
  return window.electronAPI!.fs.listFiles();
}

export async function loadDocument(filePath: string): Promise<WCDocument | null> {
  if (!isElectron) return null;
  const result = await window.electronAPI!.fs.readFile(filePath);
  if (!result.ok || !result.content) return null;
  try {
    const data = JSON.parse(result.content);
    // Ensure all fields exist (backward compat)
    return {
      id: data.id || filePath,
      title: data.title || 'Untitled',
      content: data.content || { type: 'doc', content: [{ type: 'paragraph', content: [] }] },
      research: data.research || [],
      outline: data.outline || [],
      scaffold: data.scaffold || [],
      suggestions: data.suggestions || [],
      pdfAnnotations: data.pdfAnnotations || [],
      wordCountTarget: data.wordCountTarget || 3000,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || data.savedAt || new Date().toISOString(),
      version: data.version || 1,
    };
  } catch {
    return null;
  }
}

export async function saveDocument(doc: WCDocument): Promise<{ ok: boolean; path: string; error?: string }> {
  if (!isElectron) return { ok: false, path: '', error: 'Not in Electron' };

  const dir = await getDocumentsDir();
  const slug = `${slugify(doc.title)}-${doc.id.slice(0, 8)}`;
  const docDir = `${dir}/${slug}`;

  // Create per-document subfolder
  await window.electronAPI!.fs.mkdir(docDir);

  // Save .wc.json (source of truth)
  const filePath = `${docDir}/${slug}.wc.json`;
  const json = JSON.stringify(
    { ...doc, updatedAt: new Date().toISOString(), version: SCHEMA_VERSION },
    null,
    2
  );
  const result = await window.electronAPI!.fs.writeFile(filePath, json);
  if (!result.ok) return { ok: false, path: filePath, error: result.error };

  // Auto-export .md alongside (best-effort, don't fail the save)
  try {
    const { exportToMarkdown } = await import('../editor/utils/exportDocument');
    const md = exportToMarkdown(doc.content);
    await window.electronAPI!.fs.writeFile(`${docDir}/${slug}.md`, md);
  } catch { /* ignore */ }

  // Auto-export .docx alongside (best-effort)
  try {
    const { exportToDocxBase64 } = await import('../editor/utils/exportDocument');
    const base64 = await exportToDocxBase64(doc.content, doc.title);
    await window.electronAPI!.fs.writeFileBinary(`${docDir}/${slug}.docx`, base64);
  } catch { /* ignore */ }

  return { ok: true, path: filePath };
}

export async function deleteDocumentFile(filePath: string): Promise<boolean> {
  if (!isElectron) return false;
  const result = await window.electronAPI!.fs.deleteFile(filePath);
  return result.ok;
}

export function createNewDocument(id: string, title?: string): WCDocument {
  return createEmptyDoc(id, title);
}

// Add a research item to a document that isn't currently loaded
export async function addResearchItemToDocument(
  filePath: string,
  item: { type: string; title: string; content: string; sourceUrl?: string }
): Promise<boolean> {
  const doc = await loadDocument(filePath);
  if (!doc) return false;

  const { nanoid } = await import('nanoid');
  const maxOrder = doc.research.length > 0 ? Math.max(...doc.research.map((r) => r.sortOrder)) : 0;

  doc.research.push({
    id: nanoid(),
    documentId: doc.id,
    type: item.type as 'text',
    title: item.title,
    content: item.content,
    sourceUrl: item.sourceUrl,
    tags: [],
    createdAt: new Date(),
    sortOrder: maxOrder + 1,
  });

  const result = await saveDocument(doc);
  return result.ok;
}
