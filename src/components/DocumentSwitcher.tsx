import type { Document } from '../db';

interface DocumentSwitcherProps {
  documents: Document[];
  currentDocId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function DocumentSwitcher({
  documents,
  currentDocId,
  onSwitch,
  onCreate,
  onDelete,
  onClose,
}: DocumentSwitcherProps) {
  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-20"
      style={{ zIndex: 100 }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--border-default)' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            Documents
          </span>
          <button
            onClick={onCreate}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 12,
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + New
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between px-4 py-2 cursor-pointer"
              style={{
                background: doc.id === currentDocId ? 'var(--bg-hover)' : 'transparent',
                borderLeft: doc.id === currentDocId ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onClick={() => {
                onSwitch(doc.id);
                onClose();
              }}
              onMouseEnter={(e) => {
                if (doc.id !== currentDocId) e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (doc.id !== currentDocId) e.currentTarget.style.background = 'transparent';
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {doc.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {doc.updatedAt.toLocaleDateString()} {doc.updatedAt.toLocaleTimeString()}
                </div>
              </div>
              {documents.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this document?')) {
                      onDelete(doc.id);
                    }
                  }}
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-error)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
