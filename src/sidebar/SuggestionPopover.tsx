import type { ResearchSuggestion, ResearchItem } from '../db';

interface SuggestionPopoverProps {
  suggestions: ResearchSuggestion[];
  researchItems: ResearchItem[];
  onViewInResearch: (itemId: string) => void;
  onClose: () => void;
}

export function SuggestionPopover({
  suggestions,
  researchItems,
  onViewInResearch,
  onClose,
}: SuggestionPopoverProps) {
  const itemMap = new Map(researchItems.map((i) => [i.id, i]));

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 50 }}
      onClick={onClose}
    >
      <div
        className="absolute p-3"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-emphasis)',
          borderRadius: 2,
          maxWidth: 400,
          width: '90%',
          maxHeight: 400,
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mb-2"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Suggested Research
        </div>
        {suggestions.map((s) => {
          const item = itemMap.get(s.researchItemId);
          if (!item) return null;
          return (
            <div
              key={s.id}
              className="mb-2 p-2"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  marginBottom: 4,
                }}
              >
                {s.reasoning}
              </div>
              <button
                onClick={() => onViewInResearch(item.id)}
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
                View in Research
              </button>
            </div>
          );
        })}
        {suggestions.length === 0 && (
          <div
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 13,
              color: 'var(--text-tertiary)',
            }}
          >
            No suggestions for this paragraph.
          </div>
        )}
      </div>
    </div>
  );
}
