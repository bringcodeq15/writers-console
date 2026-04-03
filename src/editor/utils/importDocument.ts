import mammoth from 'mammoth';
import type { JSONContent } from '@tiptap/react';

/**
 * Convert a .docx file (ArrayBuffer) to TipTap JSONContent
 * Uses mammoth to convert docx → HTML, then parses HTML into TipTap nodes
 */
export async function importDocx(arrayBuffer: ArrayBuffer): Promise<{ title: string; content: JSONContent }> {
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // Parse HTML to extract a title (first h1) and build TipTap content
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  let title = 'Imported Document';
  const nodes: JSONContent[] = [];

  for (const el of Array.from(body.children)) {
    const tag = el.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = parseInt(tag[1]);
      if (tag === 'h1' && title === 'Imported Document') {
        title = el.textContent?.trim() || title;
      }
      nodes.push({
        type: 'heading',
        attrs: { level },
        content: inlineContent(el),
      });
    } else if (tag === 'blockquote') {
      nodes.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: inlineContent(el) }],
      });
    } else if (tag === 'ul') {
      nodes.push({
        type: 'bulletList',
        content: listItems(el),
      });
    } else if (tag === 'ol') {
      nodes.push({
        type: 'orderedList',
        content: listItems(el),
      });
    } else if (tag === 'hr') {
      nodes.push({ type: 'horizontalRule' });
    } else {
      // Default: paragraph
      const inline = inlineContent(el);
      if (inline.length > 0) {
        nodes.push({ type: 'paragraph', content: inline });
      } else {
        nodes.push({ type: 'paragraph', content: [] });
      }
    }
  }

  if (nodes.length === 0) {
    nodes.push({ type: 'paragraph', content: [] });
  }

  return {
    title,
    content: { type: 'doc', content: nodes },
  };
}

function listItems(el: Element): JSONContent[] {
  return Array.from(el.querySelectorAll(':scope > li')).map((li) => ({
    type: 'listItem',
    content: [{ type: 'paragraph', content: inlineContent(li) }],
  }));
}

function inlineContent(el: Element): JSONContent[] {
  const result: JSONContent[] = [];

  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) {
        result.push({ type: 'text', text });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elem = node as Element;
      const tag = elem.tagName.toLowerCase();
      const text = elem.textContent || '';
      if (!text) continue;

      const marks: { type: string; attrs?: Record<string, unknown> }[] = [];

      if (tag === 'strong' || tag === 'b') marks.push({ type: 'bold' });
      if (tag === 'em' || tag === 'i') marks.push({ type: 'italic' });
      if (tag === 's' || tag === 'del') marks.push({ type: 'strike' });
      if (tag === 'a') {
        marks.push({ type: 'link', attrs: { href: elem.getAttribute('href') || '' } });
      }

      // Handle nested inline: <strong><em>text</em></strong>
      if (elem.children.length > 0 && tag !== 'a') {
        const inner = inlineContent(elem);
        for (const child of inner) {
          if (child.type === 'text' && child.marks) {
            child.marks = [...marks, ...child.marks];
          } else if (child.type === 'text') {
            child.marks = marks.length > 0 ? marks : undefined;
          }
          result.push(child);
        }
      } else {
        result.push({
          type: 'text',
          text,
          marks: marks.length > 0 ? marks : undefined,
        });
      }
    }
  }

  return result;
}

/**
 * Import a markdown string as TipTap content
 */
export function importMarkdown(text: string): { title: string; content: JSONContent } {
  const lines = text.split('\n');
  let title = 'Imported Document';
  const nodes: JSONContent[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.startsWith('# ')) {
      if (title === 'Imported Document') title = line.slice(2).trim();
      nodes.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: line.slice(2).trim() }] });
    } else if (line.startsWith('## ')) {
      nodes.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: line.slice(3).trim() }] });
    } else if (line.startsWith('### ')) {
      nodes.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: line.slice(4).trim() }] });
    } else if (line.startsWith('> ')) {
      nodes.push({ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: line.slice(2).trim() }] }] });
    } else if (line.startsWith('---') || line.startsWith('***')) {
      nodes.push({ type: 'horizontalRule' });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Collect consecutive list items
      const items: JSONContent[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: lines[i].slice(2).trim() }] }] });
        i++;
      }
      nodes.push({ type: 'bulletList', content: items });
      continue; // skip i++ at end
    } else if (/^\d+\.\s/.test(line)) {
      const items: JSONContent[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: lines[i].replace(/^\d+\.\s/, '').trim() }] }] });
        i++;
      }
      nodes.push({ type: 'orderedList', content: items });
      continue;
    } else if (line.trim()) {
      nodes.push({ type: 'paragraph', content: [{ type: 'text', text: line.trim() }] });
    }
    i++;
  }

  if (nodes.length === 0) nodes.push({ type: 'paragraph', content: [] });
  return { title, content: { type: 'doc', content: nodes } };
}
