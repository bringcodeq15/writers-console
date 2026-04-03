import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { Editor } from '@tiptap/react';
import { db, type ResearchSuggestion, type ResearchItem } from '../db';
import { pairResearchItems } from '../ai/pairing';
import { extractParagraphs } from '../editor/utils/paragraphTracker';

export function usePairing(
  editor: Editor | null,
  documentId: string | undefined,
  apiKey: string
) {
  const [suggestions, setSuggestions] = useState<ResearchSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSuggestions = useCallback(async () => {
    if (!documentId) return;
    const results = await db.researchSuggestions
      .where('documentId')
      .equals(documentId)
      .toArray();
    setSuggestions(results);
  }, [documentId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const updatePairings = useCallback(async () => {
    if (!editor || !documentId || !apiKey) return;

    const paragraphs = extractParagraphs(editor);
    const researchItems: ResearchItem[] = await db.researchItems
      .where('documentId')
      .equals(documentId)
      .toArray();

    if (researchItems.length === 0) return;

    const itemPreviews = researchItems.map((item) => ({
      id: item.id,
      title: item.title,
      preview: item.content.slice(0, 150),
    }));

    // Clear old suggestions
    await db.researchSuggestions.where('documentId').equals(documentId).delete();

    for (const para of paragraphs) {
      if (para.type === 'heading' || para.text.length < 30) continue;

      try {
        const pairs = await pairResearchItems(apiKey, para.text, itemPreviews);
        for (const pair of pairs) {
          // Validate that the item ID exists
          if (researchItems.some((i) => i.id === pair.itemId)) {
            await db.researchSuggestions.add({
              id: nanoid(),
              documentId,
              paragraphId: para.pid,
              researchItemId: pair.itemId,
              reasoning: pair.reason,
              updatedAt: new Date(),
            });
          }
        }
      } catch {
        // Skip failed pairings
      }
    }

    await loadSuggestions();
  }, [editor, documentId, apiKey, loadSuggestions]);

  const triggerUpdate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(updatePairings, 4000);
  }, [updatePairings]);

  // FIX #6: Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const getSuggestionsForParagraph = useCallback(
    (paragraphId: string) => {
      return suggestions.filter((s) => s.paragraphId === paragraphId);
    },
    [suggestions]
  );

  return {
    suggestions,
    triggerUpdate,
    getSuggestionsForParagraph,
    loadSuggestions,
  };
}
