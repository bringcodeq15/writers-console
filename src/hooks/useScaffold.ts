import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { Editor } from '@tiptap/react';
import { db, type ScaffoldEntry } from '../db';
import { summarizeParagraph } from '../ai/scaffold';
import { extractParagraphs, computeParagraphHash, type ParagraphInfo } from '../editor/utils/paragraphTracker';

export function useScaffold(
  editor: Editor | null,
  documentId: string | undefined,
  apiKey: string
) {
  const [entries, setEntries] = useState<ScaffoldEntry[]>([]);
  const [apiCallCount, setApiCallCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEntries = useCallback(async () => {
    if (!documentId) return;
    const results = await db.scaffoldEntries
      .where('documentId')
      .equals(documentId)
      .toArray();
    setEntries(results);
  }, [documentId]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const updateScaffold = useCallback(async () => {
    if (!editor || !documentId || !apiKey) return;

    const paragraphs = extractParagraphs(editor);
    const existingEntries = await db.scaffoldEntries
      .where('documentId')
      .equals(documentId)
      .toArray();
    const entryMap = new Map(existingEntries.map((e) => [e.paragraphId, e]));

    // Remove orphaned entries
    const currentPids = new Set(paragraphs.map((p) => p.pid));
    for (const entry of existingEntries) {
      if (!currentPids.has(entry.paragraphId)) {
        await db.scaffoldEntries.delete(entry.id);
      }
    }

    // Process each paragraph
    for (const para of paragraphs) {
      const hash = computeParagraphHash(para.text);
      const existing = entryMap.get(para.pid);

      // Skip if unchanged
      if (existing && existing.paragraphHash === hash && existing.status === 'current') {
        continue;
      }

      // For headings, use the text directly
      if (para.type === 'heading') {
        const summary = `H${para.headingLevel}: ${para.text}`;
        const entry: ScaffoldEntry = {
          id: existing?.id || nanoid(),
          documentId,
          paragraphId: para.pid,
          summary,
          paragraphHash: hash,
          status: 'current',
          updatedAt: new Date(),
        };
        await db.scaffoldEntries.put(entry);
        continue;
      }

      // Skip very short paragraphs
      if (para.text.length < 20) continue;

      // Set loading state
      const entryId = existing?.id || nanoid();
      await db.scaffoldEntries.put({
        id: entryId,
        documentId,
        paragraphId: para.pid,
        summary: existing?.summary || '',
        paragraphHash: hash,
        status: 'loading',
        updatedAt: new Date(),
      });
      await loadEntries();

      // Call API
      try {
        const summary = await summarizeParagraph(apiKey, para.text);
        setApiCallCount((c) => c + 1);
        await db.scaffoldEntries.put({
          id: entryId,
          documentId,
          paragraphId: para.pid,
          summary,
          paragraphHash: hash,
          status: 'current',
          updatedAt: new Date(),
        });
      } catch {
        await db.scaffoldEntries.update(entryId, { status: 'error' });
      }
    }

    await loadEntries();
  }, [editor, documentId, apiKey, loadEntries]);

  const triggerUpdate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(updateScaffold, 2000);
  }, [updateScaffold]);

  const getOrderedEntries = useCallback(
    (paragraphs: ParagraphInfo[]): (ScaffoldEntry & { paragraphIndex: number })[] => {
      const entryMap = new Map(entries.map((e) => [e.paragraphId, e]));
      return paragraphs
        .map((p, i) => {
          const entry = entryMap.get(p.pid);
          if (entry) {
            return { ...entry, paragraphIndex: i + 1 };
          }
          return null;
        })
        .filter(Boolean) as (ScaffoldEntry & { paragraphIndex: number })[];
    },
    [entries]
  );

  const retryEntry = useCallback(
    async (paragraphId: string) => {
      if (!editor || !apiKey) return;
      const paragraphs = extractParagraphs(editor);
      const para = paragraphs.find((p) => p.pid === paragraphId);
      if (!para) return;

      const entry = entries.find((e) => e.paragraphId === paragraphId);
      if (!entry) return;

      await db.scaffoldEntries.update(entry.id, { status: 'loading' });
      await loadEntries();

      try {
        const summary = await summarizeParagraph(apiKey, para.text);
        setApiCallCount((c) => c + 1);
        await db.scaffoldEntries.update(entry.id, {
          summary,
          status: 'current',
          paragraphHash: computeParagraphHash(para.text),
          updatedAt: new Date(),
        });
      } catch {
        await db.scaffoldEntries.update(entry.id, { status: 'error' });
      }
      await loadEntries();
    },
    [editor, apiKey, entries, loadEntries]
  );

  return {
    entries,
    apiCallCount,
    triggerUpdate,
    getOrderedEntries,
    retryEntry,
    loadEntries,
  };
}
