import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { db, type ResearchItem } from '../db';

export function useResearchItems(documentId: string | undefined) {
  const [items, setItems] = useState<ResearchItem[]>([]);

  const loadItems = useCallback(async () => {
    if (!documentId) return;
    const results = await db.researchItems
      .where('documentId')
      .equals(documentId)
      .toArray();
    results.sort((a, b) => a.sortOrder - b.sortOrder);
    setItems(results);
  }, [documentId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const addItem = useCallback(
    async (data: {
      type: ResearchItem['type'];
      title: string;
      content: string;
      sourceUrl?: string;
      tags?: string[];
    }) => {
      if (!documentId) return;
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sortOrder)) : 0;
      const item: ResearchItem = {
        id: nanoid(),
        documentId,
        type: data.type,
        title: data.title,
        content: data.content,
        sourceUrl: data.sourceUrl,
        tags: data.tags || [],
        createdAt: new Date(),
        sortOrder: maxOrder + 1,
      };
      await db.researchItems.add(item);
      await loadItems();
      return item;
    },
    [documentId, items, loadItems]
  );

  const updateItem = useCallback(
    async (id: string, changes: Partial<ResearchItem>) => {
      await db.researchItems.update(id, changes);
      await loadItems();
    },
    [loadItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await db.researchItems.delete(id);
      await loadItems();
    },
    [loadItems]
  );

  const reorderItems = useCallback(
    async (reorderedItems: ResearchItem[]) => {
      const updates = reorderedItems.map((item, index) => ({
        key: item.id,
        changes: { sortOrder: index },
      }));
      await Promise.all(
        updates.map((u) => db.researchItems.update(u.key, u.changes))
      );
      setItems(reorderedItems.map((item, index) => ({ ...item, sortOrder: index })));
    },
    []
  );

  return { items, addItem, updateItem, deleteItem, reorderItems, loadItems };
}
