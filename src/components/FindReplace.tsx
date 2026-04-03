import { useState, useRef, useEffect, useCallback } from 'react';
import type { Editor } from '@tiptap/react';

interface FindReplaceProps {
  editor: Editor;
  onClose: () => void;
}

export function FindReplace({ editor, onClose }: FindReplaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Search logic using ProseMirror text search
  const findMatches = useCallback((): { from: number; to: number }[] => {
    if (!searchTerm) return [];
    const doc = editor.state.doc;
    const matches: { from: number; to: number }[] = [];
    const search = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let index = text.indexOf(search);
        while (index !== -1) {
          matches.push({ from: pos + index, to: pos + index + searchTerm.length });
          index = text.indexOf(search, index + 1);
        }
      }
    });
    return matches;
  }, [editor, searchTerm, caseSensitive]);

  // Update highlights when search changes
  useEffect(() => {
    const matches = findMatches();
    setMatchCount(matches.length);
    if (currentMatch >= matches.length) setCurrentMatch(Math.max(0, matches.length - 1));

    // Clear previous highlights
    document.querySelectorAll('.search-highlight').forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });

    if (matches.length === 0 || !searchTerm) return;

    // Apply highlights via DOM (non-destructive to ProseMirror state)
    const editorEl = document.querySelector('.tiptap');
    if (!editorEl) return;

    const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
    const textNodes: { node: Text; offset: number }[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      textNodes.push({ node, offset: 0 });
    }

    // Simple approach: use window.find for visual highlighting
    // ProseMirror decorations would be cleaner but require an extension
    // For now, scroll to current match
    if (matches[currentMatch]) {
      const { from } = matches[currentMatch];
      const resolvedPos = editor.state.doc.resolve(from);
      editor.chain().setTextSelection({ from: matches[currentMatch].from, to: matches[currentMatch].to }).run();
      // Scroll the selection into view
      const view = editor.view;
      const domPos = view.domAtPos(from);
      if (domPos.node instanceof HTMLElement) {
        domPos.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (domPos.node.parentElement) {
        domPos.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      void resolvedPos;
    }
  }, [searchTerm, caseSensitive, currentMatch, findMatches, editor]);

  const goToNext = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0) return;
    setCurrentMatch((c) => (c + 1) % matches.length);
  }, [findMatches]);

  const goToPrev = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0) return;
    setCurrentMatch((c) => (c - 1 + matches.length) % matches.length);
  }, [findMatches]);

  const replaceOne = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0 || !matches[currentMatch]) return;
    const { from, to } = matches[currentMatch];
    editor.chain().focus().setTextSelection({ from, to }).deleteSelection().insertContent(replaceTerm).run();
    // Re-search after replace
    setSearchTerm((s) => s); // trigger re-render
  }, [editor, findMatches, currentMatch, replaceTerm]);

  const replaceAll = useCallback(() => {
    const matches = findMatches();
    if (matches.length === 0) return;
    // Replace from end to start to preserve positions
    const sorted = [...matches].sort((a, b) => b.from - a.from);
    let chain = editor.chain().focus();
    for (const { from, to } of sorted) {
      chain = chain.setTextSelection({ from, to }).deleteSelection().insertContent(replaceTerm);
    }
    chain.run();
    setMatchCount(0);
    setCurrentMatch(0);
  }, [editor, findMatches, replaceTerm]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        goToPrev();
      }
    },
    [onClose, goToNext, goToPrev]
  );

  // Cleanup highlights on close
  useEffect(() => {
    return () => {
      document.querySelectorAll('.search-highlight').forEach((el) => {
        const parent = el.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(el.textContent || ''), el);
          parent.normalize();
        }
      });
    };
  }, []);

  return (
    <div
      className="flex flex-col gap-1 p-2"
      style={{
        position: 'absolute',
        top: 40,
        right: 16,
        zIndex: 50,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-emphasis)',
        borderRadius: 2,
        width: 340,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Search row */}
      <div className="flex items-center gap-1">
        <input
          ref={searchRef}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentMatch(0); }}
          placeholder="Find..."
          style={{
            flex: 1,
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '4px 8px',
            outline: 'none',
          }}
        />
        <button
          onClick={() => setCaseSensitive((c) => !c)}
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            fontWeight: 700,
            color: caseSensitive ? 'var(--accent)' : 'var(--text-tertiary)',
            background: caseSensitive ? 'var(--accent-faint)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 2,
          }}
          title="Case sensitive"
        >
          Aa
        </button>
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 11,
            color: matchCount > 0 ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            minWidth: 40,
            textAlign: 'center',
          }}
        >
          {searchTerm ? `${matchCount > 0 ? currentMatch + 1 : 0}/${matchCount}` : ''}
        </span>
        <button
          onClick={goToPrev}
          disabled={matchCount === 0}
          style={{ ...navBtnStyle, opacity: matchCount === 0 ? 0.3 : 1 }}
          title="Previous (Shift+Enter)"
        >
          &#x2191;
        </button>
        <button
          onClick={goToNext}
          disabled={matchCount === 0}
          style={{ ...navBtnStyle, opacity: matchCount === 0 ? 0.3 : 1 }}
          title="Next (Enter)"
        >
          &#x2193;
        </button>
        <button
          onClick={() => setShowReplace((r) => !r)}
          style={{ ...navBtnStyle, color: showReplace ? 'var(--accent)' : 'var(--text-tertiary)' }}
          title="Toggle replace"
        >
          &#x21C4;
        </button>
        <button
          onClick={onClose}
          style={{ ...navBtnStyle }}
          title="Close (Esc)"
        >
          &times;
        </button>
      </div>

      {/* Replace row */}
      {showReplace && (
        <div className="flex items-center gap-1">
          <input
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace..."
            style={{
              flex: 1,
              fontFamily: 'var(--font-family)',
              fontSize: 13,
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 2,
              padding: '4px 8px',
              outline: 'none',
            }}
          />
          <button
            onClick={replaceOne}
            disabled={matchCount === 0}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 11,
              color: matchCount > 0 ? 'var(--accent)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: matchCount > 0 ? 'pointer' : 'default',
              padding: '4px 8px',
            }}
          >
            Replace
          </button>
          <button
            onClick={replaceAll}
            disabled={matchCount === 0}
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 11,
              color: matchCount > 0 ? 'var(--accent)' : 'var(--text-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: matchCount > 0 ? 'pointer' : 'default',
              padding: '4px 8px',
            }}
          >
            All
          </button>
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--font-family)',
  fontSize: 14,
  color: 'var(--text-tertiary)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 4px',
};
