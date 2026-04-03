import { useState, useRef, useEffect } from 'react';
import type { OutlineItem } from '../../db';

interface OutlineItemRowProps {
  item: OutlineItem;
  onUpdate: (id: string, changes: Partial<OutlineItem>) => void;
  onDelete: (id: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function OutlineItemRow({
  item,
  onUpdate,
  onDelete,
  onIndent,
  onOutdent,
  dragHandleProps,
}: OutlineItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSubmit = () => {
    setEditing(false);
    if (value.trim()) {
      onUpdate(item.id, { text: value.trim() });
    } else {
      onDelete(item.id);
    }
  };

  const indentPx = (item.level - 1) * 20;

  return (
    <div
      className="flex items-center py-1 group"
      style={{
        paddingLeft: indentPx + 4,
      }}
    >
      <span
        {...dragHandleProps}
        style={{
          cursor: 'grab',
          color: 'var(--text-tertiary)',
          fontSize: 10,
          userSelect: 'none',
          marginRight: 6,
          opacity: 0.5,
        }}
      >
        &#9776;
      </span>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') {
              setValue(item.text);
              setEditing(false);
            }
            if (e.key === 'Tab') {
              e.preventDefault();
              if (e.shiftKey) {
                onOutdent(item.id);
              } else {
                onIndent(item.id);
              }
            }
          }}
          style={{
            flex: 1,
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-emphasis)',
            borderRadius: 2,
            padding: '2px 6px',
            outline: 'none',
          }}
        />
      ) : (
        <span
          className="flex-1"
          onClick={() => setEditing(true)}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: item.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: item.level === 1 ? 700 : 400,
            cursor: 'text',
            lineHeight: 1.5,
          }}
        >
          {item.text}
        </span>
      )}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 ml-1"
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'opacity 150ms',
        }}
      >
        &times;
      </button>
    </div>
  );
}
