import type { CompletenessBreakdown } from '../hooks/useCompleteness';

interface CompletenessDetailProps {
  breakdown: CompletenessBreakdown;
  onClose: () => void;
}

const dimensions = [
  { key: 'structure' as const, label: 'Structure', desc: 'Headings, intro, conclusion' },
  { key: 'paragraphDepth' as const, label: 'Depth', desc: 'Avg words per paragraph' },
  { key: 'researchUtilization' as const, label: 'Research', desc: 'Items connected to text' },
  { key: 'outlineCoverage' as const, label: 'Outline', desc: 'Plan reflected in content' },
  { key: 'wordCountProgress' as const, label: 'Length', desc: 'Word count vs target' },
];

export function CompletenessDetail({ breakdown, onClose }: CompletenessDetailProps) {
  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 90 }}
      onClick={onClose}
    >
      <div
        className="absolute p-4"
        style={{
          bottom: 28,
          left: 16,
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
          width: 280,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
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
            Completeness
          </span>
          <span
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 18,
              fontWeight: 700,
              color: breakdown.overall >= 80 ? 'var(--color-success)' : 'var(--accent)',
            }}
          >
            {breakdown.overall}%
          </span>
        </div>

        {dimensions.map((dim) => {
          const value = breakdown[dim.key];
          return (
            <div key={dim.key} className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                  }}
                >
                  {dim.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 11,
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {value}%
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 3,
                  background: 'var(--bg-active)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${value}%`,
                    height: '100%',
                    background: value >= 80 ? 'var(--color-success)' : value >= 40 ? 'var(--accent)' : 'var(--accent-dim)',
                    borderRadius: 2,
                    transition: 'width 500ms ease',
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 10,
                  color: 'var(--text-tertiary)',
                  marginTop: 1,
                }}
              >
                {dim.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
