import { useState } from 'react';
import type { ResearchItem } from '../../db';

interface ResearchAddFormProps {
  onAdd: (data: {
    type: ResearchItem['type'];
    title: string;
    content: string;
    sourceUrl?: string;
  }) => void;
}

type AddType = 'text' | 'link' | 'excerpt';

export function ResearchAddForm({ onAdd }: ResearchAddFormProps) {
  const [type, setType] = useState<AddType>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleAdd = () => {
    if (type === 'link') {
      if (!url.trim()) return;
      onAdd({
        type: 'link',
        title: title.trim() || url.trim(),
        content: url.trim(),
        sourceUrl: url.trim(),
      });
      setUrl('');
    } else {
      if (!content.trim()) return;
      onAdd({
        type: type === 'excerpt' ? 'excerpt' : 'text',
        title: title.trim() || content.trim().slice(0, 60) + (content.length > 60 ? '...' : ''),
        content: content.trim(),
      });
      setContent('');
    }
    setTitle('');
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full p-2 text-center mb-3"
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 13,
          color: 'var(--accent)',
          background: 'var(--accent-faint)',
          border: '1px solid transparent',
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >
        + Add Item
      </button>
    );
  }

  return (
    <div
      className="p-3 mb-3"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div className="flex gap-1 mb-2">
        {(['text', 'link', 'excerpt'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: type === t ? 'var(--accent)' : 'var(--text-tertiary)',
              background: type === t ? 'var(--accent-faint)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '3px 8px',
              borderRadius: 2,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        style={{
          width: '100%',
          fontFamily: 'var(--font-family)',
          fontSize: 13,
          color: 'var(--text-primary)',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 2,
          padding: '4px 8px',
          outline: 'none',
          marginBottom: 6,
        }}
      />

      {type === 'link' ? (
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          style={{
            width: '100%',
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '4px 8px',
            outline: 'none',
            marginBottom: 6,
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={type === 'excerpt' ? 'Paste excerpt...' : 'Type a note...'}
          rows={type === 'excerpt' ? 5 : 3}
          style={{
            width: '100%',
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '4px 8px',
            outline: 'none',
            resize: 'vertical',
            marginBottom: 6,
          }}
        />
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => {
            setExpanded(false);
            setContent('');
            setUrl('');
            setTitle('');
          }}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--accent)',
            background: 'var(--accent-faint)',
            border: 'none',
            cursor: 'pointer',
            padding: '3px 12px',
            borderRadius: 2,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
