interface SettingsModalProps {
  claudeApiKey: string;
  searchApiKey: string;
  searchProvider: string;
  fontFamily: string;
  diskEnabled: boolean;
  onSave: (key: string, value: string) => void;
  onPickDirectory: () => void;
  onDisconnectDisk: () => void;
  onClose: () => void;
}

const labelStyle = {
  fontFamily: 'var(--font-family)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-secondary)',
  display: 'block',
  marginBottom: 8,
};

const inputStyle = {
  width: '100%',
  fontFamily: 'var(--font-family)',
  fontSize: 14,
  color: 'var(--text-primary)',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-emphasis)',
  borderRadius: 2,
  padding: '8px 12px',
  outline: 'none',
};

export function SettingsModal({
  claudeApiKey,
  searchApiKey,
  searchProvider,
  fontFamily,
  diskEnabled,
  onSave,
  onPickDirectory,
  onDisconnectDisk,
  onClose,
}: SettingsModalProps) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg p-6"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
          maxHeight: '85vh',
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
            marginBottom: 24,
          }}
        >
          Settings
        </h2>

        {/* Font Selection */}
        <div className="mb-6">
          <label style={labelStyle}>Font</label>
          <div className="flex gap-2">
            {[
              { value: 'charter', label: 'Charter', desc: 'Serif' },
              { value: 'commitmono', label: 'CommitMono', desc: 'Monospace' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => onSave('fontFamily', f.value)}
                style={{
                  flex: 1,
                  fontFamily:
                    f.value === 'charter'
                      ? "'Charter', Georgia, serif"
                      : "'CommitMonoWConsole', monospace",
                  fontSize: 14,
                  color: fontFamily === f.value ? 'var(--accent)' : 'var(--text-primary)',
                  background: fontFamily === f.value ? 'var(--accent-faint)' : 'var(--bg-primary)',
                  border:
                    fontFamily === f.value
                      ? '1px solid var(--accent-dim)'
                      : '1px solid var(--border-emphasis)',
                  borderRadius: 2,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{f.label}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Disk Storage */}
        <div className="mb-6">
          <label style={labelStyle}>File Storage</label>
          <div
            className="flex items-center justify-between p-3"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                }}
              >
                {diskEnabled ? 'Folder connected' : 'No folder connected'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 11,
                  color: 'var(--text-tertiary)',
                  marginTop: 2,
                }}
              >
                {diskEnabled
                  ? 'Documents save as .md + .wc.json to your chosen folder'
                  : 'Connect a folder to enable write-to-disk autosave'}
              </div>
            </div>
            <button
              onClick={diskEnabled ? onDisconnectDisk : onPickDirectory}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 12,
                color: diskEnabled ? 'var(--color-error)' : 'var(--accent)',
                background: diskEnabled ? 'transparent' : 'var(--accent-faint)',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: 2,
              }}
            >
              {diskEnabled ? 'Disconnect' : 'Choose Folder'}
            </button>
          </div>
        </div>

        {/* Claude API Key */}
        <div className="mb-6">
          <label style={labelStyle}>Claude API Key</label>
          <input
            type="password"
            defaultValue={claudeApiKey}
            onBlur={(e) => onSave('claudeApiKey', e.target.value)}
            placeholder="sk-ant-..."
            style={inputStyle}
          />
          <p
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              marginTop: 4,
            }}
          >
            Required for AI Scaffold and Research Pairing features
          </p>
        </div>

        {/* Search API Key */}
        <div className="mb-6">
          <label style={labelStyle}>Search API Key (Brave Search)</label>
          <input
            type="password"
            defaultValue={searchApiKey}
            onBlur={(e) => onSave('searchApiKey', e.target.value)}
            placeholder="BSA..."
            style={inputStyle}
          />
        </div>

        {/* Search Provider */}
        <div className="mb-6">
          <label style={labelStyle}>Search Provider</label>
          <select
            defaultValue={searchProvider || 'brave'}
            onChange={(e) => onSave('searchProvider', e.target.value)}
            style={inputStyle}
          >
            <option value="brave">Brave Search</option>
          </select>
        </div>

        <div className="flex justify-end">
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
