import { useState, useEffect, useCallback, useRef } from 'react';
import { nanoid } from 'nanoid';
import type { JSONContent } from '@tiptap/react';
import { db } from '../db';
import {
  isElectron,
  listDocuments,
  loadDocument,
  saveDocument as saveToDisk,
  deleteDocumentFile,
  createNewDocument,
  type WCDocument,
} from '../storage/fileStorage';

export function useDocument() {
  const [currentDoc, setCurrentDoc] = useState<WCDocument | null>(null);
  const [documents, setDocuments] = useState<(WCDocument & { filePath?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // CRITICAL FIX #4: Use ref to always access the latest currentDoc in save callbacks
  const currentDocRef = useRef<WCDocument | null>(null);
  currentDocRef.current = currentDoc;

  const filePathMapRef = useRef<Map<string, string>>(new Map());

  const loadDocuments = useCallback(async () => {
    if (isElectron) {
      const files = await listDocuments();
      const docs: (WCDocument & { filePath?: string })[] = [];
      for (const file of files) {
        const doc = await loadDocument(file.path);
        if (doc) {
          filePathMapRef.current.set(doc.id, file.path);
          docs.push({ ...doc, filePath: file.path });
        }
      }
      docs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setDocuments(docs);
      return docs;
    } else {
      const dbDocs = await db.documents.orderBy('updatedAt').reverse().toArray();
      const docs = dbDocs.map((d) => ({
        id: d.id,
        title: d.title,
        content: d.content,
        research: [] as WCDocument['research'],
        outline: [] as WCDocument['outline'],
        scaffold: [] as WCDocument['scaffold'],
        suggestions: [] as WCDocument['suggestions'],
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        version: 1,
      }));
      setDocuments(docs);
      return docs;
    }
  }, []);

  // Initial load + migration
  useEffect(() => {
    (async () => {
      if (isElectron) {
        const files = await listDocuments();
        if (files.length === 0) {
          const dbDocs = await db.documents.toArray();
          if (dbDocs.length > 0) {
            for (const d of dbDocs) {
              const research = await db.researchItems.where('documentId').equals(d.id).toArray();
              const outline = await db.outlineItems.where('documentId').equals(d.id).toArray();
              const scaffold = await db.scaffoldEntries.where('documentId').equals(d.id).toArray();
              const suggestions = await db.researchSuggestions.where('documentId').equals(d.id).toArray();
              const wcDoc: WCDocument = {
                id: d.id, title: d.title, content: d.content,
                research, outline, scaffold, suggestions,
                createdAt: d.createdAt.toISOString(),
                updatedAt: d.updatedAt.toISOString(),
                version: 1,
              };
              await saveToDisk(wcDoc);
            }
          }
        }
      }

      const docs = await loadDocuments();
      if (docs.length > 0) {
        setCurrentDoc(docs[0]);
      } else {
        const id = nanoid();
        const newDoc = createNewDocument(id);
        if (isElectron) {
          const result = await saveToDisk(newDoc);
          if (result.ok) filePathMapRef.current.set(id, result.path);
        } else {
          await db.documents.add({
            id, title: 'Untitled', content: newDoc.content,
            createdAt: new Date(), updatedAt: new Date(),
          });
        }
        setCurrentDoc(newDoc);
        setDocuments([newDoc]);
      }
      setLoading(false);
    })();
  }, [loadDocuments]);

  // CRITICAL FIX #4: saveDocumentContent uses ref, not stale closure
  const saveDocumentContent = useCallback(
    async (content: JSONContent) => {
      const doc = currentDocRef.current;
      if (!doc) return;
      const now = new Date().toISOString();
      const updated = { ...doc, content, updatedAt: now };

      if (isElectron) {
        const result = await saveToDisk(updated);
        if (!result.ok) {
          console.error('Save failed:', result.error);
          return; // FIX #16: Don't update state if save failed
        }
      } else {
        await db.documents.update(doc.id, { content, updatedAt: new Date() });
      }

      setCurrentDoc(updated);
    },
    [] // No deps — uses ref
  );

  // CRITICAL FIX #4: saveFullState uses ref
  const saveFullState = useCallback(
    async (partial: Partial<WCDocument>) => {
      const doc = currentDocRef.current;
      if (!doc) return;
      const now = new Date().toISOString();
      const updated = { ...doc, ...partial, updatedAt: now };

      if (isElectron) {
        const result = await saveToDisk(updated);
        if (!result.ok) {
          console.error('Full state save failed:', result.error);
          return;
        }
      }

      setCurrentDoc(updated);
    },
    [] // No deps — uses ref
  );

  const updateTitle = useCallback(
    async (title: string) => {
      const doc = currentDocRef.current;
      if (!doc) return;

      if (isElectron) {
        const oldPath = filePathMapRef.current.get(doc.id);
        const updated = { ...doc, title, updatedAt: new Date().toISOString() };
        const result = await saveToDisk(updated);
        if (result.ok) {
          filePathMapRef.current.set(doc.id, result.path);
          // FIX #5: Only delete old file after new file is confirmed written
          if (oldPath && oldPath !== result.path) {
            await deleteDocumentFile(oldPath);
          }
          setCurrentDoc(updated);
        }
        // If save failed, don't update state or delete old file
      } else {
        await db.documents.update(doc.id, { title });
        setCurrentDoc((prev) => (prev ? { ...prev, title } : null));
      }

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, title } : d))
      );
    },
    []
  );

  const createDocument = useCallback(async () => {
    const id = nanoid();
    const newDoc = createNewDocument(id);

    if (isElectron) {
      const result = await saveToDisk(newDoc);
      if (result.ok) {
        filePathMapRef.current.set(id, result.path);
      } else {
        console.error('Failed to create document:', result.error);
        return null;
      }
    } else {
      await db.documents.add({
        id, title: 'Untitled', content: newDoc.content,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    setCurrentDoc(newDoc);
    await loadDocuments();
    return newDoc;
  }, [loadDocuments]);

  // CRITICAL FIX #3: Save current document before switching
  const switchDocument = useCallback(
    async (id: string) => {
      // Flush current doc to disk before switching
      const current = currentDocRef.current;
      if (current && isElectron) {
        await saveToDisk(current);
      } else if (current) {
        await db.documents.update(current.id, { content: current.content, updatedAt: new Date() });
      }

      if (isElectron) {
        const filePath = filePathMapRef.current.get(id);
        if (filePath) {
          const doc = await loadDocument(filePath);
          if (doc) {
            setCurrentDoc(doc);
            return;
          }
        }
        const doc = documents.find((d) => d.id === id);
        if (doc) setCurrentDoc(doc);
      } else {
        const doc = await db.documents.get(id);
        if (doc) {
          setCurrentDoc({
            id: doc.id, title: doc.title, content: doc.content,
            research: [], outline: [], scaffold: [], suggestions: [],
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
            version: 1,
          });
        }
      }
    },
    [documents]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      if (isElectron) {
        const filePath = filePathMapRef.current.get(id);
        if (filePath) {
          await deleteDocumentFile(filePath);
          filePathMapRef.current.delete(id);
        }
      } else {
        await db.documents.delete(id);
        await db.researchItems.where('documentId').equals(id).delete();
        await db.outlineItems.where('documentId').equals(id).delete();
        await db.scaffoldEntries.where('documentId').equals(id).delete();
        await db.researchSuggestions.where('documentId').equals(id).delete();
      }

      const docs = await loadDocuments();
      if (currentDocRef.current?.id === id) {
        if (docs.length > 0) {
          setCurrentDoc(docs[0]);
        } else {
          await createDocument();
        }
      }
    },
    [loadDocuments, createDocument]
  );

  return {
    currentDoc,
    documents,
    loading,
    saveDocument: saveDocumentContent,
    saveFullState,
    updateTitle,
    createDocument,
    switchDocument,
    deleteDocument,
    loadDocuments,
  };
}
