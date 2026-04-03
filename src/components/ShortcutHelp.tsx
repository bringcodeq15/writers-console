const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? 'Cmd' : 'Ctrl';

const categories = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: `${mod}+\\`, desc: 'Toggle sidebar' },
      { keys: `${mod}+P`, desc: 'Document switcher' },
      { keys: `${mod}+N`, desc: 'New document' },
      { keys: `${mod}+,`, desc: 'Settings' },
    ],
  },
  {
    name: 'Sidebar Tabs',
    shortcuts: [
      { keys: `${mod}+Shift+R`, desc: 'Research' },
      { keys: `${mod}+Shift+S`, desc: 'Scaffold' },
      { keys: `${mod}+Shift+O`, desc: 'Outline' },
      { keys: `${mod}+Shift+F`, desc: 'Search' },
      { keys: `${mod}+Shift+N`, desc: 'Notes' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: `${mod}+K`, desc: 'Insert link' },
      { keys: `${mod}+B`, desc: 'Bold' },
      { keys: `${mod}+I`, desc: 'Italic' },
      { keys: `${mod}+Shift+X`, desc: 'Strikethrough' },
      { keys: `${mod}+D`, desc: 'Duplicate paragraph' },
      { keys: `${mod}+Shift+\u2191`, desc: 'Move paragraph up' },
      { keys: `${mod}+Shift+\u2193`, desc: 'Move paragraph down' },
    ],
  },
  {
    name: 'File',
    shortcuts: [
      { keys: `${mod}+S`, desc: 'Save' },
      { keys: `${mod}+Shift+E`, desc: 'Export' },
      { keys: `${mod}+F`, desc: 'Find & Replace' },
      { keys: `${mod}+Shift+Enter`, desc: 'Fullscreen mode' },
      { keys: `${mod}+/`, desc: 'This help' },
    ],
  },
];

interface ShortcutHelpProps {
  onClose: () => void;
}

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      data-testid="shortcut-help"
    >
      <div
        className="w-full max-w-lg p-6"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 21,
            fontWeight: 700,
            color: 'var(--text-heading)',
            marginBottom: 20,
          }}
        >
          Keyboard Shortcuts
        </h2>

        {categories.map((cat) => (
          <div key={cat.name} className="mb-5">
            <div
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}
            >
              {cat.name}
            </div>
            {cat.shortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between py-1"
              >
                <span
                  style={{
                    fontFamily: "'CommitMonoWConsole', 'SF Mono', monospace",
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-active)',
                    padding: '2px 8px',
                    borderRadius: 2,
                  }}
                >
                  {s.keys}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                  }}
                >
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        ))}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 14,
              color: 'var(--text-primary)',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
              padding: '6px 16px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
