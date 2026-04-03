import { useState, useRef, useEffect } from 'react';

interface TitleBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenFileLibrary?: () => void;
  diskEnabled?: boolean;
  flowIntensity?: number;
  sidebarSide?: 'left' | 'right';
  onToggleSidebarSide?: () => void;
}

export function TitleBar({ title, onTitleChange, onToggleSidebar, sidebarOpen, onOpenFileLibrary, diskEnabled, flowIntensity = 0, sidebarSide = 'left', onToggleSidebarSide }: TitleBarProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    setEditing(false);
    if (value.trim()) {
      onTitleChange(value.trim());
    } else {
      setValue(title);
    }
  };

  return (
    <div
      data-flow-target="title"
      className="flex items-center px-4 flow-dimmed"
      style={{
        height: 40,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-default)',
        opacity: 1 - flowIntensity * 0.7,
        filter: `blur(${flowIntensity * 1.5}px)`,
      }}
    >
      <button
        onClick={onToggleSidebar}
        className="mr-3 flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: sidebarOpen ? 'var(--accent)' : 'var(--text-tertiary)',
          fontSize: 16,
        }}
        title="Toggle sidebar (Cmd+\\)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="2" width="14" height="12" rx="1" />
          <line x1="5.5" y1="2" x2="5.5" y2="14" />
        </svg>
      </button>
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') {
              setValue(title);
              setEditing(false);
            }
          }}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-heading)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-emphasis)',
            borderRadius: 2,
            padding: '2px 8px',
            outline: 'none',
            width: '100%',
            maxWidth: 400,
          }}
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-heading)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            textAlign: 'left',
          }}
        >
          {title}
        </button>
      )}
      <div className="flex-1" />
      {onToggleSidebarSide && (
        <button
          onClick={onToggleSidebarSide}
          className="flex items-center gap-1"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            color: 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 8px',
          }}
          title={`Move sidebar to ${sidebarSide === 'left' ? 'right' : 'left'}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
            {sidebarSide === 'left' ? (
              <>
                <rect x="1" y="2" width="12" height="10" rx="1" />
                <line x1="9" y1="2" x2="9" y2="12" />
              </>
            ) : (
              <>
                <rect x="1" y="2" width="12" height="10" rx="1" />
                <line x1="5" y1="2" x2="5" y2="12" />
              </>
            )}
          </svg>
        </button>
      )}
      {onOpenFileLibrary && (
        <button
          onClick={onOpenFileLibrary}
          className="flex items-center gap-1"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            color: diskEnabled ? 'var(--accent)' : 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 8px',
          }}
          title="File Library"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M2 3h4l1.5 1.5H12v7H2V3z" />
          </svg>
          Files
        </button>
      )}
    </div>
  );
}
