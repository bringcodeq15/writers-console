import { useState } from 'react';
import { searchWeb, type SearchResult } from '../../search/searchClient';
import { SearchResultCard } from './SearchResultCard';

interface SearchTabProps {
  searchApiKey: string;
  searchProvider: string;
  onAddToResearch: (result: SearchResult) => void;
}

export function SearchTab({ searchApiKey, searchProvider, onAddToResearch }: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim() || !searchApiKey) return;
    setLoading(true);
    setError('');
    try {
      const results = await searchWeb(searchApiKey, query.trim(), searchProvider || 'brave');
      setResults(results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    }
    setLoading(false);
  };

  if (!searchApiKey) {
    return (
      <div className="p-3">
        <div
          className="mb-3"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Web Search
        </div>
        <div
          className="py-8 text-center"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            lineHeight: 1.6,
          }}
        >
          Built-in web search lets you find and save research without leaving the app.
          <br />
          <br />
          To enable, add your Brave Search API key in Settings (Cmd+,).
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div
        className="mb-3"
        style={{
          fontFamily: 'var(--font-family)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
        }}
      >
        Web Search
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web..."
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          style={{
            flex: 1,
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '6px 10px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--accent)',
            background: 'var(--accent-faint)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            padding: '6px 12px',
            borderRadius: 2,
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {error && (
        <div
          className="mb-3 p-2"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 12,
            color: 'var(--color-error)',
            background: 'rgba(212, 85, 90, 0.1)',
            border: '1px solid rgba(212, 85, 90, 0.2)',
            borderRadius: 2,
          }}
        >
          {error}
        </div>
      )}

      {results.map((result, i) => (
        <SearchResultCard key={i} result={result} onAddToResearch={onAddToResearch} />
      ))}
    </div>
  );
}
