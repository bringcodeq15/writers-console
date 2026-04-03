import { useRef, useCallback, useState } from 'react';
import type { JSONContent } from '@tiptap/react';

export type SaveState = 'saved' | 'saving' | 'unsaved';

export function useAutoSave(saveDocument: (content: JSONContent) => Promise<void>) {
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (content: JSONContent) => {
      setSaveState('unsaved');

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        setSaveState('saving');
        try {
          await saveDocument(content);
          setSaveState('saved');
        } catch {
          setSaveState('unsaved');
        }
      }, 3000);
    },
    [saveDocument]
  );

  const forceSave = useCallback(
    async (content: JSONContent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setSaveState('saving');
      try {
        await saveDocument(content);
        setSaveState('saved');
      } catch {
        setSaveState('unsaved');
      }
    },
    [saveDocument]
  );

  return { saveState, triggerSave, forceSave };
}
