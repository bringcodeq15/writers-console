import { useState, useCallback } from 'react';
import { analyzeFlow, type FlowAnalysis, type FlowIssue } from '../../ai/flowAnalyzer';
import type { ScaffoldEntry } from '../../db';

interface FlowAnalysisPanelProps {
  apiKey: string;
  entries: (ScaffoldEntry & { paragraphIndex: number })[];
  onJumpToParagraph: (paragraphId: string) => void;
}

const typeColors: Record<FlowIssue['type'], string> = {
  flow: 'var(--accent)',
  missing: 'var(--color-error)',
  reorder: 'var(--color-loading)',
  redundancy: 'var(--text-secondary)',
};

const typeLabels: Record<FlowIssue['type'], string> = {
  flow: 'FLOW',
  missing: 'MISSING',
  reorder: 'REORDER',
  redundancy: 'REDUNDANT',
};

const severityOpacity: Record<FlowIssue['severity'], number> = {
  high: 1,
  medium: 0.85,
  low: 0.6,
};

export function FlowAnalysisPanel({ apiKey, entries, onJumpToParagraph }: FlowAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<FlowAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const runAnalysis = useCallback(async () => {
    if (entries.length < 3) {
      setError('Need at least 3 paragraphs to analyze.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const summaries = entries
        .filter((e) => e.status === 'current' && e.summary)
        .map((e) => ({
          index: e.paragraphIndex,
          summary: e.summary.replace(/^H[123]:\s*/, ''),
          isHeading: /^H[123]:/.test(e.summary),
        }));
      const result = await analyzeFlow(apiKey, summaries);
      setAnalysis(result);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    }
    setLoading(false);
  }, [apiKey, entries]);

  const handleJump = useCallback(
    (paragraphIndex: number) => {
      const entry = entries.find((e) => e.paragraphIndex === paragraphIndex);
      if (entry) onJumpToParagraph(entry.paragraphId);
    },
    [entries, onJumpToParagraph]
  );

  if (entries.length < 3) return null;

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border-default)',
        padding: '8px 12px',
        background: 'var(--bg-secondary)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: loading ? 'var(--text-tertiary)' : 'var(--accent)',
            background: loading ? 'transparent' : 'var(--accent-faint)',
            border: loading ? '1px solid var(--border-default)' : '1px solid var(--accent-dim)',
            borderRadius: 2,
            padding: '4px 10px',
            cursor: loading ? 'default' : 'pointer',
          }}
          title="Analyze the structural flow of your argument"
        >
          {loading ? 'Analyzing...' : analysis ? 'Re-analyze Flow' : 'Analyze Flow'}
        </button>

        {analysis && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            {expanded ? '\u25B2' : '\u25BC'}
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            color: 'var(--color-error)',
            marginTop: 6,
          }}
        >
          {error}
        </div>
      )}

      {analysis && expanded && (
        <div className="mt-2">
          <div
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 12,
              fontStyle: 'italic',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: 8,
              padding: '6px 8px',
              background: 'var(--bg-tertiary)',
              borderLeft: '2px solid var(--accent-dim)',
            }}
          >
            {analysis.overall}
          </div>

          {analysis.issues.length === 0 ? (
            <div
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 11,
                color: 'var(--color-success)',
                textAlign: 'center',
                padding: '4px',
              }}
            >
              ✓ No structural issues detected
            </div>
          ) : (
            analysis.issues.map((issue, i) => (
              <div
                key={i}
                className="mb-2 p-2"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-default)',
                  borderLeft: `2px solid ${typeColors[issue.type]}`,
                  borderRadius: 2,
                  opacity: severityOpacity[issue.severity],
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    style={{
                      fontFamily: 'var(--font-family)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: typeColors[issue.type],
                      background: 'var(--bg-primary)',
                      padding: '1px 5px',
                      borderRadius: 2,
                    }}
                  >
                    {typeLabels[issue.type]}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {issue.affectedParagraphs.map((pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleJump(pIdx)}
                        style={{
                          fontFamily: 'var(--font-family)',
                          fontSize: 10,
                          color: 'var(--accent)',
                          background: 'var(--accent-faint)',
                          border: 'none',
                          borderRadius: 2,
                          padding: '1px 5px',
                          cursor: 'pointer',
                        }}
                        title={`Jump to paragraph ${pIdx}`}
                      >
                        ¶{pIdx}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: 'var(--text-primary)',
                  }}
                >
                  {issue.message}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
