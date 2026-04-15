import type { ScaffoldEntry } from '../../db';

interface ScaffoldLineProps {
  entry: ScaffoldEntry & { paragraphIndex: number };
  isHeading: boolean;
  suggestionCount: number;
  onClickLine: (paragraphId: string) => void;
  onClickBadge: (paragraphId: string) => void;
  onRetry: (paragraphId: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function ScaffoldLine({
  entry,
  isHeading,
  suggestionCount,
  onClickLine,
  onClickBadge,
  onRetry,
  dragHandleProps,
}: ScaffoldLineProps) {
  return (
    <div
      className="flex items-center py-1.5 px-2 gap-2"
      style={{
        borderBottom: '1px solid var(--border-default)',
        cursor: 'pointer',
      }}
      onClick={() => onClickLine(entry.paragraphId)}
    >
      <span
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
        style={{
          cursor: 'grab',
          color: 'var(--text-tertiary)',
          fontSize: 14,
          userSelect: 'none',
          padding: '6px 8px',
          marginLeft: -4,
          borderRadius: 2,
          display: 'inline-flex',
          alignItems: 'center',
          touchAction: 'none',
          flexShrink: 0,
        }}
        title="Drag to reorder paragraph"
      >
        &#9776;
      </span>
      <span
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 11,
          color: 'var(--text-tertiary)',
          minWidth: 20,
          textAlign: 'right',
        }}
      >
        {entry.paragraphIndex}
      </span>
      <span
        className="flex-1"
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 13,
          lineHeight: 1.5,
          color: isHeading ? 'var(--text-heading)' : 'var(--text-primary)',
          fontWeight: isHeading ? 700 : 400,
        }}
      >
        {entry.status === 'loading' ? (
          <span
            style={{
              display: 'inline-block',
              width: '80%',
              height: 12,
              background: 'var(--bg-hover)',
              borderRadius: 2,
              animation: 'scaffold-pulse 1.5s ease-in-out infinite',
            }}
          />
        ) : entry.status === 'error' ? (
          <span style={{ color: 'var(--color-error)' }}>
            Failed to summarize{' '}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry(entry.paragraphId);
              }}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 11,
                color: 'var(--accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              retry
            </button>
          </span>
        ) : (
          entry.summary
        )}
      </span>
      {suggestionCount > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClickBadge(entry.paragraphId);
          }}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            background: 'var(--accent-faint)',
            border: 'none',
            cursor: 'pointer',
            padding: '1px 6px',
            borderRadius: 2,
            minWidth: 20,
            textAlign: 'center',
          }}
        >
          {suggestionCount}
        </button>
      )}
    </div>
  );
}
