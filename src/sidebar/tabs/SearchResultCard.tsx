import type { SearchResult } from '../../search/searchClient';

interface SearchResultCardProps {
  result: SearchResult;
  onAddToResearch: (result: SearchResult) => void;
}

export function SearchResultCard({ result, onAddToResearch }: SearchResultCardProps) {
  const domain = (() => {
    try {
      return new URL(result.url).hostname;
    } catch {
      return result.url;
    }
  })();

  return (
    <div
      className="p-3 mb-2"
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-default)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 2,
        }}
      >
        {result.title}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 11,
          color: 'var(--accent-dim)',
          marginBottom: 4,
        }}
      >
        {domain}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginBottom: 6,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {result.snippet}
      </div>
      <button
        onClick={() => onAddToResearch(result)}
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 11,
          color: 'var(--accent)',
          background: 'var(--accent-faint)',
          border: 'none',
          cursor: 'pointer',
          padding: '3px 10px',
          borderRadius: 2,
        }}
      >
        + Add to Research
      </button>
    </div>
  );
}
