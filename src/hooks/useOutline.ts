import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { db, type OutlineItem } from '../db';

export function useOutline(documentId: string | undefined) {
  const [items, setItems] = useState<OutlineItem[]>([]);

  const loadItems = useCallback(async () => {
    if (!documentId) return;
    const results = await db.outlineItems
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
    async (text: string, level: 1 | 2 | 3 = 1) => {
      if (!documentId) return;
      const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.sortOrder)) : 0;
      const item: OutlineItem = {
        id: nanoid(),
        documentId,
        text,
        level,
        sortOrder: maxOrder + 1,
      };
      await db.outlineItems.add(item);
      await loadItems();
      return item;
    },
    [documentId, items, loadItems]
  );

  const updateItem = useCallback(
    async (id: string, changes: Partial<OutlineItem>) => {
      await db.outlineItems.update(id, changes);
      await loadItems();
    },
    [loadItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await db.outlineItems.delete(id);
      await loadItems();
    },
    [loadItems]
  );

  const reorderItems = useCallback(
    async (reorderedItems: OutlineItem[]) => {
      const updates = reorderedItems.map((item, index) => ({
        key: item.id,
        changes: { sortOrder: index },
      }));
      await Promise.all(
        updates.map((u) => db.outlineItems.update(u.key, u.changes))
      );
      setItems(reorderedItems.map((item, index) => ({ ...item, sortOrder: index })));
    },
    []
  );

  const indentItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item && item.level < 3) {
        await db.outlineItems.update(id, { level: (item.level + 1) as 1 | 2 | 3 });
        await loadItems();
      }
    },
    [items, loadItems]
  );

  const outdentItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item && item.level > 1) {
        await db.outlineItems.update(id, { level: (item.level - 1) as 1 | 2 | 3 });
        await loadItems();
      }
    },
    [items, loadItems]
  );

  return { items, addItem, updateItem, deleteItem, reorderItems, indentItem, outdentItem };
}
