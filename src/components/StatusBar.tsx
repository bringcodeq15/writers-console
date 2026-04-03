import type { SaveState } from '../hooks/useAutoSave';

interface StatusBarProps {
  wordCount: number;
  paragraphCount: number;
  saveState: SaveState;
  apiCallCount: number;
  diskEnabled?: boolean;
  diskLastSaved?: Date | null;
  completenessScore?: number;
  onCompletenessClick?: () => void;
  milestoneFlash?: boolean;
  flowIntensity?: number;
}

export function StatusBar({
  wordCount,
  paragraphCount,
  saveState,
  apiCallCount,
  diskEnabled,
  diskLastSaved,
  completenessScore,
  onCompletenessClick,
  milestoneFlash,
  flowIntensity = 0,
}: StatusBarProps) {
  const saveColor =
    saveState === 'saved'
      ? 'var(--color-success)'
      : saveState === 'saving'
        ? 'var(--color-loading)'
        : 'var(--text-tertiary)';

  const saveText =
    saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving...' : 'Unsaved changes';

  return (
    <div
      data-flow-target="status"
      data-testid="status-bar"
      className={`flex items-center px-4 justify-between flow-dimmed ${milestoneFlash ? 'milestone-shimmer' : ''}`}
      style={{
        height: 24,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-default)',
        fontFamily: 'var(--font-family)',
        fontSize: 12,
        letterSpacing: '0.02em',
        color: 'var(--text-secondary)',
        opacity: 1 - flowIntensity * 0.7,
        filter: `blur(${flowIntensity * 1.5}px)`,
      }}
    >
      <div className="flex items-center gap-4">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{paragraphCount} paragraphs</span>
        {completenessScore !== undefined && (
          <button
            onClick={onCompletenessClick}
            className="flex items-center gap-1"
            data-testid="completeness-score"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-family)',
              padding: 0,
            }}
            title="Document completeness"
          >
            <span
              style={{
                display: 'inline-block',
                width: 40,
                height: 3,
                background: 'var(--bg-active)',
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${completenessScore}%`,
                  background:
                    completenessScore >= 80 ? 'var(--color-success)' : 'var(--accent)',
                  borderRadius: 2,
                  transition: 'width 500ms ease',
                }}
              />
            </span>
            <span>{completenessScore}%</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {apiCallCount > 0 && (
          <span>
            AI: {apiCallCount} calls (~${(apiCallCount * 0.002).toFixed(3)})
          </span>
        )}
        {diskEnabled && diskLastSaved && (
          <span style={{ color: 'var(--accent-dim)' }}>
            Disk: {diskLastSaved.toLocaleTimeString()}
          </span>
        )}
        {diskEnabled && !diskLastSaved && (
          <span style={{ color: 'var(--text-tertiary)' }}>Disk: connected</span>
        )}
        <span style={{ color: saveColor }}>{saveText}</span>
      </div>
    </div>
  );
}
