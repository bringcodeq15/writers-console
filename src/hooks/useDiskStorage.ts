import { useState, useCallback, useRef } from 'react';
import type { JSONContent } from '@tiptap/react';
import { exportToMarkdown } from '../editor/utils/exportDocument';

// File System Access API types (not in all TS libs)
declare global {
  interface Window {
    showDirectoryPicker(options?: {
      mode?: 'read' | 'readwrite';
      startIn?: string;
    }): Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle & { kind: string; name: string }>;
  }
}

interface DiskStorageState {
  directoryHandle: FileSystemDirectoryHandle | null;
  enabled: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}

export function useDiskStorage() {
  const [state, setState] = useState<DiskStorageState>({
    directoryHandle: null,
    enabled: false,
    lastSavedAt: null,
    error: null,
  });
  const handleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const pickDirectory = useCallback(async () => {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });
      handleRef.current = handle;
      setState((s) => ({ ...s, directoryHandle: handle, enabled: true, error: null }));
      return handle;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setState((s) => ({ ...s, error: 'Failed to access directory' }));
      }
      return null;
    }
  }, []);

  const saveToFile = useCallback(
    async (title: string, content: JSONContent) => {
      const handle = handleRef.current;
      if (!handle) return;

      try {
        const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'untitled';
        const filename = `${slug}.md`;
        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        const markdown = exportToMarkdown(content);
        await writable.write(markdown);
        await writable.close();
        setState((s) => ({ ...s, lastSavedAt: new Date(), error: null }));
      } catch (e) {
        setState((s) => ({ ...s, error: `Save failed: ${(e as Error).message}` }));
      }
    },
    []
  );

  const saveJsonToFile = useCallback(
    async (title: string, content: JSONContent) => {
      const handle = handleRef.current;
      if (!handle) return;

      try {
        const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'untitled';
        const filename = `${slug}.wc.json`;
        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify({ title, content, savedAt: new Date().toISOString() }, null, 2));
        await writable.close();
        setState((s) => ({ ...s, lastSavedAt: new Date(), error: null }));
      } catch (e) {
        setState((s) => ({ ...s, error: `Save failed: ${(e as Error).message}` }));
      }
    },
    []
  );

  const listFiles = useCallback(async (): Promise<{ name: string; handle: FileSystemFileHandle }[]> => {
    const handle = handleRef.current;
    if (!handle) return [];

    const files: { name: string; handle: FileSystemFileHandle }[] = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && (entry.name.endsWith('.wc.json') || entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
        files.push({ name: entry.name, handle: entry as unknown as FileSystemFileHandle });
      }
    }
    return files.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const loadFile = useCallback(async (fileHandle: FileSystemFileHandle): Promise<{ title: string; content: JSONContent } | null> => {
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();

      if (fileHandle.name.endsWith('.wc.json')) {
        const data = JSON.parse(text);
        return { title: data.title || fileHandle.name, content: data.content };
      }

      // For .md and .txt files, convert to basic TipTap structure
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
      const content: JSONContent = {
        type: 'doc',
        content: paragraphs.map((p) => {
          const trimmed = p.trim();
          if (trimmed.startsWith('# ')) {
            return { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: trimmed.slice(2) }] };
          }
          if (trimmed.startsWith('## ')) {
            return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: trimmed.slice(3) }] };
          }
          if (trimmed.startsWith('### ')) {
            return { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: trimmed.slice(4) }] };
          }
          if (trimmed.startsWith('> ')) {
            return { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: trimmed.slice(2) }] }] };
          }
          return { type: 'paragraph', content: [{ type: 'text', text: trimmed }] };
        }),
      };

      const title = fileHandle.name.replace(/\.(wc\.json|md|txt)$/, '').replace(/-/g, ' ');
      return { title, content };
    } catch {
      return null;
    }
  }, []);

  const disconnect = useCallback(() => {
    handleRef.current = null;
    setState({ directoryHandle: null, enabled: false, lastSavedAt: null, error: null });
  }, []);

  return {
    ...state,
    pickDirectory,
    saveToFile,
    saveJsonToFile,
    listFiles,
    loadFile,
    disconnect,
  };
}
