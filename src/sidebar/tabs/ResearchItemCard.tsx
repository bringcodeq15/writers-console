import { useState } from 'react';
import type { ResearchItem } from '../../db';

interface ResearchItemCardProps {
  item: ResearchItem;
  onUpdate: (id: string, changes: Partial<ResearchItem>) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
  highlighted?: boolean;
  onOpenPdf?: (item: ResearchItem) => void;
}

const TYPE_LABELS: Record<string, string> = {
  text: 'NOTE',
  link: 'LINK',
  excerpt: 'EXCERPT',
  file: 'FILE',
  'search-result': 'SEARCH',
};

export function ResearchItemCard({
  item,
  onUpdate,
  onDelete,
  dragHandleProps,
  highlighted,
  onOpenPdf,
}: ResearchItemCardProps) {
  const isPdf = item.type === 'file' && (item.content.endsWith('.pdf') || item.title.endsWith('.pdf'));
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title);

  const preview = item.content.slice(0, 200);

  const handleDragStart = (e: React.DragEvent) => {
    // Native HTML5 drag for cross-panel drop onto editor
    e.dataTransfer.setData('text/plain', item.content);
    e.dataTransfer.setData(
      'application/wc-research',
      JSON.stringify({ id: item.id, title: item.title, content: item.content, type: item.type })
    );
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div
      className="p-3 mb-2 research-card-draggable"
      draggable
      onDragStart={handleDragStart}
      style={{
        background: highlighted ? 'var(--accent-faint)' : 'var(--bg-tertiary)',
        border: highlighted ? '1px solid var(--accent-dim)' : '1px solid var(--border-default)',
        borderRadius: 0,
        cursor: 'grab',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          {...dragHandleProps}
          style={{
            cursor: 'grab',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            userSelect: 'none',
          }}
        >
          &#9776;
        </span>
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-primary)',
            padding: '1px 6px',
            borderRadius: 2,
          }}
        >
          {TYPE_LABELS[item.type] || item.type}
        </span>
        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              setEditingTitle(false);
              if (titleValue.trim()) onUpdate(item.id, { title: titleValue.trim() });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingTitle(false);
                if (titleValue.trim()) onUpdate(item.id, { title: titleValue.trim() });
              }
            }}
            autoFocus
            style={{
              flex: 1,
              fontFamily: 'var(--font-family)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
              padding: '0 4px',
              outline: 'none',
            }}
          />
        ) : (
          <span
            className="flex-1 truncate"
            onDoubleClick={() => setEditingTitle(true)}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary)',
              cursor: 'default',
            }}
          >
            {item.title}
          </span>
        )}
      </div>

      {isPdf && onOpenPdf ? (
        <button
          onClick={() => onOpenPdf(item)}
          className="mb-2 w-full text-left p-2"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--accent)',
            background: 'var(--accent-faint)',
            border: '1px solid var(--accent-dim)',
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          Open PDF Reader
        </button>
      ) : preview ? (
        <div
          className="mb-2"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {preview}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {item.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 10,
                color: 'var(--accent)',
                background: 'var(--accent-faint)',
                padding: '1px 6px',
                borderRadius: 2,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 16,
              color: 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            &#8942;
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-6 py-1"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-emphasis)',
                borderRadius: 2,
                zIndex: 10,
                minWidth: 120,
              }}
            >
              {item.type === 'link' && item.sourceUrl && (
                <button
                  onClick={() => {
                    window.open(item.sourceUrl, '_blank');
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-1"
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Open URL
                </button>
              )}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(item.content);
                  setMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-1"
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Copy content
              </button>
              <button
                onClick={() => {
                  onDelete(item.id);
                  setMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-1"
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  color: 'var(--color-error)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
