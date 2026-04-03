import { useState, useRef, useEffect } from 'react';
import type { SaveState } from '../hooks/useAutoSave';

interface StatusBarProps {
  wordCount: number;
  charCount: number;
  paragraphCount: number;
  saveState: SaveState;
  apiCallCount: number;
  diskEnabled?: boolean;
  completenessScore?: number;
  onCompletenessClick?: () => void;
  milestoneFlash?: boolean;
  flowIntensity?: number;
  wordCountTarget?: number;
  onWordCountTargetChange?: (target: number) => void;
}

export function StatusBar({
  wordCount,
  charCount,
  paragraphCount,
  saveState,
  apiCallCount,
  diskEnabled,
  completenessScore,
  onCompletenessClick,
  milestoneFlash,
  flowIntensity = 0,
  wordCountTarget = 3000,
  onWordCountTargetChange,
}: StatusBarProps) {
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState(String(wordCountTarget));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTargetValue(String(wordCountTarget));
  }, [wordCountTarget]);

  useEffect(() => {
    if (editingTarget && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTarget]);

  const handleTargetSubmit = () => {
    setEditingTarget(false);
    const num = parseInt(targetValue);
    if (num && num > 0 && num !== wordCountTarget) {
      onWordCountTargetChange?.(num);
    } else {
      setTargetValue(String(wordCountTarget));
    }
  };

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
        {/* Word count / target */}
        <span>
          {wordCount.toLocaleString()}
          <span style={{ color: 'var(--text-tertiary)' }}> / </span>
          {editingTarget ? (
            <input
              ref={inputRef}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value.replace(/\D/g, ''))}
              onBlur={handleTargetSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTargetSubmit();
                if (e.key === 'Escape') {
                  setTargetValue(String(wordCountTarget));
                  setEditingTarget(false);
                }
              }}
              style={{
                width: 45,
                fontFamily: 'var(--font-family)',
                fontSize: 12,
                color: 'var(--text-primary)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-emphasis)',
                borderRadius: 2,
                padding: '0 3px',
                outline: 'none',
                textAlign: 'center',
              }}
            />
          ) : (
            <button
              onClick={() => setEditingTarget(true)}
              style={{
                fontFamily: 'var(--font-family)',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              title="Click to set word count target"
            >
              {wordCountTarget.toLocaleString()}
            </button>
          )}
          <span style={{ color: 'var(--text-tertiary)' }}> words</span>
        </span>
        <span>{paragraphCount} para</span>
        <span>{charCount.toLocaleString()} chars</span>
        <span>{Math.max(1, Math.ceil(wordCount / 250))} min read</span>
        <span
          title={`~${Math.max(1, Math.ceil(wordCount / 250))} pg single-spaced, ~${Math.max(1, Math.ceil(wordCount / 125))} pg double-spaced`}
          style={{ cursor: 'help' }}
        >
          ~{Math.max(1, Math.ceil(wordCount / 250))}/{Math.max(1, Math.ceil(wordCount / 125))} pg
        </span>
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
        {diskEnabled && (
          <span style={{ color: 'var(--text-tertiary)' }}>
            Disk: ~/Documents
          </span>
        )}
        <span style={{ color: saveColor }}>{saveText}</span>
      </div>
    </div>
  );
}
