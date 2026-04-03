import type { JSONContent } from '@tiptap/react';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';

function nodeToMarkdown(node: JSONContent, depth = 0): string {
  if (!node) return '';

  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `**${text}**`;
        if (mark.type === 'italic') text = `*${text}*`;
      }
    }
    return text;
  }

  const children = (node.content || []).map((c) => nodeToMarkdown(c, depth)).join('');

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return children + '\n\n';
    case 'heading': {
      const level = node.attrs?.level || 1;
      return '#'.repeat(level) + ' ' + children + '\n\n';
    }
    case 'blockquote':
      return (
        children
          .split('\n')
          .filter((l) => l.trim())
          .map((l) => '> ' + l)
          .join('\n') + '\n\n'
      );
    case 'horizontalRule':
      return '---\n\n';
    case 'hardBreak':
      return '\n';
    default:
      return children;
  }
}

function nodeToPlainText(node: JSONContent): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';

  const children = (node.content || []).map(nodeToPlainText).join('');

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
    case 'heading':
    case 'blockquote':
      return children + '\n\n';
    case 'horizontalRule':
      return '---\n\n';
    case 'hardBreak':
      return '\n';
    default:
      return children;
  }
}

function nodeToHtml(node: JSONContent): string {
  if (!node) return '';

  if (node.type === 'text') {
    let text = escapeHtml(node.text || '');
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
      }
    }
    return text;
  }

  const children = (node.content || []).map(nodeToHtml).join('');

  switch (node.type) {
    case 'doc':
      return children;
    case 'paragraph':
      return `<p>${children}</p>\n`;
    case 'heading': {
      const level = node.attrs?.level || 1;
      return `<h${level}>${children}</h${level}>\n`;
    }
    case 'blockquote':
      return `<blockquote>${children}</blockquote>\n`;
    case 'horizontalRule':
      return '<hr />\n';
    case 'hardBreak':
      return '<br />';
    default:
      return children;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportToMarkdown(content: JSONContent): string {
  return nodeToMarkdown(content).trim();
}

export function exportToPlainText(content: JSONContent): string {
  return nodeToPlainText(content).trim();
}

export function exportToHtml(content: JSONContent): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Export</title></head>
<body>
${nodeToHtml(content)}
</body>
</html>`;
}

export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- DOCX Export ---

function textRunsFromNode(node: JSONContent): TextRun[] {
  if (!node) return [];

  if (node.type === 'text') {
    const isBold = node.marks?.some((m) => m.type === 'bold') ?? false;
    const isItalic = node.marks?.some((m) => m.type === 'italic') ?? false;
    const isStrike = node.marks?.some((m) => m.type === 'strike') ?? false;
    const isLink = node.marks?.some((m) => m.type === 'link') ?? false;

    return [
      new TextRun({
        text: node.text || '',
        bold: isBold,
        italics: isItalic,
        strike: isStrike,
        color: isLink ? '2B6CB0' : undefined,
        underline: isLink ? {} : undefined,
        font: 'Charter',
        size: 24, // 12pt
      }),
    ];
  }

  if (node.type === 'hardBreak') {
    return [new TextRun({ break: 1 })];
  }

  return (node.content || []).flatMap(textRunsFromNode);
}

function docxParagraphsFromNode(node: JSONContent): Paragraph[] {
  if (!node) return [];

  switch (node.type) {
    case 'doc':
      return (node.content || []).flatMap(docxParagraphsFromNode);

    case 'heading': {
      const level = node.attrs?.level || 1;
      const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      };
      return [
        new Paragraph({
          heading: headingMap[level] || HeadingLevel.HEADING_1,
          children: textRunsFromNode(node),
          spacing: { before: 240, after: 120 },
        }),
      ];
    }

    case 'paragraph': {
      const runs = textRunsFromNode(node);
      if (runs.length === 0) {
        return [new Paragraph({ children: [new TextRun('')] })];
      }
      return [
        new Paragraph({
          children: runs,
          spacing: { after: 200 },
        }),
      ];
    }

    case 'blockquote': {
      const innerParagraphs = (node.content || []).flatMap(docxParagraphsFromNode);
      return innerParagraphs.map(
        (p) =>
          new Paragraph({
            ...p,
            children: (p as unknown as { options?: { children?: TextRun[] } }).options?.children ||
              textRunsFromNode(node),
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: 'A67A3C', space: 10 },
            },
            spacing: { after: 200 },
          })
      );
    }

    case 'horizontalRule':
      return [
        new Paragraph({
          children: [new TextRun({ text: '' })],
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
          },
          spacing: { before: 200, after: 200 },
        }),
      ];

    default:
      return (node.content || []).flatMap(docxParagraphsFromNode);
  }
}

export async function exportToDocx(content: JSONContent, title: string): Promise<void> {
  const paragraphs = docxParagraphsFromNode(content);

  const doc = new DocxDocument({
    creator: "Writer's Console",
    title,
    styles: {
      default: {
        document: {
          run: {
            font: 'Charter',
            size: 24,
            color: '333333',
          },
          paragraph: {
            spacing: { line: 360 },
          },
        },
        heading1: {
          run: { font: 'Charter', size: 48, bold: true, color: '1A1A1A' },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        heading2: {
          run: { font: 'Charter', size: 36, bold: true, color: '1A1A1A' },
          paragraph: { spacing: { before: 280, after: 160 } },
        },
        heading3: {
          run: { font: 'Charter', size: 28, bold: true, color: '1A1A1A' },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'untitled'}.docx`);
}
