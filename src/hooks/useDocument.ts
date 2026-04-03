import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import type { JSONContent } from '@tiptap/react';
import { db, type Document } from '../db';

export function useDocument() {
  const [currentDoc, setCurrentDoc] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    const docs = await db.documents.orderBy('updatedAt').reverse().toArray();
    setDocuments(docs);
    return docs;
  }, []);

  useEffect(() => {
    (async () => {
      const docs = await loadDocuments();
      if (docs.length > 0) {
        setCurrentDoc(docs[0]);
      } else {
        // Create a default document
        const newDoc: Document = {
          id: nanoid(),
          title: 'Untitled',
          content: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await db.documents.add(newDoc);
        setCurrentDoc(newDoc);
        setDocuments([newDoc]);
      }
      setLoading(false);
    })();
  }, [loadDocuments]);

  const saveDocument = useCallback(
    async (content: JSONContent) => {
      if (!currentDoc) return;
      const now = new Date();
      await db.documents.update(currentDoc.id, { content, updatedAt: now });
      setCurrentDoc((prev) => (prev ? { ...prev, content, updatedAt: now } : null));
    },
    [currentDoc]
  );

  const updateTitle = useCallback(
    async (title: string) => {
      if (!currentDoc) return;
      await db.documents.update(currentDoc.id, { title });
      setCurrentDoc((prev) => (prev ? { ...prev, title } : null));
      setDocuments((prev) =>
        prev.map((d) => (d.id === currentDoc.id ? { ...d, title } : d))
      );
    },
    [currentDoc]
  );

  const createDocument = useCallback(async () => {
    const newDoc: Document = {
      id: nanoid(),
      title: 'Untitled',
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.documents.add(newDoc);
    setCurrentDoc(newDoc);
    await loadDocuments();
    return newDoc;
  }, [loadDocuments]);

  const switchDocument = useCallback(
    async (id: string) => {
      const doc = await db.documents.get(id);
      if (doc) {
        setCurrentDoc(doc);
      }
    },
    []
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await db.documents.delete(id);
      await db.researchItems.where('documentId').equals(id).delete();
      await db.outlineItems.where('documentId').equals(id).delete();
      await db.scaffoldEntries.where('documentId').equals(id).delete();
      await db.researchSuggestions.where('documentId').equals(id).delete();

      const docs = await loadDocuments();
      if (currentDoc?.id === id) {
        if (docs.length > 0) {
          setCurrentDoc(docs[0]);
        } else {
          const newDoc = await createDocument();
          setCurrentDoc(newDoc);
        }
      }
    },
    [currentDoc, loadDocuments, createDocument]
  );

  return {
    currentDoc,
    documents,
    loading,
    saveDocument,
    updateTitle,
    createDocument,
    switchDocument,
    deleteDocument,
    loadDocuments,
  };
}
