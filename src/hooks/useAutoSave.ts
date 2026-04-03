import { useRef, useCallback, useState, useEffect } from 'react';
import type { JSONContent } from '@tiptap/react';

export type SaveState = 'saved' | 'saving' | 'unsaved';

export function useAutoSave(saveDocument: (content: JSONContent) => Promise<void>) {
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<JSONContent | null>(null);
  const saveDocRef = useRef(saveDocument);
  saveDocRef.current = saveDocument;

  // Flush any pending save immediately
  const flushPendingSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const content = pendingContentRef.current;
    if (content) {
      pendingContentRef.current = null;
      try {
        await saveDocRef.current(content);
      } catch {
        // Best effort on quit
      }
    }
  }, []);

  const triggerSave = useCallback(
    (content: JSONContent) => {
      setSaveState('unsaved');
      pendingContentRef.current = content;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null;
        pendingContentRef.current = null;
        setSaveState('saving');
        try {
          await saveDocRef.current(content);
          setSaveState('saved');
        } catch {
          setSaveState('unsaved');
        }
      }, 3000);
    },
    []
  );

  const forceSave = useCallback(
    async (content: JSONContent) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      pendingContentRef.current = null;
      setSaveState('saving');
      try {
        await saveDocRef.current(content);
        setSaveState('saved');
      } catch {
        setSaveState('unsaved');
      }
    },
    []
  );

  // CRITICAL FIX #1: Save on window close / app quit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingContentRef.current) {
        // Synchronous last-chance save — navigator.sendBeacon doesn't work for IndexedDB,
        // so we block the unload briefly to flush
        e.preventDefault();
        flushPendingSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup: flush on unmount too
      flushPendingSave();
    };
  }, [flushPendingSave]);

  return { saveState, triggerSave, forceSave, flushPendingSave };
}
