import type { JSONContent } from '@tiptap/react';
import {
  exportToMarkdown,
  exportToPlainText,
  exportToHtml,
  exportToDocx,
  downloadFile,
} from '../editor/utils/exportDocument';

interface ExportModalProps {
  content: JSONContent | undefined;
  title: string;
  onClose: () => void;
}

export function ExportModal({ content, title, onClose }: ExportModalProps) {
  if (!content) return null;

  const handleExport = async (format: 'markdown' | 'plaintext' | 'html' | 'docx') => {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    switch (format) {
      case 'markdown':
        downloadFile(`${slug}.md`, exportToMarkdown(content), 'text/markdown');
        break;
      case 'plaintext':
        downloadFile(`${slug}.txt`, exportToPlainText(content), 'text/plain');
        break;
      case 'html':
        downloadFile(`${slug}.html`, exportToHtml(content), 'text/html');
        break;
      case 'docx':
        await exportToDocx(content, title);
        break;
    }
    onClose();
  };

  const formats = [
    { key: 'docx' as const, label: 'Word Document', desc: '.docx file with styles and formatting' },
    { key: 'markdown' as const, label: 'Markdown', desc: '.md file with formatting' },
    { key: 'plaintext' as const, label: 'Plain Text', desc: '.txt file, no formatting' },
    { key: 'html' as const, label: 'HTML', desc: '.html file with semantic markup' },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 21,
            fontWeight: 700,
            color: 'var(--text-heading)',
            marginBottom: 16,
          }}
        >
          Export
        </h2>
        <div className="flex flex-col gap-2">
          {formats.map((fmt) => (
            <button
              key={fmt.key}
              onClick={() => handleExport(fmt.key)}
              className="text-left p-3"
              style={{
                fontFamily: 'var(--font-family)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--accent)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--border-default)')
              }
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {fmt.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{fmt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
