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
  onNewDocument?: () => void;
  onOpenSwitcher?: () => void;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  onImportFile?: () => void;
  theme?: string;
  onCycleTheme?: () => void;
}

const btnStyle = {
  fontFamily: 'var(--font-family)',
  fontSize: 11,
  color: 'var(--text-tertiary)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 8px',
};

export function TitleBar({
  title,
  onTitleChange,
  onToggleSidebar,
  sidebarOpen,
  onOpenFileLibrary,
  diskEnabled,
  flowIntensity = 0,
  sidebarSide = 'left',
  onToggleSidebarSide,
  onNewDocument,
  onOpenSwitcher,
  onOpenSettings,
  onOpenExport,
  onImportFile,
  theme = 'dark',
  onCycleTheme,
}: TitleBarProps) {
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

  // Detect Electron to add left padding for traffic lights
  const isElectronApp = typeof window !== 'undefined' && (window as { electronAPI?: { isElectron?: boolean } }).electronAPI?.isElectron === true;

  return (
    <div
      data-flow-target="title"
      className="flex items-center pr-4 flow-dimmed"
      style={{
        height: 40,
        paddingLeft: isElectronApp ? 88 : 16, // Leave room for macOS traffic lights
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
        title="Toggle sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="2" width="14" height="12" rx="1" />
          <line x1="5.5" y1="2" x2="5.5" y2="14" />
        </svg>
      </button>

      {/* Document switcher button */}
      {onOpenSwitcher && (
        <button
          onClick={onOpenSwitcher}
          style={{ ...btnStyle, marginRight: 4 }}
          title="Switch document"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M4 8L1 6l3-2" />
            <path d="M8 8l3-2-3-2" />
          </svg>
        </button>
      )}

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

      {/* Visible action buttons */}
      {onNewDocument && (
        <button onClick={onNewDocument} style={btnStyle} title="New document">
          + New
        </button>
      )}
      {onImportFile && (
        <button onClick={onImportFile} style={btnStyle} title="Import .docx or .md file">
          Import
        </button>
      )}
      {onOpenExport && (
        <button onClick={onOpenExport} style={btnStyle} title="Export document">
          Export
        </button>
      )}
      {onCycleTheme && (
        <button
          onClick={onCycleTheme}
          style={btnStyle}
          title={`Theme: ${theme} (click to switch)`}
        >
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="7" cy="7" r="4" />
              <line x1="7" y1="0.5" x2="7" y2="2" /><line x1="7" y1="12" x2="7" y2="13.5" />
              <line x1="0.5" y1="7" x2="2" y2="7" /><line x1="12" y1="7" x2="13.5" y2="7" />
            </svg>
          ) : theme === 'sepia' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M10 3a5 5 0 1 0 0 8" />
              <path d="M7 1a6 6 0 0 1 0 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M11.5 7.5a5.5 5.5 0 1 1-5-5 4 4 0 0 0 5 5z" />
            </svg>
          )}
        </button>
      )}
      {onOpenSettings && (
        <button
          onClick={onOpenSettings}
          style={btnStyle}
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="7" cy="7" r="2.5" />
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.1 1.1M10.1 10.1l1.1 1.1M2.8 11.2l1.1-1.1M10.1 3.9l1.1-1.1" />
          </svg>
        </button>
      )}
      {onToggleSidebarSide && (
        <button
          onClick={onToggleSidebarSide}
          style={btnStyle}
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
          style={{ ...btnStyle, color: diskEnabled ? 'var(--accent)' : 'var(--text-tertiary)' }}
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
