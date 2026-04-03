import type { Editor } from '@tiptap/react';

export interface ParagraphInfo {
  pid: string;
  text: string;
  type: 'paragraph' | 'heading' | 'blockquote';
  headingLevel?: number;
  pos: number;
}

export function extractParagraphs(editor: Editor): ParagraphInfo[] {
  const paragraphs: ParagraphInfo[] = [];
  const doc = editor.state.doc;

  doc.descendants((node, pos) => {
    if (
      (node.type.name === 'paragraph' ||
        node.type.name === 'heading' ||
        node.type.name === 'blockquote') &&
      node.attrs.pid
    ) {
      const text = node.textContent.trim();
      if (text.length > 0) {
        paragraphs.push({
          pid: node.attrs.pid,
          text,
          type: node.type.name as ParagraphInfo['type'],
          headingLevel: node.type.name === 'heading' ? node.attrs.level : undefined,
          pos,
        });
      }
    }
  });

  return paragraphs;
}

export function computeParagraphHash(text: string): string {
  // Simple hash: length + first 50 chars + last 50 chars
  const first = text.slice(0, 50);
  const last = text.slice(-50);
  return `${text.length}:${first}:${last}`;
}
