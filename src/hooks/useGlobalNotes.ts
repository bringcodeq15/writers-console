import { useState, useEffect, useCallback, useRef } from 'react';
import { isElectron, getDocumentsDir } from '../storage/fileStorage';

export function useGlobalNotes() {
  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isElectron) {
      // Browser fallback: use localStorage
      const saved = localStorage.getItem('wc-global-notes');
      if (saved) setContent(saved);
      setLoaded(true);
      return;
    }
    (async () => {
      const dir = await getDocumentsDir();
      const filePath = `${dir}/general-notes.md`;
      const result = await window.electronAPI!.fs.readFile(filePath);
      if (result.ok && result.content) {
        setContent(result.content);
      }
      setLoaded(true);
    })();
  }, []);

  const saveToStore = useCallback(async (text: string) => {
    if (isElectron) {
      const dir = await getDocumentsDir();
      const filePath = `${dir}/general-notes.md`;
      await window.electronAPI!.fs.writeFile(filePath, text);
    } else {
      localStorage.setItem('wc-global-notes', text);
    }
  }, []);

  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveToStore(newContent);
      }, 1000);
    },
    [saveToStore]
  );

  const removeLine = useCallback(
    (lineIndex: number) => {
      setContent((prev) => {
        const lines = prev.split('\n');
        lines.splice(lineIndex, 1);
        const newContent = lines.join('\n');
        // Trigger save
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveToStore(newContent);
        }, 500);
        return newContent;
      });
    },
    [saveToStore]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { content, loaded, updateContent, removeLine };
}
