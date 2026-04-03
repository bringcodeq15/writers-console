import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

interface NotesTabProps {
  content: string;
  loaded: boolean;
  onUpdate: (content: string) => void;
  onRemoveLine: (index: number) => void;
  documentTitles: string[];
  onTransferNote: (docTitle: string, noteText: string) => void;
}

export function NotesTab({
  content,
  loaded,
  onUpdate,
  onRemoveLine,
  documentTitles,
  onTransferNote,
}: NotesTabProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);

  const filteredDocs = useMemo(() => {
    if (!autocompleteQuery) return documentTitles.slice(0, 8);
    const q = autocompleteQuery.toLowerCase();
    return documentTitles.filter((t) => t.toLowerCase().includes(q)).slice(0, 8);
  }, [autocompleteQuery, documentTitles]);

  // Parse lines that are ready to transfer (start with /DocTitle)
  const transferableLines = useMemo(() => {
    const lines = content.split('\n');
    const results: { lineIndex: number; docTitle: string; noteText: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('/') || line.length < 2) continue;

      const afterSlash = line.slice(1);
      // Find matching document title at start of line
      const matchedDoc = documentTitles.find((t) =>
        afterSlash.toLowerCase().startsWith(t.toLowerCase())
      );
      if (matchedDoc) {
        const noteText = afterSlash.slice(matchedDoc.length).trim();
        if (noteText.length > 0) {
          results.push({ lineIndex: i, docTitle: matchedDoc, noteText });
        }
      }
    }
    return results;
  }, [content, documentTitles]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      onUpdate(newContent);
    },
    [onUpdate]
  );

  const checkAutocomplete = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const cursorPos = ta.selectionStart;
    const textBefore = ta.value.slice(0, cursorPos);
    const lastNewline = textBefore.lastIndexOf('\n');
    const currentLine = textBefore.slice(lastNewline + 1);

    if (currentLine.startsWith('/') && currentLine.length >= 1) {
      const query = currentLine.slice(1);
      setAutocompleteQuery(query);
      setShowAutocomplete(true);
      setAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  const insertDocTitle = useCallback(
    (title: string) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const cursorPos = ta.selectionStart;
      const textBefore = ta.value.slice(0, cursorPos);
      const textAfter = ta.value.slice(cursorPos);
      const lastNewline = textBefore.lastIndexOf('\n');
      const lineStart = lastNewline + 1;

      const newContent =
        ta.value.slice(0, lineStart) + '/' + title + ' ' + textAfter;
      onUpdate(newContent);
      setShowAutocomplete(false);

      // Set cursor after the inserted title
      setTimeout(() => {
        const newPos = lineStart + 1 + title.length + 1;
        ta.selectionStart = newPos;
        ta.selectionEnd = newPos;
        ta.focus();
      }, 10);
    },
    [onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showAutocomplete) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex((i) => Math.min(i + 1, filteredDocs.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filteredDocs.length > 0) {
        e.preventDefault();
        insertDocTitle(filteredDocs[autocompleteIndex]);
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    },
    [showAutocomplete, filteredDocs, autocompleteIndex, insertDocTitle]
  );

  const handleTransfer = useCallback(
    (lineIndex: number, docTitle: string, noteText: string) => {
      onTransferNote(docTitle, noteText);
      onRemoveLine(lineIndex);
    },
    [onTransferNote, onRemoveLine]
  );

  // Update autocomplete on cursor movement
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const handleSelect = () => checkAutocomplete();
    ta.addEventListener('click', handleSelect);
    return () => ta.removeEventListener('click', handleSelect);
  }, [checkAutocomplete]);

  if (!loaded) {
    return (
      <div className="p-3" style={{ fontFamily: 'var(--font-family)', fontSize: 13, color: 'var(--text-tertiary)' }}>
        Loading notes...
      </div>
    );
  }

  return (
    <div className="p-3 flex flex-col h-full">
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
        Notes
      </div>

      <div className="relative flex-1 min-h-0" style={{ maxHeight: '60%' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextareaChange}
          onKeyUp={checkAutocomplete}
          onKeyDown={handleKeyDown}
          placeholder="Type notes here... Use /DocumentName to tag a note for transfer."
          style={{
            width: '100%',
            height: '100%',
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 2,
            padding: '8px 10px',
            outline: 'none',
            resize: 'none',
          }}
        />

        {/* Autocomplete dropdown */}
        {showAutocomplete && filteredDocs.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -4,
              transform: 'translateY(100%)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-emphasis)',
              borderRadius: 2,
              zIndex: 20,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {filteredDocs.map((title, i) => (
              <div
                key={title}
                onClick={() => insertDocTitle(title)}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 13,
                  padding: '6px 10px',
                  color: i === autocompleteIndex ? 'var(--accent)' : 'var(--text-primary)',
                  background: i === autocompleteIndex ? 'var(--bg-hover)' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setAutocompleteIndex(i)}
              >
                {title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer queue */}
      {transferableLines.length > 0 && (
        <div className="mt-3">
          <div
            className="mb-2"
            style={{
              fontFamily: 'var(--font-family)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Ready to transfer
          </div>
          {transferableLines.map((item) => (
            <div
              key={item.lineIndex}
              className="flex items-center gap-2 p-2 mb-1"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--accent)',
                  background: 'var(--accent-faint)',
                  padding: '1px 6px',
                  borderRadius: 2,
                  flexShrink: 0,
                }}
              >
                {item.docTitle}
              </span>
              <span
                className="flex-1 truncate"
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                {item.noteText}
              </span>
              <button
                onClick={() => handleTransfer(item.lineIndex, item.docTitle, item.noteText)}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 14,
                  color: 'var(--accent)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 4px',
                  flexShrink: 0,
                }}
                title="Transfer to document"
              >
                &#x2192;
              </button>
            </div>
          ))}
        </div>
      )}

      {content.length === 0 && (
        <div
          className="mt-4 text-center"
          style={{
            fontFamily: 'var(--font-family)',
            fontSize: 13,
            color: 'var(--text-tertiary)',
            lineHeight: 1.6,
          }}
        >
          A scratchpad for quick thoughts across all documents.
          <br /><br />
          Type <span style={{ color: 'var(--accent)' }}>/DocumentName</span> at the start of a line to tag a note for transfer to that document's research.
        </div>
      )}
    </div>
  );
}
